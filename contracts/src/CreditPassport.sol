// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {CreditLedger} from "./CreditLedger.sol";
import {CreditProfile} from "./interfaces/ICreditOracle.sol";

/// @notice ERC-5192 minimal soulbound interface.
interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);

    function locked(uint256 tokenId) external view returns (bool);
}

/// @title CreditPassport
/// @notice Soulbound (ERC-5192) ERC-721. One token per subject, `tokenId = uint160(subject)`. `tokenURI` is a fully
///         on-chain SVG rendered from the live CreditLedger — nothing is stored off-chain, nothing is cached.
contract CreditPassport is ERC721, IERC5192, IERC4906 {
    using Strings for uint256;
    using Strings for address;

    CreditLedger public immutable LEDGER;

    mapping(uint256 => uint64) public mintedAt;
    mapping(uint256 => uint64) public lastRefreshed;
    uint256 public totalMinted;

    event PassportMinted(address indexed subject, uint256 indexed tokenId, uint16 score, uint8 tier);
    event PassportRefreshed(address indexed subject, uint256 indexed tokenId, uint16 score, uint8 tier);

    error Soulbound();
    error NoCreditHistory(address subject);
    error NotMinted(address subject);

    constructor(CreditLedger ledger) ERC721("AttestCredit Passport", "ACPASS") {
        LEDGER = ledger;
    }

    // ───────────────────────────── identity ─────────────────────────────

    function tokenIdOf(address subject) public pure returns (uint256) {
        return uint256(uint160(subject));
    }

    function hasPassport(address subject) public view returns (bool) {
        return _ownerOf(tokenIdOf(subject)) != address(0);
    }

    /// @notice Only the subject can mint its own passport (same key on Sepolia and Creditcoin).
    function mint() external returns (uint256 tokenId) {
        if (LEDGER.factCount(msg.sender) == 0) revert NoCreditHistory(msg.sender);
        tokenId = tokenIdOf(msg.sender);
        _safeMint(msg.sender, tokenId);
        mintedAt[tokenId] = uint64(block.timestamp);
        lastRefreshed[tokenId] = uint64(block.timestamp);
        totalMinted += 1;
        emit Locked(tokenId);
        (uint16 s, uint8 t) = LEDGER.getScore(msg.sender);
        emit PassportMinted(msg.sender, tokenId, s, t);
    }

    /// @notice Anyone may refresh; the image always reads the live ledger, this just stamps the time and
    ///         emits ERC-4906 MetadataUpdate so indexers re-render.
    function refresh(address subject) external {
        uint256 tokenId = tokenIdOf(subject);
        if (_ownerOf(tokenId) == address(0)) revert NotMinted(subject);
        lastRefreshed[tokenId] = uint64(block.timestamp);
        (uint16 s, uint8 t) = LEDGER.getScore(subject);
        emit PassportRefreshed(subject, tokenId, s, t);
        emit MetadataUpdate(tokenId);
    }

    // ───────────────────────────── soulbound ─────────────────────────────

    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert Soulbound(); // only mint is allowed; no transfer, no burn
        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    function supportsInterface(bytes4 id) public view override(ERC721, IERC165) returns (bool) {
        return id == type(IERC5192).interfaceId || id == type(IERC4906).interfaceId || super.supportsInterface(id);
    }

    // ───────────────────────────── metadata ─────────────────────────────

    function tierName(uint8 tier) public pure returns (string memory) {
        if (tier == 3) return "Platinum";
        if (tier == 2) return "Gold";
        if (tier == 1) return "Silver";
        return "Bronze";
    }

    function tierColor(uint8 tier) public pure returns (string memory) {
        if (tier == 3) return "#7EE0D6";
        if (tier == 2) return "#F2B632";
        if (tier == 1) return "#A8B3C4";
        return "#B87333";
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        address subject = address(uint160(tokenId));
        (uint16 score, uint8 tier) = LEDGER.getScore(subject);
        CreditProfile memory p = LEDGER.getProfile(subject);
        string memory svg = _svg(subject, score, tier, p);

        bytes memory json = abi.encodePacked(
            '{"name":"AttestCredit Passport #',
            tokenId.toString(),
            '","description":"Soulbound credit passport. Every field is derived from Ethereum Sepolia Aave V3 transactions proven on Creditcoin through the Attestcoin Protocol, plus native Creditcoin repayments.",',
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[',
            _attr("Score", uint256(score)),
            ",",
            '{"trait_type":"Tier","value":"',
            tierName(tier),
            '"},',
            _attr("Borrows", p.borrowCount),
            ",",
            _attr("Repays", p.repayCount),
            ",",
            _attr("Liquidations", p.liquidationCount),
            ",",
            _attr("Native repays", p.nativeRepayCount),
            ",",
            _attr("Facts", LEDGER.factCount(subject)),
            "]}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function _attr(string memory k, uint256 v) private pure returns (bytes memory) {
        return abi.encodePacked('{"trait_type":"', k, '","value":', v.toString(), "}");
    }

    function _svg(address subject, uint16 score, uint8 tier, CreditProfile memory p)
        private
        view
        returns (string memory)
    {
        string memory c = tierColor(tier);
        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 260" font-family="ui-monospace,Menlo,monospace">',
                '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1020"/><stop offset="1" stop-color="#141B33"/></linearGradient></defs>',
                '<rect width="420" height="260" rx="20" fill="url(#g)"/><rect x="1" y="1" width="418" height="258" rx="19" fill="none" stroke="',
                c,
                '" stroke-opacity="0.6"/>',
                '<text x="24" y="38" fill="#8A93A8" font-size="11" letter-spacing="2">ATTESTCREDIT PASSPORT</text>',
                '<text x="24" y="112" fill="',
                c,
                '" font-size="64" font-weight="700">',
                uint256(score).toString(),
                '</text><text x="24" y="138" fill="#E6E9F2" font-size="16">',
                tierName(tier),
                "</text>",
                _stats(p),
                '<text x="24" y="222" fill="#8A93A8" font-size="9">',
                subject.toHexString(),
                '</text><text x="24" y="240" fill="#8A93A8" font-size="9">Verified by Attestcoin Protocol \xc2\xb7 Creditcoin \xc2\xb7 updated ',
                uint256(p.updatedAt).toString(),
                "</text></svg>"
            )
        );
    }

    function _stats(CreditProfile memory p) private pure returns (bytes memory) {
        return abi.encodePacked(
            '<text x="250" y="70" fill="#8A93A8" font-size="10">BORROWS</text><text x="250" y="88" fill="#E6E9F2" font-size="16">',
            uint256(p.borrowCount).toString(),
            '</text><text x="330" y="70" fill="#8A93A8" font-size="10">REPAYS</text><text x="330" y="88" fill="#E6E9F2" font-size="16">',
            uint256(p.repayCount).toString(),
            '</text><text x="250" y="118" fill="#8A93A8" font-size="10">LIQUIDATIONS</text><text x="250" y="136" fill="#E6E9F2" font-size="16">',
            uint256(p.liquidationCount).toString(),
            '</text><text x="330" y="118" fill="#8A93A8" font-size="10">NATIVE</text><text x="330" y="136" fill="#E6E9F2" font-size="16">',
            uint256(p.nativeRepayCount).toString(),
            '</text><text x="250" y="166" fill="#8A93A8" font-size="10">REPAID USD</text><text x="250" y="184" fill="#E6E9F2" font-size="16">',
            uint256(p.repaidVolumeUsd6 / 1e6).toString(),
            "</text>"
        );
    }
}

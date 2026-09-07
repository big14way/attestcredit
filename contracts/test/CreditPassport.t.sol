// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ScoreEngine} from "../src/ScoreEngine.sol";
import {CreditLedger} from "../src/CreditLedger.sol";
import {CreditPassport, IERC5192} from "../src/CreditPassport.sol";
import {AaveV3Events} from "../src/lib/AaveV3Events.sol";

contract CreditPassportTest is Test {
    ScoreEngine engine;
    CreditLedger ledger;
    CreditPassport passport;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        engine = new ScoreEngine(address(this));
        ledger = new CreditLedger(address(this), engine);
        passport = new CreditPassport(ledger);
        ledger.grantRole(ledger.RECORDER_ROLE(), address(this));
        // give alice one proven repay
        ledger.recordFact(alice, 2, AaveV3Events.USDC, 100e6, 100e6, 11_000_000, keccak256("q1"));
    }

    function test_mintRequiresHistory() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(CreditPassport.NoCreditHistory.selector, bob));
        passport.mint();
    }

    function test_mintOnlySelfAndSoulbound() public {
        vm.prank(alice);
        uint256 id = passport.mint();
        assertEq(id, uint256(uint160(alice)));
        assertEq(passport.ownerOf(id), alice);
        assertTrue(passport.locked(id));
        assertTrue(passport.supportsInterface(type(IERC5192).interfaceId));

        vm.prank(alice);
        vm.expectRevert(CreditPassport.Soulbound.selector);
        passport.transferFrom(alice, bob, id);

        vm.prank(alice);
        vm.expectRevert(CreditPassport.Soulbound.selector);
        passport.approve(bob, id);

        vm.prank(alice);
        vm.expectRevert(); // ERC721InvalidSender: already minted
        passport.mint();
    }

    function test_tokenURIIsOnChainSvg() public {
        vm.prank(alice);
        passport.mint();
        string memory uri = passport.tokenURI(uint256(uint160(alice)));
        assertTrue(bytes(uri).length > 200);
        assertEq(_prefix(uri, 29), "data:application/json;base64,");
        // SVG must stay reasonably small
        assertLt(bytes(uri).length, 8000, "uri too large");
    }

    function test_refreshEmitsMetadataUpdate() public {
        vm.prank(alice);
        passport.mint();
        vm.expectRevert(abi.encodeWithSelector(CreditPassport.NotMinted.selector, bob));
        passport.refresh(bob);
        passport.refresh(alice); // anyone
        assertEq(passport.lastRefreshed(uint256(uint160(alice))), uint64(block.timestamp));
    }

    function _prefix(string memory s, uint256 n) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(n);
        for (uint256 i; i < n; ++i) {
            out[i] = b[i];
        }
        return string(out);
    }
}

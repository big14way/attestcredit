// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ICreditLedger, Fact, FactType} from "./interfaces/ICreditLedger.sol";
import {CreditProfile} from "./interfaces/ICreditOracle.sol";
import {ChainInfoLib} from "./interfaces/IChainInfo.sol";
import {ScoreEngine} from "./ScoreEngine.sol";

/// @title CreditLedger
/// @notice Storage of credit profiles and the audit trail of facts behind them. Implements ICreditOracle.
///         Writers: CreditBureauASC (RECORDER_ROLE) for Attestcoin-proven facts and TieredLender
///         (NATIVE_RECORDER_ROLE) for Creditcoin-native repayments/defaults.
contract CreditLedger is AccessControl, ICreditLedger {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    bytes32 public constant NATIVE_RECORDER_ROLE = keccak256("NATIVE_RECORDER_ROLE");

    /// @notice Attestcoin chain key of the source chain whose height is the ledger's clock.
    uint64 public constant SOURCE_CHAIN_KEY = 1; // Ethereum Sepolia on CC3 testnet

    ScoreEngine public scoreEngine;

    mapping(address => CreditProfile) public profiles;
    mapping(address => bytes32[]) public factIds;
    mapping(bytes32 => Fact) public facts;
    mapping(bytes32 => uint8) public queryFactCount; // facts recorded under one Attestcoin queryId

    /// @notice Highest Sepolia block seen in any proven fact — fallback clock when the precompile is silent.
    uint64 public latestSourceBlock;
    uint256 public totalSubjects;
    uint256 public totalFacts;

    event ScoreEngineUpdated(address engine);

    constructor(address admin, ScoreEngine engine) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        scoreEngine = engine;
        emit ScoreEngineUpdated(address(engine));
    }

    function setScoreEngine(ScoreEngine engine) external onlyRole(DEFAULT_ADMIN_ROLE) {
        scoreEngine = engine;
        emit ScoreEngineUpdated(address(engine));
    }

    // ───────────────────────────── writes ─────────────────────────────

    /// @inheritdoc ICreditLedger
    function recordFact(
        address subject,
        uint8 factType,
        address reserve,
        uint256 amountRaw,
        uint128 amountUsd6,
        uint64 sourceBlock,
        bytes32 queryId
    ) external onlyRole(RECORDER_ROLE) returns (bytes32 factId) {
        require(subject != address(0), "CreditLedger: zero subject");
        require(
            factType == uint8(FactType.Borrow) || factType == uint8(FactType.Repay)
                || factType == uint8(FactType.Liquidation),
            "CreditLedger: bad fact type"
        );
        require(sourceBlock != 0 && queryId != bytes32(0), "CreditLedger: proven facts need block+query");

        CreditProfile storage p = profiles[subject];
        if (factType == uint8(FactType.Borrow)) {
            p.borrowCount += 1;
            p.borrowedVolumeUsd6 = _addSat(p.borrowedVolumeUsd6, amountUsd6);
        } else if (factType == uint8(FactType.Repay)) {
            p.repayCount += 1;
            p.repaidVolumeUsd6 = _addSat(p.repaidVolumeUsd6, amountUsd6);
            if (sourceBlock > p.lastRepayBlock) p.lastRepayBlock = sourceBlock;
        } else {
            p.liquidationCount += 1;
            if (sourceBlock > p.lastLiquidationBlock) p.lastLiquidationBlock = sourceBlock;
        }
        if (p.firstActivityBlock == 0 || sourceBlock < p.firstActivityBlock) p.firstActivityBlock = sourceBlock;
        if (sourceBlock > latestSourceBlock) latestSourceBlock = sourceBlock;

        uint8 n = queryFactCount[queryId]++;
        factId = keccak256(abi.encodePacked(queryId, n));
        _store(factId, subject, factType, reserve, amountRaw, amountUsd6, sourceBlock, queryId);
    }

    /// @inheritdoc ICreditLedger
    function recordNativeRepay(address subject) external onlyRole(NATIVE_RECORDER_ROLE) {
        profiles[subject].nativeRepayCount += 1;
        _storeNative(subject, uint8(FactType.NativeRepay));
    }

    /// @inheritdoc ICreditLedger
    function recordNativeDefault(address subject) external onlyRole(NATIVE_RECORDER_ROLE) {
        profiles[subject].nativeDefaultCount += 1;
        _storeNative(subject, uint8(FactType.NativeDefault));
    }

    // ───────────────────────────── reads (ICreditOracle) ─────────────────────────────

    function getScore(address subject) public view returns (uint16 score, uint8 tier) {
        return scoreEngine.score(profiles[subject], currentSourceBlock());
    }

    function getProfile(address subject) external view returns (CreditProfile memory) {
        return profiles[subject];
    }

    function factCount(address subject) external view returns (uint256) {
        return factIds[subject].length;
    }

    function getBreakdown(address subject) external view returns (ScoreEngine.Breakdown memory) {
        return scoreEngine.breakdown(profiles[subject], currentSourceBlock());
    }

    function getFacts(address subject) external view returns (Fact[] memory out) {
        bytes32[] storage ids = factIds[subject];
        out = new Fact[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            out[i] = facts[ids[i]];
        }
    }

    /// @notice The ledger's clock: the latest Sepolia height attested on Creditcoin (ChainInfo precompile),
    ///         never lower than the highest block already proven into the ledger.
    function currentSourceBlock() public view returns (uint64) {
        (uint64 h, bool ok) = ChainInfoLib.latestAttestedHeight(SOURCE_CHAIN_KEY);
        return (ok && h > latestSourceBlock) ? h : latestSourceBlock;
    }

    // ───────────────────────────── internals ─────────────────────────────

    function _storeNative(address subject, uint8 factType) private {
        require(subject != address(0), "CreditLedger: zero subject");
        bytes32 factId = keccak256(abi.encodePacked(subject, factType, block.number, factIds[subject].length));
        _store(factId, subject, factType, address(0), 0, 0, 0, bytes32(0));
    }

    function _store(
        bytes32 factId,
        address subject,
        uint8 factType,
        address reserve,
        uint256 amountRaw,
        uint128 amountUsd6,
        uint64 sourceBlock,
        bytes32 queryId
    ) private {
        if (factIds[subject].length == 0) totalSubjects += 1;
        factIds[subject].push(factId);
        facts[factId] = Fact({
            subject: subject,
            factType: factType,
            reserve: reserve,
            amountRaw: amountRaw,
            amountUsd6: amountUsd6,
            sourceBlock: sourceBlock,
            queryId: queryId,
            recordedAt: uint64(block.timestamp)
        });
        totalFacts += 1;
        profiles[subject].updatedAt = uint64(block.timestamp);
        emit FactStored(factId, subject, factType, queryId, sourceBlock);

        (uint16 s, uint8 t) = getScore(subject);
        emit ProfileUpdated(subject, s, t);
    }

    function _addSat(uint128 a, uint128 b) private pure returns (uint128) {
        unchecked {
            uint128 c = a + b;
            return c < a ? type(uint128).max : c;
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ASCBase} from "@gluwa/asc-contracts/contracts/readability/ASCBase.sol";
import {INativeQueryVerifier} from "@gluwa/asc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import {EvmV1Decoder} from "@gluwa/asc-contracts/contracts/common/EvmV1Decoder.sol";
import {AaveV3Events} from "./lib/AaveV3Events.sol";
import {ICreditLedger, FactType} from "./interfaces/ICreditLedger.sol";

/// @title CreditBureauASC
/// @notice The only contract that talks to the Attestcoin block-prover precompile (0x…0FD2). Verifies that an
///         Ethereum Sepolia transaction was included in an attested block, decodes its receipt, and records every
///         Aave V3 Pool Borrow / Repay / LiquidationCall it contains into the CreditLedger.
///         Permissionless: anyone may submit proofs for any subject — that is what a bureau is.
/// @dev    Inherits `_verifyProof`, `_computeQueryId` and `processedQueries` from ASCBase. ASCBase's own
///         `execute` is non-virtual and does not expose the chain key to `_processAndEmitEvent`, so this contract
///         provides `executeSingle` / `executeBatch` which enforce `chainKey == SEPOLIA_CHAIN_KEY` and hard-disables
///         the inherited entry point (see `_processAndEmitEvent`).
contract CreditBureauASC is ASCBase {
    uint64 public constant SEPOLIA_CHAIN_KEY = 1; // Attestcoin chain key, NOT the EVM chainId 11155111
    address public constant AAVE_POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951; // Aave V3 Pool, Sepolia
    uint256 public constant MAX_BATCH = 10; // precompile limit per call

    uint8 public constant ACTION_AUTO = 0;
    uint8 public constant ACTION_AAVE_BORROW = 1;
    uint8 public constant ACTION_AAVE_REPAY = 2;
    uint8 public constant ACTION_AAVE_LIQUIDATION = 3;

    ICreditLedger public immutable LEDGER;

    /// @notice Number of Sepolia transactions verified through the precompile by this contract.
    uint256 public verifiedQueryCount;
    /// @notice Sepolia block height of every processed query (for the proof trail UI).
    mapping(bytes32 => uint64) public querySourceBlock;

    /// @dev Height of the tx currently being processed; non-zero only inside executeSingle/executeBatch.
    uint64 private _ctxHeight;

    event FactRecorded(
        address indexed subject,
        uint8 indexed factType,
        address reserve,
        uint256 amount,
        uint128 amountUsd6,
        uint64 sourceBlock,
        bytes32 indexed queryId,
        bytes32 factId
    );
    event QueryVerified(bytes32 indexed queryId, uint64 chainKey, uint64 height, uint256 factsRecorded);

    error WrongChainKey(uint64 given);
    error UseTypedEntrypoints();
    error BatchSize(uint256 n);
    error LengthMismatch();
    error NoAaveFacts(bytes32 queryId);

    constructor(ICreditLedger ledger) {
        LEDGER = ledger;
    }

    // ───────────────────────────── single ─────────────────────────────

    /// @notice Verify one Sepolia tx and record its Aave facts.
    /// @param action ACTION_AUTO records every recognised Aave event in the tx; 1/2/3 restrict to one kind.
    function executeSingle(
        uint8 action,
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
        bytes32 lowerEndpointDigest,
        bytes32[] calldata continuityRoots
    ) external returns (bytes32 queryId) {
        if (chainKey != SEPOLIA_CHAIN_KEY) revert WrongChainKey(chainKey);

        queryId = _computeQueryId(chainKey, blockHeight, merkleRoot, siblings);
        require(!processedQueries[queryId], "Query already processed");

        bool verified = _verifyProof(
            chainKey, blockHeight, encodedTransaction, merkleRoot, siblings, lowerEndpointDigest, continuityRoots
        );
        require(verified, "Proof of inclusion verification failed");
        processedQueries[queryId] = true;

        _ctxHeight = blockHeight;
        _processAndEmitEvent(action, queryId, encodedTransaction);
        _ctxHeight = 0;
    }

    // ───────────────────────────── batch ─────────────────────────────

    /// @notice Verify up to 10 Sepolia txs (within 1000 blocks) with one shared continuity proof and record all
    ///         their Aave facts. All-or-nothing: if any tx is already processed, fails verification, or carries no
    ///         Aave fact, the whole batch reverts and no queryId is consumed.
    function executeBatch(
        uint64 chainKey,
        uint64[] calldata heights,
        bytes[] calldata encodedTransactions,
        INativeQueryVerifier.MerkleProof[] calldata merkleProofs,
        INativeQueryVerifier.ContinuityProof calldata sharedContinuityProof
    ) external returns (bytes32[] memory queryIds) {
        if (chainKey != SEPOLIA_CHAIN_KEY) revert WrongChainKey(chainKey);
        uint256 n = heights.length;
        if (n == 0 || n > MAX_BATCH) revert BatchSize(n);
        if (encodedTransactions.length != n || merkleProofs.length != n) revert LengthMismatch();

        queryIds = new bytes32[](n);
        for (uint256 i; i < n; ++i) {
            bytes32 q = _batchQueryId(chainKey, heights[i], merkleProofs[i]);
            require(!processedQueries[q], "Query already processed");
            processedQueries[q] = true; // also rejects duplicates inside the same batch
            queryIds[i] = q;
        }

        bool verified =
            VERIFIER.verifyAndEmit(chainKey, heights, encodedTransactions, merkleProofs, sharedContinuityProof);
        require(verified, "Batch proof verification failed");

        for (uint256 i; i < n; ++i) {
            _ctxHeight = heights[i];
            _processAndEmitEvent(ACTION_AUTO, queryIds[i], encodedTransactions[i]);
        }
        _ctxHeight = 0;
    }

    /// @dev Same replay key as ASCBase._computeQueryId: keccak256(chainKey ‖ height(8 bytes) ‖ txIndex).
    function _batchQueryId(uint64 chainKey, uint64 height, INativeQueryVerifier.MerkleProof calldata proof)
        internal
        view
        returns (bytes32)
    {
        uint256 txIndex = VERIFIER.calculateTxIndex(proof);
        return keccak256(abi.encodePacked(uint256(chainKey), height, txIndex));
    }

    // ───────────────────────────── processing ─────────────────────────────

    /// @dev Called only from executeSingle/executeBatch (which set `_ctxHeight`). If reached through the inherited
    ///      ASCBase.execute, the chain key was never checked, so we refuse.
    function _processAndEmitEvent(uint8 action, bytes32 queryId, bytes memory encodedTransaction) internal override {
        uint64 height = _ctxHeight;
        if (height == 0) revert UseTypedEntrypoints();

        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        require(EvmV1Decoder.isValidTransactionType(txType), "Unsupported transaction type");

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptStatus == 1, "Transaction did not succeed");

        uint256 recorded;
        if (action == ACTION_AUTO || action == ACTION_AAVE_BORROW) {
            recorded += _recordBorrows(queryId, height, receipt);
        }
        if (action == ACTION_AUTO || action == ACTION_AAVE_REPAY) {
            recorded += _recordRepays(queryId, height, receipt);
        }
        if (action == ACTION_AUTO || action == ACTION_AAVE_LIQUIDATION) {
            recorded += _recordLiquidations(queryId, height, receipt);
        }
        if (recorded == 0) revert NoAaveFacts(queryId);

        verifiedQueryCount += 1;
        querySourceBlock[queryId] = height;
        emit QueryVerified(queryId, SEPOLIA_CHAIN_KEY, height, recorded);
    }

    function _recordBorrows(bytes32 queryId, uint64 height, EvmV1Decoder.ReceiptFields memory receipt)
        private
        returns (uint256 n)
    {
        EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(receipt, AaveV3Events.BORROW_SIG);
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].address_ != AAVE_POOL) continue; // only the real Aave Pool may emit credit facts
            (address reserve, address subject, uint256 amount) = AaveV3Events.decodeBorrow(logs[i]);
            _record(queryId, height, FactType.Borrow, subject, reserve, amount);
            n++;
        }
    }

    function _recordRepays(bytes32 queryId, uint64 height, EvmV1Decoder.ReceiptFields memory receipt)
        private
        returns (uint256 n)
    {
        EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(receipt, AaveV3Events.REPAY_SIG);
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].address_ != AAVE_POOL) continue;
            (address reserve, address subject, uint256 amount) = AaveV3Events.decodeRepay(logs[i]);
            _record(queryId, height, FactType.Repay, subject, reserve, amount);
            n++;
        }
    }

    function _recordLiquidations(bytes32 queryId, uint64 height, EvmV1Decoder.ReceiptFields memory receipt)
        private
        returns (uint256 n)
    {
        EvmV1Decoder.LogEntry[] memory logs =
            EvmV1Decoder.getLogsByEventSignature(receipt, AaveV3Events.LIQUIDATION_SIG);
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].address_ != AAVE_POOL) continue;
            (, address debtAsset, address subject, uint256 debtToCover) = AaveV3Events.decodeLiquidation(logs[i]);
            _record(queryId, height, FactType.Liquidation, subject, debtAsset, debtToCover);
            n++;
        }
    }

    function _record(bytes32 queryId, uint64 height, FactType t, address subject, address reserve, uint256 amount)
        private
    {
        uint128 usd = AaveV3Events.usdValue6(reserve, amount);
        bytes32 factId = LEDGER.recordFact(subject, uint8(t), reserve, amount, usd, height, queryId);
        emit FactRecorded(subject, uint8(t), reserve, amount, usd, height, queryId, factId);
    }
}

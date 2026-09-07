// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {INativeQueryVerifier} from "@gluwa/asc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import {EvmV1Decoder} from "@gluwa/asc-contracts/contracts/common/EvmV1Decoder.sol";
import {ScoreEngine} from "../src/ScoreEngine.sol";
import {CreditLedger} from "../src/CreditLedger.sol";
import {CreditBureauASC} from "../src/CreditBureauASC.sol";
import {ICreditLedger, Fact} from "../src/interfaces/ICreditLedger.sol";
import {CreditProfile} from "../src/interfaces/ICreditOracle.sol";
import {AaveV3Events} from "../src/lib/AaveV3Events.sol";
import {MockVerifier} from "./utils/MockVerifier.sol";
import {TxEncoder} from "./utils/TxEncoder.sol";

/// @dev Fixtures in test/fixtures/*.json are REAL proofs from the CC3 testnet prover for real Sepolia txs,
///      captured with `worker cli fixture <txHash>`. Only the precompile is mocked.
contract CreditBureauASCTest is Test {
    struct Fixture {
        uint64 chainKey;
        uint64 height;
        uint64 txIndex;
        bytes encodedTransaction;
        bytes32 merkleRoot;
        INativeQueryVerifier.MerkleProofEntry[] siblings;
        bytes32 lowerEndpointDigest;
        bytes32[] continuityRoots;
    }

    address constant PRECOMPILE = 0x0000000000000000000000000000000000000FD2;
    // Subjects of the recorded fixtures (from the Sepolia logs)
    address constant BORROWER = 0x2C56b94f8b27E116C5686B41473bC038a6d86A88;
    address constant REPAYER = 0xb69062aD508d33f17e34266E61C7d21d06Ce46BB;

    MockVerifier mock;
    ScoreEngine engine;
    CreditLedger ledger;
    CreditBureauASC bureau;

    Fixture borrowFx;
    Fixture repayFx;
    Fixture failedFx;
    Fixture plainFx;

    function setUp() public {
        vm.etch(PRECOMPILE, address(new MockVerifier()).code);
        mock = MockVerifier(PRECOMPILE);

        engine = new ScoreEngine(address(this));
        ledger = new CreditLedger(address(this), engine);
        bureau = new CreditBureauASC(ICreditLedger(address(ledger)));
        ledger.grantRole(ledger.RECORDER_ROLE(), address(bureau));

        _load(borrowFx, "aave-borrow-usdc");
        _load(repayFx, "aave-repay-usdc");
        _load(failedFx, "aave-failed-tx");
        _load(plainFx, "non-aave-tx");
    }

    function _load(Fixture storage f, string memory name) internal {
        string memory json = vm.readFile(string.concat("test/fixtures/", name, ".json"));
        f.chainKey = uint64(vm.parseJsonUint(json, ".chainKey"));
        f.height = uint64(vm.parseJsonUint(json, ".height"));
        f.txIndex = uint64(vm.parseJsonUint(json, ".txIndex"));
        f.encodedTransaction = vm.parseJsonBytes(json, ".encodedTransaction");
        f.merkleRoot = vm.parseJsonBytes32(json, ".merkleRoot");
        f.lowerEndpointDigest = vm.parseJsonBytes32(json, ".lowerEndpointDigest");
        f.continuityRoots = vm.parseJsonBytes32Array(json, ".continuityRoots");
        INativeQueryVerifier.MerkleProofEntry[] memory sib =
            abi.decode(vm.parseJson(json, ".siblings"), (INativeQueryVerifier.MerkleProofEntry[]));
        for (uint256 i; i < sib.length; ++i) {
            f.siblings.push(sib[i]);
        }
    }

    function _single(Fixture storage f, uint8 action, uint64 chainKey) internal returns (bytes32) {
        return bureau.executeSingle(
            action,
            chainKey,
            f.height,
            f.encodedTransaction,
            f.merkleRoot,
            f.siblings,
            f.lowerEndpointDigest,
            f.continuityRoots
        );
    }

    function _mp(Fixture storage f) internal view returns (INativeQueryVerifier.MerkleProof memory) {
        return INativeQueryVerifier.MerkleProof({root: f.merkleRoot, siblings: f.siblings});
    }

    // ───────────────────────── fixtures sanity ─────────────────────────

    function test_fixturesAreSepoliaAndIndexMatchesMerklePath() public view {
        assertEq(borrowFx.chainKey, 1);
        assertEq(mock.calculateTxIndex(_mp(borrowFx)), borrowFx.txIndex, "borrow idx");
        assertEq(mock.calculateTxIndex(_mp(repayFx)), repayFx.txIndex, "repay idx");
        assertEq(mock.calculateTxIndex(_mp(failedFx)), failedFx.txIndex, "failed idx");
        assertEq(mock.calculateTxIndex(_mp(plainFx)), plainFx.txIndex, "plain idx");
    }

    // ───────────────────────── single path ─────────────────────────

    function test_singleBorrowRecordsFact() public {
        bytes32 q = _single(borrowFx, 0, 1);
        assertTrue(bureau.processedQueries(q));
        assertEq(bureau.verifiedQueryCount(), 1);
        assertEq(bureau.querySourceBlock(q), borrowFx.height);

        CreditProfile memory p = ledger.getProfile(BORROWER);
        assertEq(p.borrowCount, 1);
        assertEq(p.repayCount, 0);
        assertGt(p.borrowedVolumeUsd6, 0);
        assertEq(p.firstActivityBlock, borrowFx.height);
        assertEq(ledger.factCount(BORROWER), 1);

        Fact[] memory facts = ledger.getFacts(BORROWER);
        assertEq(facts[0].reserve, AaveV3Events.USDC);
        assertEq(facts[0].amountUsd6, uint128(facts[0].amountRaw), "USDC is 1:1");
        assertEq(facts[0].queryId, q);
        assertEq(mock.singleCalls(), 1);
    }

    function test_singleRepayRecordsFactAndScoreMoves() public {
        (uint16 before,) = ledger.getScore(REPAYER);
        _single(repayFx, 0, 1);
        CreditProfile memory p = ledger.getProfile(REPAYER);
        assertEq(p.repayCount, 1);
        assertEq(p.lastRepayBlock, repayFx.height);
        (uint16 after_,) = ledger.getScore(REPAYER);
        assertGt(after_, before, "repay should raise the score");
    }

    function test_actionFilterRejectsMismatch() public {
        uint8 repayAction = bureau.ACTION_AAVE_REPAY();
        uint8 borrowAction = bureau.ACTION_AAVE_BORROW();
        vm.expectRevert(); // NoAaveFacts: borrow tx contains no Repay
        _single(borrowFx, repayAction, 1);
        _single(borrowFx, borrowAction, 1);
    }

    function test_rejectsFailedReceipt() public {
        vm.expectRevert(bytes("Transaction did not succeed"));
        _single(failedFx, 0, 1);
    }

    function test_rejectsNonAaveTxAndDoesNotConsumeQueryId() public {
        vm.expectRevert();
        _single(plainFx, 0, 1);
        bytes32 q = keccak256(abi.encodePacked(uint256(1), plainFx.height, uint256(plainFx.txIndex)));
        assertFalse(bureau.processedQueries(q), "queryId must not be consumed on revert");
        assertEq(bureau.verifiedQueryCount(), 0);
    }

    function test_rejectsWrongChainKey() public {
        vm.expectRevert(abi.encodeWithSelector(CreditBureauASC.WrongChainKey.selector, uint64(3)));
        _single(borrowFx, 0, 3);
    }

    function test_rejectsReplay() public {
        _single(borrowFx, 0, 1);
        vm.expectRevert(bytes("Query already processed"));
        _single(borrowFx, 0, 1);
    }

    function test_rejectsWhenPrecompileSaysNo() public {
        mock.setShouldVerify(false);
        vm.expectRevert(bytes("Proof of inclusion verification failed"));
        _single(borrowFx, 0, 1);
    }

    function test_inheritedExecuteIsDisabled() public {
        vm.expectRevert(CreditBureauASC.UseTypedEntrypoints.selector);
        bureau.execute(
            0,
            1,
            borrowFx.height,
            borrowFx.encodedTransaction,
            borrowFx.merkleRoot,
            borrowFx.siblings,
            borrowFx.lowerEndpointDigest,
            borrowFx.continuityRoots
        );
    }

    function test_queryIdMatchesASCBaseFormula() public {
        bytes32 q = _single(borrowFx, 0, 1);
        bytes32 expected = keccak256(abi.encodePacked(uint256(1), borrowFx.height, uint256(borrowFx.txIndex)));
        assertEq(q, expected);
    }

    // ───────────────────────── batch path ─────────────────────────

    function _batch(Fixture storage a, Fixture storage b)
        internal
        view
        returns (
            uint64[] memory heights,
            bytes[] memory txs,
            INativeQueryVerifier.MerkleProof[] memory proofs,
            INativeQueryVerifier.ContinuityProof memory shared
        )
    {
        heights = new uint64[](2);
        txs = new bytes[](2);
        proofs = new INativeQueryVerifier.MerkleProof[](2);
        heights[0] = a.height;
        heights[1] = b.height;
        txs[0] = a.encodedTransaction;
        txs[1] = b.encodedTransaction;
        proofs[0] = _mp(a);
        proofs[1] = _mp(b);
        shared = INativeQueryVerifier.ContinuityProof({
            lowerEndpointDigest: a.lowerEndpointDigest, roots: a.continuityRoots
        });
    }

    function test_batchRecordsAll() public {
        (
            uint64[] memory h,
            bytes[] memory t,
            INativeQueryVerifier.MerkleProof[] memory p,
            INativeQueryVerifier.ContinuityProof memory s
        ) = _batch(borrowFx, repayFx);
        bytes32[] memory ids = bureau.executeBatch(1, h, t, p, s);
        assertEq(ids.length, 2);
        assertTrue(bureau.processedQueries(ids[0]) && bureau.processedQueries(ids[1]));
        assertEq(bureau.verifiedQueryCount(), 2);
        assertEq(mock.batchCalls(), 1);
        assertEq(ledger.getProfile(BORROWER).borrowCount, 1);
        assertEq(ledger.getProfile(REPAYER).repayCount, 1);
        assertEq(ledger.totalSubjects(), 2);
    }

    function test_batchIsAllOrNothing() public {
        (
            uint64[] memory h,
            bytes[] memory t,
            INativeQueryVerifier.MerkleProof[] memory p,
            INativeQueryVerifier.ContinuityProof memory s
        ) = _batch(borrowFx, plainFx);
        vm.expectRevert(); // second tx has no Aave fact → whole batch reverts
        bureau.executeBatch(1, h, t, p, s);
        assertEq(ledger.getProfile(BORROWER).borrowCount, 0, "first tx must be rolled back");
        assertEq(bureau.verifiedQueryCount(), 0);
        bytes32 q0 = keccak256(abi.encodePacked(uint256(1), borrowFx.height, uint256(borrowFx.txIndex)));
        assertFalse(bureau.processedQueries(q0));
    }

    function test_batchRejectsReplayAndDuplicates() public {
        _single(borrowFx, 0, 1);
        (
            uint64[] memory h,
            bytes[] memory t,
            INativeQueryVerifier.MerkleProof[] memory p,
            INativeQueryVerifier.ContinuityProof memory s
        ) = _batch(borrowFx, repayFx);
        vm.expectRevert(bytes("Query already processed"));
        bureau.executeBatch(1, h, t, p, s);

        (h, t, p, s) = _batch(repayFx, repayFx);
        vm.expectRevert(bytes("Query already processed"));
        bureau.executeBatch(1, h, t, p, s);
    }

    function test_batchRejectsWrongChainKeyAndSize() public {
        (
            uint64[] memory h,
            bytes[] memory t,
            INativeQueryVerifier.MerkleProof[] memory p,
            INativeQueryVerifier.ContinuityProof memory s
        ) = _batch(borrowFx, repayFx);
        vm.expectRevert(abi.encodeWithSelector(CreditBureauASC.WrongChainKey.selector, uint64(2)));
        bureau.executeBatch(2, h, t, p, s);
        vm.expectRevert(abi.encodeWithSelector(CreditBureauASC.BatchSize.selector, 0));
        bureau.executeBatch(1, new uint64[](0), new bytes[](0), new INativeQueryVerifier.MerkleProof[](0), s);
    }

    // ───────────────────────── hand-built receipts ─────────────────────────

    function _handBuilt(uint8 status, EvmV1Decoder.LogEntryTuple[] memory logs, uint64 height)
        internal
        returns (bytes32)
    {
        bytes memory enc = TxEncoder.encodeType2(status, logs);
        INativeQueryVerifier.MerkleProofEntry[] memory sib = new INativeQueryVerifier.MerkleProofEntry[](1);
        sib[0] = INativeQueryVerifier.MerkleProofEntry(keccak256(abi.encode(height)), true);
        return bureau.executeSingle(0, 1, height, enc, bytes32(uint256(1)), sib, bytes32(0), new bytes32[](1));
    }

    function test_liquidationAndMultipleLogsInOneTx() public {
        EvmV1Decoder.LogEntryTuple[] memory logs = new EvmV1Decoder.LogEntryTuple[](3);
        logs[0] = TxEncoder.liquidationLog(TxEncoder.POOL, AaveV3Events.WETH, AaveV3Events.USDC, BORROWER, 50e6);
        logs[1] = TxEncoder.repayLog(TxEncoder.POOL, AaveV3Events.DAI, BORROWER, address(0xD00D), 20e18);
        logs[2] = TxEncoder.borrowLog(TxEncoder.POOL, AaveV3Events.USDC, BORROWER, 100e6);
        _handBuilt(1, logs, 12_000_000);
        CreditProfile memory p = ledger.getProfile(BORROWER);
        assertEq(p.liquidationCount, 1);
        assertEq(p.repayCount, 1);
        assertEq(p.borrowCount, 1);
        assertEq(p.repaidVolumeUsd6, 20e6);
        assertEq(p.borrowedVolumeUsd6, 100e6);
        assertEq(p.lastLiquidationBlock, 12_000_000);
        assertEq(ledger.factCount(BORROWER), 3);
    }

    function test_ignoresAaveShapedLogsFromOtherContracts() public {
        EvmV1Decoder.LogEntryTuple[] memory logs = new EvmV1Decoder.LogEntryTuple[](1);
        logs[0] = TxEncoder.borrowLog(address(0xFA4E), AaveV3Events.USDC, BORROWER, 100e6); // spoofed emitter
        vm.expectRevert();
        _handBuilt(1, logs, 12_000_001);
        assertEq(ledger.factCount(BORROWER), 0);
    }

    function test_rejectsStatusZeroHandBuilt() public {
        EvmV1Decoder.LogEntryTuple[] memory logs = new EvmV1Decoder.LogEntryTuple[](1);
        logs[0] = TxEncoder.borrowLog(TxEncoder.POOL, AaveV3Events.USDC, BORROWER, 100e6);
        vm.expectRevert(bytes("Transaction did not succeed"));
        _handBuilt(0, logs, 12_000_002);
    }
}

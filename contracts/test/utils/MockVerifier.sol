// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {INativeQueryVerifier} from "@gluwa/asc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";

/// @dev Stand-in for the Creditcoin block-prover precompile (0x…0FD2), `vm.etch`ed in tests. Never used on-chain.
///      `calculateTxIndex` derives the leaf index from the sibling path like the real precompile (a sibling on the
///      left means our node is the right child → bit = 1).
contract MockVerifier {
    bool public shouldFail; // etched code has empty storage, so the default must be "verify"
    uint256 public singleCalls;
    uint256 public batchCalls;

    event TransactionVerified(uint64 indexed chainKey, uint64 indexed height, uint64 transactionIndex);

    function setShouldVerify(bool v) external {
        shouldFail = !v;
    }

    function calculateTxIndex(INativeQueryVerifier.MerkleProof calldata p) public pure returns (uint64 idx) {
        for (uint256 i; i < p.siblings.length; ++i) {
            if (p.siblings[i].isLeft) idx |= uint64(1) << uint64(i);
        }
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata,
        INativeQueryVerifier.MerkleProof calldata p,
        INativeQueryVerifier.ContinuityProof calldata
    ) external returns (bool) {
        singleCalls++;
        if (shouldFail) return false;
        emit TransactionVerified(chainKey, height, calculateTxIndex(p));
        return true;
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64[] calldata heights,
        bytes[] calldata txs,
        INativeQueryVerifier.MerkleProof[] calldata proofs,
        INativeQueryVerifier.ContinuityProof calldata
    ) external returns (bool) {
        batchCalls++;
        require(heights.length == txs.length && txs.length == proofs.length, "mock: len");
        require(heights.length > 0 && heights.length <= 10, "mock: size");
        if (shouldFail) return false;
        for (uint256 i; i < heights.length; ++i) {
            emit TransactionVerified(chainKey, heights[i], calculateTxIndex(proofs[i]));
        }
        return true;
    }
}

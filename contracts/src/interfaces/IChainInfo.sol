// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IChainInfo
/// @notice Subset of the Creditcoin ChainInfo precompile at `0x…0fd3`. Function names are snake_case on
///         the precompile (see usc-sdk chain-info/chain_info.json).
interface IChainInfo {
    /// @return height latest attested source-chain block height
    /// @return hash   its digest
    /// @return isAttestation true if the digest is an attestation (vs. checkpoint)
    /// @return exists false if the chain has no attestations
    function get_latest_attestation_height_and_hash(uint64 chainKey)
        external
        view
        returns (uint64 height, bytes32 hash, bool isAttestation, bool exists);
}

library ChainInfoLib {
    address internal constant PRECOMPILE = 0x0000000000000000000000000000000000000fD3;

    /// @notice Latest attested height for `chainKey`, or (0,false) when the precompile is unavailable
    ///         (e.g. in a local Foundry test without a mock). Uses a raw staticcall because precompiles
    ///         have no bytecode and a high-level call would fail the extcodesize check.
    function latestAttestedHeight(uint64 chainKey) internal view returns (uint64 height, bool ok) {
        (bool success, bytes memory ret) = PRECOMPILE.staticcall(
            abi.encodeWithSelector(IChainInfo.get_latest_attestation_height_and_hash.selector, chainKey)
        );
        if (!success || ret.length < 128) return (0, false);
        (uint64 h,,, bool exists) = abi.decode(ret, (uint64, bytes32, bool, bool));
        return (h, exists);
    }
}

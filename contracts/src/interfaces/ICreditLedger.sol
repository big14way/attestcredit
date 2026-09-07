// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICreditOracle, CreditProfile} from "./ICreditOracle.sol";

/// @notice Kinds of facts the ledger stores. 1–3 mirror the CreditBureauASC action codes.
enum FactType {
    None, // 0
    Borrow, // 1  Aave V3 Borrow (proven)
    Repay, // 2  Aave V3 Repay (proven)
    Liquidation, // 3  Aave V3 LiquidationCall (proven)
    NativeRepay, // 4  TieredLender repay on Creditcoin
    NativeDefault // 5  TieredLender default on Creditcoin
}

/// @notice One recorded fact. Proven facts carry the Attestcoin queryId and the Sepolia block height;
///         native facts carry queryId = 0 and sourceBlock = 0.
struct Fact {
    address subject;
    uint8 factType;
    address reserve;
    uint256 amountRaw;
    uint128 amountUsd6;
    uint64 sourceBlock;
    bytes32 queryId;
    uint64 recordedAt;
}

/// @title ICreditLedger
/// @notice Write interface used by CreditBureauASC (RECORDER_ROLE) and TieredLender (NATIVE_RECORDER_ROLE).
interface ICreditLedger is ICreditOracle {
    event FactStored(
        bytes32 indexed factId, address indexed subject, uint8 indexed factType, bytes32 queryId, uint64 sourceBlock
    );
    event ProfileUpdated(address indexed subject, uint16 score, uint8 tier);

    function recordFact(
        address subject,
        uint8 factType,
        address reserve,
        uint256 amountRaw,
        uint128 amountUsd6,
        uint64 sourceBlock,
        bytes32 queryId
    ) external returns (bytes32 factId);

    function recordNativeRepay(address subject) external;
    function recordNativeDefault(address subject) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice On-chain credit profile of one subject address. Every field is derived from facts proven
///         through the Attestcoin Protocol (Sepolia → Creditcoin) or from native Creditcoin events.
struct CreditProfile {
    uint32 borrowCount;
    uint32 repayCount;
    uint32 liquidationCount;
    uint128 borrowedVolumeUsd6; // normalised to 6-decimal USD-equivalent (fixed testnet scales, see docs/SCORING.md)
    uint128 repaidVolumeUsd6;
    uint64 firstActivityBlock; // Sepolia block of the first proven fact
    uint64 lastRepayBlock; // Sepolia block of the most recent proven repay
    uint64 lastLiquidationBlock; // Sepolia block of the most recent proven liquidation
    uint32 nativeRepayCount; // repayments on Creditcoin (TieredLender), no proof needed
    uint32 nativeDefaultCount;
    uint64 updatedAt; // Creditcoin block timestamp of the last write
}

/// @title ICreditOracle
/// @notice The read interface every lender on Creditcoin consumes. Implemented by CreditLedger.
interface ICreditOracle {
    /// @return score 300–850
    /// @return tier 0 Bronze (<500), 1 Silver (500–649), 2 Gold (650–749), 3 Platinum (>=750)
    function getScore(address subject) external view returns (uint16 score, uint8 tier);
    function getProfile(address subject) external view returns (CreditProfile memory);
    function factCount(address subject) external view returns (uint256);
}

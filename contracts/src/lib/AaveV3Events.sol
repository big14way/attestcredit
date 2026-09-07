// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EvmV1Decoder} from "@gluwa/asc-contracts/contracts/common/EvmV1Decoder.sol";

/// @title AaveV3Events
/// @notice Event selectors, log decoders and fixed testnet USD scales for Aave V3 Pool events on Ethereum Sepolia.
/// @dev Canonical signatures come from aave-v3-origin `IPool.sol`. `InterestRateMode` is an enum, i.e. `uint8` in
///      the canonical signature. See test/AaveV3Events.t.sol for the keccak assertions.
library AaveV3Events {
    // keccak256("Borrow(address,address,address,uint256,uint8,uint256,uint16)")
    bytes32 internal constant BORROW_SIG = 0xb3d084820fb1a9decffb176436bd02558d15fac9b0ddfed8c465bc7359d7dce0;
    // keccak256("Repay(address,address,address,uint256,bool)")
    bytes32 internal constant REPAY_SIG = 0xa534c8dbe71f871f9f3530e97a74601fea17b426cae02e1c5aee42c96c784051;
    // keccak256("LiquidationCall(address,address,address,uint256,uint256,address,bool)")
    bytes32 internal constant LIQUIDATION_SIG = 0xe413a321e8681d831f4dbccbca790d2952b56f977908e45be37335533e005286;

    // Aave V3 Sepolia reserves (bgd-labs/aave-address-book AaveV3Sepolia.sol, fetched 2026-09-07)
    address internal constant USDC = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8; // 6 dp
    address internal constant DAI = 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357; // 18 dp
    address internal constant WETH = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c; // 18 dp
    address internal constant WBTC = 0x29f2D40B0605204364af54EC677bD022dA425d03; // 8 dp
    address internal constant LINK = 0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5; // 18 dp
    address internal constant USDT = 0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0; // 6 dp
    address internal constant GHO = 0xc4bF5CbDaBE595361438F8c6a187bDc330539c60; // 18 dp

    /// @dev Documented fixed scales (Sepolia has no real prices). On mainnet this becomes a price feed.
    uint256 internal constant WETH_USD = 2500;
    uint256 internal constant WBTC_USD = 60_000;
    uint256 internal constant LINK_USD = 15;

    /// @notice Convert a raw reserve amount into a 6-decimal USD-equivalent. Unknown reserves return 0
    ///         (count-only), so an unlisted token can never inflate volume.
    function usdValue6(address reserve, uint256 amount) internal pure returns (uint128) {
        uint256 v;
        if (reserve == USDC || reserve == USDT) v = amount; // 6 dp, 1:1
        else if (reserve == DAI || reserve == GHO) v = amount / 1e12; // 18 dp, 1:1
        else if (reserve == WETH) v = (amount * WETH_USD) / 1e12; // 18 dp
        else if (reserve == WBTC) v = (amount * WBTC_USD) / 1e2; // 8 dp → 6 dp
        else if (reserve == LINK) v = (amount * LINK_USD) / 1e12; // 18 dp
        else return 0;
        return v > type(uint128).max ? type(uint128).max : uint128(v);
    }

    /// @notice Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount,
    ///         uint8 interestRateMode, uint256 borrowRate, uint16 indexed referralCode)
    /// @dev The credit subject is `onBehalfOf` (topic[2]).
    function decodeBorrow(EvmV1Decoder.LogEntry memory log)
        internal
        pure
        returns (address reserve, address subject, uint256 amount)
    {
        require(log.topics.length == 4 && log.topics[0] == BORROW_SIG, "AaveV3Events: not Borrow");
        require(log.data.length == 128, "AaveV3Events: Borrow data");
        reserve = _addr(log.topics[1]);
        subject = _addr(log.topics[2]);
        (, amount,,) = abi.decode(log.data, (address, uint256, uint256, uint256));
    }

    /// @notice Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)
    /// @dev The credit subject is the debtor `user` (topic[2]) whose debt was reduced, NOT `repayer`.
    function decodeRepay(EvmV1Decoder.LogEntry memory log)
        internal
        pure
        returns (address reserve, address subject, uint256 amount)
    {
        require(log.topics.length == 4 && log.topics[0] == REPAY_SIG, "AaveV3Events: not Repay");
        require(log.data.length == 64, "AaveV3Events: Repay data");
        reserve = _addr(log.topics[1]);
        subject = _addr(log.topics[2]);
        (amount,) = abi.decode(log.data, (uint256, bool));
    }

    /// @notice LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user,
    ///         uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)
    /// @dev The credit subject is the liquidated borrower `user` (topic[3]).
    function decodeLiquidation(EvmV1Decoder.LogEntry memory log)
        internal
        pure
        returns (address collateralAsset, address debtAsset, address subject, uint256 debtToCover)
    {
        require(log.topics.length == 4 && log.topics[0] == LIQUIDATION_SIG, "AaveV3Events: not LiquidationCall");
        require(log.data.length == 128, "AaveV3Events: LiquidationCall data");
        collateralAsset = _addr(log.topics[1]);
        debtAsset = _addr(log.topics[2]);
        subject = _addr(log.topics[3]);
        (debtToCover,,,) = abi.decode(log.data, (uint256, uint256, address, bool));
    }

    function _addr(bytes32 topic) private pure returns (address) {
        return address(uint160(uint256(topic)));
    }
}

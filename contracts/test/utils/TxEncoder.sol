// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EvmV1Decoder} from "@gluwa/asc-contracts/contracts/common/EvmV1Decoder.sol";
import {AaveV3Events} from "../../src/lib/AaveV3Events.sol";

/// @dev Builds prover-style `abi.encode(uint8 txType, bytes[] chunks)` transaction bytes for unit tests.
library TxEncoder {
    address internal constant POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;

    function encodeType2(uint8 status, EvmV1Decoder.LogEntryTuple[] memory logs) internal pure returns (bytes memory) {
        bytes[] memory chunks = new bytes[](3);
        chunks[0] = abi.encode(uint64(7), uint64(300_000), address(0xA11CE), false, POOL, uint256(0), bytes(""));
        EvmV1Decoder.AccessListEntryBytes32[] memory al;
        chunks[1] = abi.encode(uint64(11_155_111), uint128(1), uint128(2), al, uint8(1), bytes32(0), bytes32(0));
        chunks[2] = abi.encode(status, uint64(150_000), logs, bytes(""));
        return abi.encode(uint8(2), chunks);
    }

    function borrowLog(address emitter, address reserve, address onBehalfOf, uint256 amount)
        internal
        pure
        returns (EvmV1Decoder.LogEntryTuple memory l)
    {
        bytes32[] memory t = new bytes32[](4);
        t[0] = AaveV3Events.BORROW_SIG;
        t[1] = bytes32(uint256(uint160(reserve)));
        t[2] = bytes32(uint256(uint160(onBehalfOf)));
        t[3] = bytes32(0);
        l = EvmV1Decoder.LogEntryTuple(emitter, t, abi.encode(address(0xCAFE), amount, uint256(2), uint256(5e25)));
    }

    function repayLog(address emitter, address reserve, address user, address repayer, uint256 amount)
        internal
        pure
        returns (EvmV1Decoder.LogEntryTuple memory l)
    {
        bytes32[] memory t = new bytes32[](4);
        t[0] = AaveV3Events.REPAY_SIG;
        t[1] = bytes32(uint256(uint160(reserve)));
        t[2] = bytes32(uint256(uint160(user)));
        t[3] = bytes32(uint256(uint160(repayer)));
        l = EvmV1Decoder.LogEntryTuple(emitter, t, abi.encode(amount, false));
    }

    function liquidationLog(address emitter, address collateral, address debt, address user, uint256 debtToCover)
        internal
        pure
        returns (EvmV1Decoder.LogEntryTuple memory l)
    {
        bytes32[] memory t = new bytes32[](4);
        t[0] = AaveV3Events.LIQUIDATION_SIG;
        t[1] = bytes32(uint256(uint160(collateral)));
        t[2] = bytes32(uint256(uint160(debt)));
        t[3] = bytes32(uint256(uint160(user)));
        l = EvmV1Decoder.LogEntryTuple(emitter, t, abi.encode(debtToCover, uint256(1e18), address(0xBEEF), false));
    }

    function toLogEntry(EvmV1Decoder.LogEntryTuple memory t) internal pure returns (EvmV1Decoder.LogEntry memory) {
        return EvmV1Decoder.LogEntry(t.address_, t.topics, t.data);
    }
}

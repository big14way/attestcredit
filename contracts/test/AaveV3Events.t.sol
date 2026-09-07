// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AaveV3Events} from "../src/lib/AaveV3Events.sol";
import {TxEncoder} from "./utils/TxEncoder.sol";

contract AaveV3EventsTest is Test {
    function test_selectorsMatchCanonicalSignatures() public pure {
        assertEq(
            AaveV3Events.BORROW_SIG,
            keccak256(bytes("Borrow(address,address,address,uint256,uint8,uint256,uint16)")),
            "Borrow selector"
        );
        assertEq(
            AaveV3Events.REPAY_SIG, keccak256(bytes("Repay(address,address,address,uint256,bool)")), "Repay selector"
        );
        assertEq(
            AaveV3Events.LIQUIDATION_SIG,
            keccak256(bytes("LiquidationCall(address,address,address,uint256,uint256,address,bool)")),
            "LiquidationCall selector"
        );
    }

    function test_decodeBorrow() public pure {
        (address reserve, address subject, uint256 amount) = AaveV3Events.decodeBorrow(
            TxEncoder.toLogEntry(TxEncoder.borrowLog(TxEncoder.POOL, AaveV3Events.USDC, address(0xB0B), 250e6))
        );
        assertEq(reserve, AaveV3Events.USDC);
        assertEq(subject, address(0xB0B), "subject is onBehalfOf");
        assertEq(amount, 250e6);
    }

    function test_decodeRepay_subjectIsUserNotRepayer() public pure {
        (address reserve, address subject, uint256 amount) = AaveV3Events.decodeRepay(
            TxEncoder.toLogEntry(
                TxEncoder.repayLog(TxEncoder.POOL, AaveV3Events.DAI, address(0xB0B), address(0xD00D), 10e18)
            )
        );
        assertEq(reserve, AaveV3Events.DAI);
        assertEq(subject, address(0xB0B));
        assertEq(amount, 10e18);
    }

    function test_decodeLiquidation() public pure {
        (address col, address debt, address subject, uint256 debtToCover) = AaveV3Events.decodeLiquidation(
            TxEncoder.toLogEntry(
                TxEncoder.liquidationLog(TxEncoder.POOL, AaveV3Events.WETH, AaveV3Events.USDC, address(0xB0B), 99e6)
            )
        );
        assertEq(col, AaveV3Events.WETH);
        assertEq(debt, AaveV3Events.USDC);
        assertEq(subject, address(0xB0B));
        assertEq(debtToCover, 99e6);
    }

    function test_decodeRejectsWrongEvent() public {
        vm.expectRevert(bytes("AaveV3Events: not Borrow"));
        this.callDecodeBorrowWithRepay();
    }

    function callDecodeBorrowWithRepay() external pure {
        AaveV3Events.decodeBorrow(
            TxEncoder.toLogEntry(TxEncoder.repayLog(TxEncoder.POOL, AaveV3Events.DAI, address(1), address(2), 1))
        );
    }

    function test_usdScales() public pure {
        assertEq(AaveV3Events.usdValue6(AaveV3Events.USDC, 1_000_000), 1_000_000, "USDC 1:1");
        assertEq(AaveV3Events.usdValue6(AaveV3Events.DAI, 1e18), 1_000_000, "DAI 1:1");
        assertEq(AaveV3Events.usdValue6(AaveV3Events.WETH, 1e18), 2500e6, "WETH 2500");
        assertEq(AaveV3Events.usdValue6(AaveV3Events.WBTC, 1e8), 60_000e6, "WBTC 60000");
        assertEq(AaveV3Events.usdValue6(AaveV3Events.LINK, 1e18), 15e6, "LINK 15");
        assertEq(AaveV3Events.usdValue6(address(0xDEAD), 1e18), 0, "unknown reserve counts only");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ScoreEngine} from "../src/ScoreEngine.sol";
import {CreditLedger} from "../src/CreditLedger.sol";
import {TestUSD} from "../src/demo/TestUSD.sol";
import {TieredLender} from "../src/demo/TieredLender.sol";
import {ICreditLedger} from "../src/interfaces/ICreditLedger.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AaveV3Events} from "../src/lib/AaveV3Events.sol";

contract TieredLenderTest is Test {
    ScoreEngine engine;
    CreditLedger ledger;
    TestUSD tusd;
    TieredLender lender;
    address alice = address(0xA11CE);

    function setUp() public {
        engine = new ScoreEngine(address(this));
        ledger = new CreditLedger(address(this), engine);
        tusd = new TestUSD(address(this));
        lender = new TieredLender(address(this), ICreditLedger(address(ledger)), IERC20(address(tusd)));
        ledger.grantRole(ledger.RECORDER_ROLE(), address(this));
        ledger.grantRole(ledger.NATIVE_RECORDER_ROLE(), address(lender));
        tusd.mint(address(lender), 1_000_000e6);
        vm.deal(alice, 100 ether);
    }

    function test_bronzeTerms() public view {
        (uint16 score, uint8 tier, uint16 ltv, uint16 apr, uint256 perCtc) = lender.currentOffer(alice);
        assertEq(score, 300);
        assertEq(tier, 0);
        assertEq(ltv, 4000);
        assertEq(apr, 1800);
        assertEq(perCtc, 0.4e6);
    }

    function test_termsImproveWithTier() public {
        // 40 repays of $1000, long tenure, recent → Platinum
        for (uint256 i; i < 40; ++i) {
            ledger.recordFact(
                alice, 2, AaveV3Events.USDC, 1000e6, 1000e6, uint64(1_000_000 + i), keccak256(abi.encode(i))
            );
        }
        ledger.recordFact(alice, 1, AaveV3Events.USDC, 1000e6, 1000e6, 1_000_000, keccak256("b"));
        (, uint8 tier, uint16 ltv, uint16 apr,) = lender.currentOffer(alice);
        assertEq(tier, 3);
        assertEq(ltv, 8000);
        assertEq(apr, 500);
    }

    function test_borrowRespectsLtvAndRepayRecordsNativeFact() public {
        vm.startPrank(alice);
        // Bronze: 10 CTC → max 4 TUSD
        vm.expectRevert(abi.encodeWithSelector(TieredLender.ExceedsLtv.selector, 5e6, 4e6));
        lender.borrow{value: 10 ether}(5e6);
        lender.borrow{value: 10 ether}(4e6);
        assertEq(tusd.balanceOf(alice), 4e6);

        vm.warp(block.timestamp + 365 days);
        uint256 owed = lender.amountOwed(alice); // 4 + 18% = 4.72
        assertEq(owed, 4.72e6);
        vm.stopPrank();
        tusd.mint(alice, 1e6); // interest money
        vm.startPrank(alice);
        tusd.approve(address(lender), owed);
        uint256 balBefore = alice.balance;
        lender.repay();
        assertEq(alice.balance, balBefore + 10 ether);
        vm.stopPrank();

        assertEq(ledger.getProfile(alice).nativeRepayCount, 1);
        assertEq(ledger.factCount(alice), 1);
        (uint16 s,) = ledger.getScore(alice);
        assertEq(s, 305);
    }

    function test_markDefault() public {
        vm.prank(alice);
        lender.borrow{value: 1 ether}(0.1e6);
        vm.prank(alice);
        vm.expectRevert();
        lender.markDefault(alice);
        lender.markDefault(alice);
        assertEq(ledger.getProfile(alice).nativeDefaultCount, 1);
        assertEq(address(lender).balance, 1 ether);
    }
}

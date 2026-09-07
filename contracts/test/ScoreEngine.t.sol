// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ScoreEngine} from "../src/ScoreEngine.sol";
import {CreditProfile} from "../src/interfaces/ICreditOracle.sol";

contract ScoreEngineTest is Test {
    ScoreEngine engine;
    uint64 constant NOW = 12_000_000;

    function setUp() public {
        engine = new ScoreEngine(address(this));
    }

    function _empty() internal pure returns (CreditProfile memory p) {}

    function test_emptyProfileIsBase() public view {
        (uint16 s, uint8 t) = engine.score(_empty(), NOW);
        assertEq(s, 300);
        assertEq(t, 0);
    }

    function test_documentedExample() public view {
        // 12 repays, $5,000 repaid vs $5,000 borrowed, 10 weeks tenure, repaid 2 days ago, 2 native repays
        CreditProfile memory p;
        p.borrowCount = 4;
        p.repayCount = 12;
        p.borrowedVolumeUsd6 = 5000e6;
        p.repaidVolumeUsd6 = 5000e6;
        p.firstActivityBlock = NOW - 10 * 50_400;
        p.lastRepayBlock = NOW - 14_400;
        p.nativeRepayCount = 2;
        ScoreEngine.Breakdown memory b = engine.breakdown(p, NOW);
        assertEq(b.repayPts, 72); // 12*6
        assertEq(b.volumePts, 96); // bitlen(5000)=13 → capped 12 → *8
        assertEq(b.ratioPts, 80);
        assertEq(b.tenurePts, 40); // 10 units *4
        assertEq(b.recencyPts, 40);
        assertEq(b.nativePts, 10);
        assertEq(b.score, 300 + 72 + 96 + 80 + 40 + 40 + 10); // 638
        assertEq(b.tier, 1); // Silver
    }

    function test_capsAndClamp() public view {
        CreditProfile memory p;
        p.repayCount = 1000;
        p.borrowedVolumeUsd6 = 1;
        p.repaidVolumeUsd6 = type(uint128).max;
        p.firstActivityBlock = 1;
        p.lastRepayBlock = NOW;
        p.nativeRepayCount = 1000;
        ScoreEngine.Breakdown memory b = engine.breakdown(p, NOW);
        assertEq(b.repayPts, 240);
        assertEq(b.volumePts, 96);
        assertEq(b.ratioPts, 80);
        assertEq(b.tenurePts, 96);
        assertEq(b.nativePts, 50);
        assertEq(b.score, 850, "clamped to max");
        assertEq(b.tier, 3);
    }

    function test_penaltiesFloorAt300() public view {
        CreditProfile memory p;
        p.liquidationCount = 3;
        p.lastLiquidationBlock = NOW - 10;
        p.nativeDefaultCount = 2;
        ScoreEngine.Breakdown memory b = engine.breakdown(p, NOW);
        assertEq(b.liquidationPenalty, 90 + 45 * 2 + 60);
        assertEq(b.defaultPenalty, 240);
        assertEq(b.score, 300);
    }

    function test_tierBoundaries() public view {
        assertEq(engine.tierOf(499), 0);
        assertEq(engine.tierOf(500), 1);
        assertEq(engine.tierOf(649), 1);
        assertEq(engine.tierOf(650), 2);
        assertEq(engine.tierOf(749), 2);
        assertEq(engine.tierOf(750), 3);
        assertEq(engine.tierOf(850), 3);
    }

    function test_recencyDecay() public view {
        CreditProfile memory p;
        p.lastRepayBlock = NOW - 216_000;
        assertEq(engine.breakdown(p, NOW).recencyPts, 40);
        p.lastRepayBlock = NOW - 216_001;
        assertEq(engine.breakdown(p, NOW).recencyPts, 20);
        p.lastRepayBlock = NOW - 648_001;
        assertEq(engine.breakdown(p, NOW).recencyPts, 0);
    }

    /// forge-config: default.fuzz.runs = 512
    function testFuzz_moreRepaysNeverLowerScore(
        uint32 repays,
        uint128 borrowed,
        uint128 repaid,
        uint64 first,
        uint64 lastRepay,
        uint32 liq
    ) public view {
        CreditProfile memory p;
        p.repayCount = repays;
        p.borrowedVolumeUsd6 = borrowed;
        p.repaidVolumeUsd6 = repaid;
        p.firstActivityBlock = first;
        p.lastRepayBlock = lastRepay;
        p.liquidationCount = liq % 5;
        uint64 nowB = type(uint64).max / 2;
        (uint16 before,) = engine.score(p, nowB);
        // one more repay, of some volume, at `now`
        if (p.repayCount < type(uint32).max) p.repayCount += 1;
        if (p.repaidVolumeUsd6 < type(uint128).max - 1e9) p.repaidVolumeUsd6 += 1e9;
        p.lastRepayBlock = nowB;
        (uint16 afterS,) = engine.score(p, nowB);
        assertGe(afterS, before, "repay lowered score");
    }

    /// forge-config: default.fuzz.runs = 512
    function testFuzz_liquidationNeverRaisesScore(uint32 repays, uint128 repaid, uint32 liq, uint64 lastLiq)
        public
        view
    {
        CreditProfile memory p;
        p.repayCount = repays;
        p.repaidVolumeUsd6 = repaid;
        p.borrowedVolumeUsd6 = repaid;
        p.liquidationCount = liq % 1000;
        p.lastLiquidationBlock = lastLiq % NOW;
        (uint16 before,) = engine.score(p, NOW);
        p.liquidationCount += 1;
        p.lastLiquidationBlock = NOW;
        (uint16 afterS,) = engine.score(p, NOW);
        assertLe(afterS, before, "liquidation raised score");
    }

    function test_onlyOwnerSetsParams() public {
        ScoreEngine.Params memory p = engine.defaultParams();
        p.base = 350;
        vm.prank(address(0xBAD));
        vm.expectRevert();
        engine.setParams(p);
        engine.setParams(p);
        (uint16 s,) = engine.score(_empty(), NOW);
        assertEq(s, 350);
    }
}

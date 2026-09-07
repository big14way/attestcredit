// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CreditProfile} from "./interfaces/ICreditOracle.sol";

/// @title ScoreEngine
/// @notice Deterministic, integer-only credit scoring over a CreditProfile. Parameters are owner-tunable;
///         the defaults below are the ones documented in docs/SCORING.md. No off-chain input of any kind.
contract ScoreEngine is Ownable {
    struct Params {
        uint16 base; // 300
        uint8 repayPtsEach; // 6
        uint8 repayCap; // 40   → max 240
        uint8 volumePtsEach; // 8
        uint8 volumeCap; // 12   → max 96 (log2ish = bit length of floor(usd))
        uint8 ratioMax; // 80   repaid/borrowed clamped [0,1] → 0..80
        uint32 tenureUnitBlocks; // 50_400 ≈ 1 week of Sepolia blocks
        uint8 tenureCap; // 24
        uint8 tenurePtsEach; // 4    → max 96
        uint32 recencyFullBlocks; // 216_000 ≈ 30 d → 40 pts
        uint32 recencyHalfBlocks; // 648_000 ≈ 90 d → 20 pts
        uint8 recencyFullPts; // 40
        uint8 recencyHalfPts; // 20
        uint8 nativePtsEach; // 5
        uint8 nativeCap; // 10   → max 50
        uint16 liqFirstPenalty; // 90
        uint16 liqExtraPenalty; // 45 each additional
        uint16 liqRecentPenalty; // 60 if last liquidation within liqRecentBlocks
        uint32 liqRecentBlocks; // 648_000
        uint16 defaultPenalty; // 120 per native default
        uint16 minScore; // 300
        uint16 maxScore; // 850
        uint16 silverMin; // 500
        uint16 goldMin; // 650
        uint16 platinumMin; // 750
    }

    /// @notice Per-component view of a score, for the "your score is 712 because…" UI.
    struct Breakdown {
        uint16 base;
        uint16 repayPts;
        uint16 volumePts;
        uint16 ratioPts;
        uint16 tenurePts;
        uint16 recencyPts;
        uint16 nativePts;
        uint16 liquidationPenalty;
        uint16 defaultPenalty;
        uint16 score;
        uint8 tier;
    }

    uint8 public constant TIER_BRONZE = 0;
    uint8 public constant TIER_SILVER = 1;
    uint8 public constant TIER_GOLD = 2;
    uint8 public constant TIER_PLATINUM = 3;

    Params public params;

    event ParamsUpdated(Params params);

    constructor(address owner_) Ownable(owner_) {
        params = defaultParams();
        emit ParamsUpdated(params);
    }

    function defaultParams() public pure returns (Params memory p) {
        p = Params({
            base: 300,
            repayPtsEach: 6,
            repayCap: 40,
            volumePtsEach: 8,
            volumeCap: 12,
            ratioMax: 80,
            tenureUnitBlocks: 50_400,
            tenureCap: 24,
            tenurePtsEach: 4,
            recencyFullBlocks: 216_000,
            recencyHalfBlocks: 648_000,
            recencyFullPts: 40,
            recencyHalfPts: 20,
            nativePtsEach: 5,
            nativeCap: 10,
            liqFirstPenalty: 90,
            liqExtraPenalty: 45,
            liqRecentPenalty: 60,
            liqRecentBlocks: 648_000,
            defaultPenalty: 120,
            minScore: 300,
            maxScore: 850,
            silverMin: 500,
            goldMin: 650,
            platinumMin: 750
        });
    }

    function setParams(Params calldata p) external onlyOwner {
        require(p.minScore < p.maxScore, "ScoreEngine: bounds");
        require(p.silverMin < p.goldMin && p.goldMin < p.platinumMin, "ScoreEngine: tiers");
        params = p;
        emit ParamsUpdated(p);
    }

    /// @param nowBlock the current Sepolia height used for tenure / recency (ledger supplies it)
    function score(CreditProfile memory p, uint64 nowBlock) external view returns (uint16, uint8) {
        Breakdown memory b = breakdown(p, nowBlock);
        return (b.score, b.tier);
    }

    function tierOf(uint16 s) public view returns (uint8) {
        Params memory P = params;
        if (s >= P.platinumMin) return TIER_PLATINUM;
        if (s >= P.goldMin) return TIER_GOLD;
        if (s >= P.silverMin) return TIER_SILVER;
        return TIER_BRONZE;
    }

    function breakdown(CreditProfile memory p, uint64 nowBlock) public view returns (Breakdown memory b) {
        Params memory P = params;
        b.base = P.base;

        // repay_pts = min(repayCount, cap) * each
        b.repayPts = uint16(_min(p.repayCount, P.repayCap) * P.repayPtsEach);

        // volume_pts = min(bitlen(floor(repaidUsd)), cap) * each
        b.volumePts = uint16(_min(_bitLength(p.repaidVolumeUsd6 / 1e6), P.volumeCap) * P.volumePtsEach);

        // ratio_pts = clamp(repaid / borrowed, 0, 1) * ratioMax
        uint256 borrowed = p.borrowedVolumeUsd6 == 0 ? 1 : p.borrowedVolumeUsd6;
        uint256 ratio = (uint256(p.repaidVolumeUsd6) * P.ratioMax) / borrowed;
        b.ratioPts = uint16(_min(ratio, P.ratioMax));

        // tenure_pts = min(blocksSinceFirst / unit, cap) * each
        if (p.firstActivityBlock != 0 && nowBlock > p.firstActivityBlock) {
            uint256 units = (nowBlock - p.firstActivityBlock) / P.tenureUnitBlocks;
            b.tenurePts = uint16(_min(units, P.tenureCap) * P.tenurePtsEach);
        }

        // recency_pts
        if (p.lastRepayBlock != 0 && nowBlock >= p.lastRepayBlock) {
            uint256 age = nowBlock - p.lastRepayBlock;
            if (age <= P.recencyFullBlocks) b.recencyPts = P.recencyFullPts;
            else if (age <= P.recencyHalfBlocks) b.recencyPts = P.recencyHalfPts;
        }

        // native_pts
        b.nativePts = uint16(_min(p.nativeRepayCount, P.nativeCap) * P.nativePtsEach);

        // liquidation_penalty = first + extra * (n-1) + recent
        if (p.liquidationCount > 0) {
            uint256 pen = uint256(P.liqFirstPenalty) + uint256(P.liqExtraPenalty) * (p.liquidationCount - 1);
            if (p.lastLiquidationBlock != 0 && nowBlock >= p.lastLiquidationBlock) {
                if (nowBlock - p.lastLiquidationBlock <= P.liqRecentBlocks) pen += P.liqRecentPenalty;
            }
            b.liquidationPenalty = uint16(_min(pen, type(uint16).max));
        }

        // default_penalty
        b.defaultPenalty = uint16(_min(uint256(p.nativeDefaultCount) * P.defaultPenalty, type(uint16).max));

        int256 raw = int256(uint256(b.base)) + int256(uint256(b.repayPts)) + int256(uint256(b.volumePts))
            + int256(uint256(b.ratioPts)) + int256(uint256(b.tenurePts)) + int256(uint256(b.recencyPts))
            + int256(uint256(b.nativePts)) - int256(uint256(b.liquidationPenalty)) - int256(uint256(b.defaultPenalty));

        if (raw < int256(uint256(P.minScore))) raw = int256(uint256(P.minScore));
        if (raw > int256(uint256(P.maxScore))) raw = int256(uint256(P.maxScore));
        b.score = uint16(uint256(raw));
        b.tier = tierOf(b.score);
    }

    function _bitLength(uint256 x) private pure returns (uint256 n) {
        while (x > 0) {
            x >>= 1;
            n++;
        }
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}

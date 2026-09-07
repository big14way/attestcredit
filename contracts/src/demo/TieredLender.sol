// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICreditOracle} from "../interfaces/ICreditOracle.sol";
import {ICreditLedger} from "../interfaces/ICreditLedger.sol";

/// @title TieredLender
/// @notice Demo consumer of ICreditOracle: lends TestUSD against native CTC with LTV/APR set by credit tier.
///         Proves the oracle is consumable and that the score moves terms. Not a product.
/// @dev    Demo pricing: 1 CTC = 1 TUSD (testnet has no price feed). Bronze 40%/18%, Silver 55%/12%,
///         Gold 70%/8%, Platinum 80%/5%.
contract TieredLender is Ownable {
    using SafeERC20 for IERC20;

    struct Terms {
        uint16 ltvBps;
        uint16 aprBps;
    }

    struct Loan {
        uint256 collateralWei;
        uint256 principal; // TUSD, 6 dp
        uint16 aprBps;
        uint64 startedAt;
    }

    ICreditOracle public immutable ORACLE;
    ICreditLedger public immutable LEDGER;
    IERC20 public immutable TUSD;
    uint256 public constant CTC_PRICE_USD6 = 1e6; // demo: 1 CTC = $1

    mapping(address => Loan) public loans;

    event Borrowed(
        address indexed borrower, uint256 collateralWei, uint256 principal, uint8 tier, uint16 ltvBps, uint16 aprBps
    );
    event Repaid(address indexed borrower, uint256 amountPaid, uint256 collateralReturned);
    event Defaulted(address indexed borrower, uint256 collateralSeized);

    error ActiveLoan();
    error NoLoan();
    error ExceedsLtv(uint256 requested, uint256 max);
    error ZeroAmount();

    constructor(address owner_, ICreditLedger ledger, IERC20 tusd) Ownable(owner_) {
        ORACLE = ICreditOracle(address(ledger));
        LEDGER = ledger;
        TUSD = tusd;
    }

    function termsForTier(uint8 tier) public pure returns (Terms memory) {
        if (tier >= 3) return Terms(8000, 500);
        if (tier == 2) return Terms(7000, 800);
        if (tier == 1) return Terms(5500, 1200);
        return Terms(4000, 1800);
    }

    /// @notice Live offer for `user`: score, tier, LTV/APR and the max TUSD borrowable per 1 CTC.
    function currentOffer(address user)
        external
        view
        returns (uint16 score, uint8 tier, uint16 ltvBps, uint16 aprBps, uint256 maxPerCtcUsd6)
    {
        (score, tier) = ORACLE.getScore(user);
        Terms memory t = termsForTier(tier);
        return (score, tier, t.ltvBps, t.aprBps, (CTC_PRICE_USD6 * t.ltvBps) / 10_000);
    }

    function maxBorrow(uint256 collateralWei, uint16 ltvBps) public pure returns (uint256) {
        return (collateralWei * CTC_PRICE_USD6 * ltvBps) / 1e18 / 10_000;
    }

    /// @notice Deposit CTC (msg.value) and borrow `amount` TUSD at the terms of the caller's current tier.
    function borrow(uint256 amount) external payable {
        if (amount == 0 || msg.value == 0) revert ZeroAmount();
        if (loans[msg.sender].principal != 0) revert ActiveLoan();
        (, uint8 tier) = ORACLE.getScore(msg.sender); // read live at borrow time
        Terms memory t = termsForTier(tier);
        uint256 max = maxBorrow(msg.value, t.ltvBps);
        if (amount > max) revert ExceedsLtv(amount, max);

        loans[msg.sender] = Loan(msg.value, amount, t.aprBps, uint64(block.timestamp));
        TUSD.safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, msg.value, amount, tier, t.ltvBps, t.aprBps);
    }

    function amountOwed(address borrower) public view returns (uint256) {
        Loan memory l = loans[borrower];
        if (l.principal == 0) return 0;
        uint256 interest = (l.principal * l.aprBps * (block.timestamp - l.startedAt)) / 10_000 / 365 days;
        return l.principal + interest;
    }

    /// @notice Repay principal + accrued interest, get collateral back, and record a native repayment in the
    ///         ledger — a Creditcoin-native credit fact, no proof needed.
    function repay() external {
        Loan memory l = loans[msg.sender];
        if (l.principal == 0) revert NoLoan();
        uint256 owed = amountOwed(msg.sender);
        delete loans[msg.sender];
        TUSD.safeTransferFrom(msg.sender, address(this), owed);
        LEDGER.recordNativeRepay(msg.sender);
        (bool ok,) = msg.sender.call{value: l.collateralWei}("");
        require(ok, "TieredLender: refund failed");
        emit Repaid(msg.sender, owed, l.collateralWei);
    }

    /// @notice Demo-only: owner marks a loan defaulted, seizes collateral, records a native default.
    function markDefault(address borrower) external onlyOwner {
        Loan memory l = loans[borrower];
        if (l.principal == 0) revert NoLoan();
        delete loans[borrower];
        LEDGER.recordNativeDefault(borrower);
        emit Defaulted(borrower, l.collateralWei);
    }

    function withdraw(address to, uint256 tusdAmount, uint256 ctcWei) external onlyOwner {
        if (tusdAmount > 0) TUSD.safeTransfer(to, tusdAmount);
        if (ctcWei > 0) {
            (bool ok,) = to.call{value: ctcWei}("");
            require(ok, "TieredLender: withdraw failed");
        }
    }

    receive() external payable {}
}

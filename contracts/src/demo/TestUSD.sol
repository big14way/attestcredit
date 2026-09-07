// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TestUSD
/// @notice 6-decimal test stablecoin lent by the TieredLender demo. Owner-mintable only.
contract TestUSD is ERC20, Ownable {
    constructor(address owner_) ERC20("AttestCredit Test USD", "TUSD") Ownable(owner_) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

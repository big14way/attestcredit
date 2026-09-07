// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ScoreEngine} from "../src/ScoreEngine.sol";
import {CreditLedger} from "../src/CreditLedger.sol";
import {CreditBureauASC} from "../src/CreditBureauASC.sol";
import {CreditPassport} from "../src/CreditPassport.sol";
import {TestUSD} from "../src/demo/TestUSD.sol";
import {TieredLender} from "../src/demo/TieredLender.sol";
import {ICreditLedger} from "../src/interfaces/ICreditLedger.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys the full AttestCredit stack to Creditcoin CC3 testnet and writes deployments/cc3-testnet.json.
///         Order: ScoreEngine → CreditLedger → CreditBureauASC → CreditPassport → TestUSD → TieredLender, then roles.
/// @dev    EvmV1Decoder is an internal-function library, so it is inlined into CreditBureauASC at compile time; the
///         EVM_V1_DECODER_LIBRARY_ADDRESS from .env is recorded for reference only (see docs/DEVIATIONS.md).
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address decoderLib = vm.envOr("EVM_V1_DECODER_LIBRARY_ADDRESS", address(0));

        vm.startBroadcast(pk);

        ScoreEngine engine = new ScoreEngine(deployer);
        CreditLedger ledger = new CreditLedger(deployer, engine);
        CreditBureauASC bureau = new CreditBureauASC(ICreditLedger(address(ledger)));
        CreditPassport passport = new CreditPassport(ledger);
        TestUSD tusd = new TestUSD(deployer);
        TieredLender lender = new TieredLender(deployer, ICreditLedger(address(ledger)), IERC20(address(tusd)));

        ledger.grantRole(ledger.RECORDER_ROLE(), address(bureau));
        ledger.grantRole(ledger.NATIVE_RECORDER_ROLE(), address(lender));
        tusd.mint(address(lender), 1_000_000e6); // demo liquidity

        vm.stopBroadcast();

        string memory j = "deploy";
        vm.serializeUint(j, "chainId", block.chainid);
        vm.serializeString(j, "network", "cc3-testnet");
        vm.serializeUint(j, "deployedAtTimestamp", block.timestamp);
        vm.serializeAddress(j, "deployer", deployer);
        vm.serializeAddress(j, "evmV1Decoder", decoderLib);
        vm.serializeAddress(j, "scoreEngine", address(engine));
        vm.serializeAddress(j, "creditLedger", address(ledger));
        vm.serializeAddress(j, "creditBureauASC", address(bureau));
        vm.serializeAddress(j, "creditPassport", address(passport));
        vm.serializeAddress(j, "testUSD", address(tusd));
        string memory out = vm.serializeAddress(j, "tieredLender", address(lender));
        vm.writeJson(out, "../deployments/cc3-testnet.json");

        console.log("ScoreEngine     ", address(engine));
        console.log("CreditLedger    ", address(ledger));
        console.log("CreditBureauASC ", address(bureau));
        console.log("CreditPassport  ", address(passport));
        console.log("TestUSD         ", address(tusd));
        console.log("TieredLender    ", address(lender));
    }
}

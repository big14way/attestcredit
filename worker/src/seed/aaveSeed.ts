import { ethers } from 'ethers';
import { AAVE, log, sepoliaWallet } from '../config.js';

// Sepolia reserve state (checked 2026-09-07): DAI/USDC/USDT are over their supply caps (Aave error 51), so the
// demo supplies LINK (no cap, 70% LTV) and borrows USDC, falling back to USDT if USDC liquidity is exhausted.
const LINK = '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5';
const USDT = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0';

const FAUCET_ABI = ['function mint(address token, address to, uint256 amount) returns (uint256)'];
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
];
const POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
];

export interface SeedStep {
  step: string;
  txHash: string;
  block: number;
}

/**
 * Creates REAL Aave V3 history on Ethereum Sepolia for the demo wallet:
 *   faucet-mint LINK + USDC → supply LINK as collateral → borrow USDC (variable) → repay USDC in two instalments
 *   → second borrow/repay cycle. Every step is a real Pool transaction that the bureau can later prove.
 * Needs Sepolia ETH in the wallet (public faucets: sepoliafaucet.com, faucet.quicknode.com/ethereum/sepolia).
 */
export async function seed(privateKey?: string, say: (m: string) => void = (m) => log(m)): Promise<SeedStep[]> {
  const w = sepoliaWallet(privateKey);
  const faucet = new ethers.Contract(AAVE.FAUCET, FAUCET_ABI, w);
  const usdc = new ethers.Contract(AAVE.USDC, ERC20_ABI, w);
  const usdt = new ethers.Contract(USDT, ERC20_ABI, w);
  const link = new ethers.Contract(LINK, ERC20_ABI, w);
  const pool = new ethers.Contract(AAVE.POOL, POOL_ABI, w);
  const steps: SeedStep[] = [];
  const bal = await w.provider!.getBalance(w.address);
  say(`seed wallet ${w.address}, Sepolia ETH ${ethers.formatEther(bal)}`);
  if (bal < ethers.parseEther('0.02')) throw new Error('need ≥0.02 Sepolia ETH for gas');

  // Sepolia public RPCs occasionally mine a tx that reverts on-chain (state raced with the previous step);
  // retry once after a block. A reverted Aave tx is harmless and is itself a real "status 0" case for the bureau.
  async function run(step: string, send: () => Promise<ethers.ContractTransactionResponse>, attempt = 1): Promise<ethers.TransactionReceipt> {
    const tx = await send();
    say(`${step}: ${tx.hash}`);
    let r: ethers.TransactionReceipt | null = null;
    try {
      r = await tx.wait();
    } catch (e: any) {
      r = e.receipt ?? null; // ethers throws CallException on status 0
    }
    if (!r || r.status !== 1) {
      if (attempt < 2) {
        say(`${step} reverted on-chain (${tx.hash}); retrying once`);
        await new Promise((res) => setTimeout(res, 15_000));
        return run(step, send, attempt + 1);
      }
      throw new Error(`${step} failed: ${tx.hash}`);
    }
    steps.push({ step, txHash: tx.hash, block: r.blockNumber });
    return r;
  }

  // Sepolia public RPCs under-estimate gas for Aave repay-max (interest accrual path): 0xe99fd5fd… ran out of gas at
  // 182,856/187,687. Gas is free on testnet, so every Pool call gets a fixed generous limit.
  const G = { gasLimit: 900_000 };
  const debtOf = async () => (await pool.getUserAccountData(w.address))[1] as bigint; // base units (8 dp)

  const LINK_AMT = ethers.parseUnits('2000', 18); // faucet cap is 10,000 per mint
  const STABLE_AMT = ethers.parseUnits('2000', 6);
  const BORROW_1 = ethers.parseUnits('400', 6);
  const BORROW_2 = ethers.parseUnits('250', 6);

  const aLink = new ethers.Contract((await new ethers.Contract(AAVE.POOL, ['function getReserveData(address) view returns (tuple(uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address aTokenAddress,address,address,address,uint128,uint128,uint128))'], w).getReserveData(LINK)).aTokenAddress, ERC20_ABI, w);
  if ((await aLink.balanceOf(w.address)) < LINK_AMT) {
    if ((await link.balanceOf(w.address)) < LINK_AMT) await run('faucet mint LINK', () => faucet.mint(LINK, w.address, LINK_AMT, G));
    if ((await link.allowance(w.address, AAVE.POOL)) < LINK_AMT) await run('approve LINK', () => link.approve(AAVE.POOL, ethers.MaxUint256, G));
    await run('supply LINK collateral', () => pool.supply(LINK, LINK_AMT, w.address, 0, G));
  } else say('LINK collateral already supplied');

  // pick the borrow asset: USDC first, USDT if the pool has no USDC liquidity left
  let asset: string = AAVE.USDC;
  let stable = usdc;
  try {
    await pool.borrow.staticCall(asset, BORROW_1, 2, 0, w.address);
  } catch (e: any) {
    if ((await debtOf()) === 0n) {
      say(`USDC borrow would revert (${e.shortMessage ?? e.message}); falling back to USDT`);
      asset = USDT;
      stable = usdt;
    }
  }
  if ((await stable.balanceOf(w.address)) < STABLE_AMT) await run('faucet mint stable', () => faucet.mint(asset, w.address, STABLE_AMT, G));
  if ((await stable.allowance(w.address, AAVE.POOL)) < STABLE_AMT) await run('approve stable', () => stable.approve(AAVE.POOL, ethers.MaxUint256, G));

  const cycle = async (n: number, amount: bigint, partial: bigint) => {
    if ((await debtOf()) === 0n) await run(`cycle ${n}: borrow ${ethers.formatUnits(amount, 6)} (variable)`, () => pool.borrow(asset, amount, 2, 0, w.address, G));
    else say(`cycle ${n}: open debt found, skipping borrow`);
    await run(`cycle ${n}: repay ${ethers.formatUnits(partial, 6)}`, () => pool.repay(asset, partial, 2, w.address, G));
    await run(`cycle ${n}: repay remaining`, () => pool.repay(asset, ethers.MaxUint256, 2, w.address, G));
  };
  await cycle(1, BORROW_1, ethers.parseUnits('150', 6));
  await cycle(2, BORROW_2, ethers.parseUnits('100', 6));

  const acct = await pool.getUserAccountData(w.address);
  say(`done: ${steps.length} Sepolia txs; remaining debt (base units) ${acct[1]}`);
  say(JSON.stringify(steps, null, 2));
  return steps;
}

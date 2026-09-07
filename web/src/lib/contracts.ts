import { createPublicClient, http, type Address } from 'viem';
import deployments from '../../../deployments/cc3-testnet.json';
import { cc3Testnet, sepolia } from './chains';
import { BUREAU_ABI } from '@/abi/bureau';
import { LEDGER_ABI } from '@/abi/ledger';
import { PASSPORT_ABI } from '@/abi/passport';
import { LENDER_ABI } from '@/abi/lender';
import { TUSD_ABI } from '@/abi/tusd';

export const addresses = {
  scoreEngine: deployments.scoreEngine as Address,
  ledger: deployments.creditLedger as Address,
  bureau: deployments.creditBureauASC as Address,
  passport: deployments.creditPassport as Address,
  tusd: deployments.testUSD as Address,
  lender: deployments.tieredLender as Address,
  deployer: deployments.deployer as Address,
};

export const isDeployed = addresses.ledger !== '0x0000000000000000000000000000000000000000';

export const contracts = {
  ledger: { address: addresses.ledger, abi: LEDGER_ABI },
  bureau: { address: addresses.bureau, abi: BUREAU_ABI },
  passport: { address: addresses.passport, abi: PASSPORT_ABI },
  lender: { address: addresses.lender, abi: LENDER_ABI },
  tusd: { address: addresses.tusd, abi: TUSD_ABI },
} as const;

export const cc3Client = createPublicClient({ chain: cc3Testnet, transport: http(cc3Testnet.rpcUrls.default.http[0]) });
export const sepoliaClient = createPublicClient({ chain: sepolia, transport: http(sepolia.rpcUrls.default.http[0]) });

export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787';

export const FACT_TYPE: Record<number, string> = {
  1: 'Borrow',
  2: 'Repay',
  3: 'Liquidation',
  4: 'Native repay',
  5: 'Native default',
};

export const RESERVES: Record<string, { symbol: string; decimals: number }> = {
  '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8': { symbol: 'USDC', decimals: 6 },
  '0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357': { symbol: 'DAI', decimals: 18 },
  '0xc558dbdd856501fcd9aaf1e62eae57a9f0629a3c': { symbol: 'WETH', decimals: 18 },
  '0x29f2d40b0605204364af54ec677bd022da425d03': { symbol: 'WBTC', decimals: 8 },
  '0xf8fb3713d459d7c1018bd0a49d19b4c44290ebe5': { symbol: 'LINK', decimals: 18 },
  '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0': { symbol: 'USDT', decimals: 6 },
  '0xc4bf5cbdabe595361438f8c6a187bdc330539c60': { symbol: 'GHO', decimals: 18 },
};

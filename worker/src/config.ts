import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(REPO_ROOT, '.env') });

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing env ${name} (see .env.example)`);
  return v;
}

export const AAVE = {
  POOL: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
  FAUCET: '0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D',
  USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
} as const;

// keccak256 of the canonical Aave V3 IPool event signatures (asserted in contracts/test/AaveV3Events.t.sol)
export const EVENT_SIGS = {
  Borrow: ethers.id('Borrow(address,address,address,uint256,uint8,uint256,uint16)'),
  Repay: ethers.id('Repay(address,address,address,uint256,bool)'),
  LiquidationCall: ethers.id('LiquidationCall(address,address,address,uint256,uint256,address,bool)'),
} as const;

export type EventName = keyof typeof EVENT_SIGS;

export interface Deployments {
  chainId: number;
  network: string;
  deployedAt?: string;
  deployer?: string;
  evmV1Decoder?: string;
  scoreEngine: string;
  creditLedger: string;
  creditBureauASC: string;
  creditPassport: string;
  testUSD: string;
  tieredLender: string;
  txs?: Record<string, string>;
}

export function loadDeployments(): Deployments | null {
  const p = path.join(REPO_ROOT, 'deployments', 'cc3-testnet.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Deployments;
}

export const config = {
  cc3RpcUrl: env('CC3_RPC_URL', 'https://rpc.cc3-testnet.creditcoin.network'),
  proverUrl: env('PROVER_URL', 'https://prover.cc3-testnet.creditcoin.network'),
  sepoliaRpcUrl: env('SEPOLIA_RPC_URL', 'https://ethereum-sepolia-rpc.publicnode.com'),
  sepoliaChainKey: Number(env('SEPOLIA_CHAIN_KEY', '1')),
  cc3ExplorerUrl: env('CC3_EXPLORER_URL', 'https://creditcoin-testnet.blockscout.com'),
  privateKey: (): string => env('PRIVATE_KEY'),
  bureauAddress: (): string => process.env.CREDIT_BUREAU_ASC_ADDRESS || loadDeployments()?.creditBureauASC || '',
  ledgerAddress: (): string => process.env.CREDIT_LEDGER_ADDRESS || loadDeployments()?.creditLedger || '',
  workerPort: Number(env('WORKER_PORT', '8787')),
  webOrigin: env('WEB_ORIGIN', 'http://localhost:3000'),
  fixturesDir: path.join(REPO_ROOT, 'contracts', 'test', 'fixtures'),
};

export const sepolia = new ethers.JsonRpcProvider(config.sepoliaRpcUrl, 11155111, { staticNetwork: true });
export const cc3 = new ethers.JsonRpcProvider(config.cc3RpcUrl, 102031, { staticNetwork: true });

export function cc3Wallet(): ethers.Wallet {
  return new ethers.Wallet(config.privateKey(), cc3);
}
export function sepoliaWallet(pk?: string): ethers.Wallet {
  return new ethers.Wallet(pk ?? config.privateKey(), sepolia);
}

export const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

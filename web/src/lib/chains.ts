import { defineChain } from 'viem';
import { sepolia as sepoliaBase } from 'viem/chains';

export const cc3Testnet = defineChain({
  id: 102031,
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://creditcoin-testnet.blockscout.com' } },
  testnet: true,
});

export const sepolia = {
  ...sepoliaBase,
  rpcUrls: { default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] } },
};

export const SEPOLIA_CHAIN_KEY = 1; // Attestcoin chain key for Sepolia on CC3 (not the EVM chainId)
export const AAVE_POOL = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' as const;
export const PROVER_URL = 'https://prover.cc3-testnet.creditcoin.network';

export const explorer = {
  cc3Tx: (h: string) => `${cc3Testnet.blockExplorers.default.url}/tx/${h}`,
  cc3Address: (a: string) => `${cc3Testnet.blockExplorers.default.url}/address/${a}`,
  cc3Token: (a: string, id: string) => `${cc3Testnet.blockExplorers.default.url}/token/${a}/instance/${id}`,
  sepoliaTx: (h: string) => `https://sepolia.etherscan.io/tx/${h}`,
  sepoliaAddress: (a: string) => `https://sepolia.etherscan.io/address/${a}`,
  sepoliaBlock: (n: number | bigint) => `https://sepolia.etherscan.io/block/${n}`,
  aaveApp: 'https://app.aave.com/?marketName=proto_sepolia_v3',
};

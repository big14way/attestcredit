'use client';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { cc3Testnet, sepolia } from './chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'AttestCredit',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'attestcredit-local',
  chains: [cc3Testnet, sepolia],
  transports: {
    [cc3Testnet.id]: http(cc3Testnet.rpcUrls.default.http[0]),
    [sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
  },
  ssr: true,
});

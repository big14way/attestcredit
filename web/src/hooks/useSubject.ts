'use client';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { isAddress, type Address } from 'viem';

/**
 * The address the app screens are about: the connected wallet, or `?as=0x…` for a read only view of any subject.
 * Imports are permissionless (the worker signs), so "view as" can still trigger one; wallet actions stay disabled.
 */
export function useSubject(): { subject?: Address; viewingAs: boolean; isConnected: boolean } {
  const { address, isConnected } = useAccount();
  const params = useSearchParams();
  const as = params.get('as');
  if (!address && as && isAddress(as)) return { subject: as as Address, viewingAs: true, isConnected: false };
  return { subject: address, viewingAs: false, isConnected };
}

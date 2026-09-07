'use client';
import { useState } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, formatUnits, parseEther, parseUnits } from 'viem';
import { useProfile } from '@/hooks/useProfile';
import { Button, Card, Empty, HashLink } from '@/components/ui';
import { contracts, addresses, isDeployed } from '@/lib/contracts';
import { explorer } from '@/lib/chains';
import { tierColor, tierName } from '@/lib/format';

const TIERS = [['Bronze', 40, 18], ['Silver', 55, 12], ['Gold', 70, 8], ['Platinum', 80, 5]] as const;

export default function Lender() {
  const { address, isConnected } = useAccount();
  const p = useProfile(address);
  const q = useReadContracts({
    contracts: address
      ? [
          { ...contracts.lender, functionName: 'currentOffer', args: [address] },
          { ...contracts.lender, functionName: 'loans', args: [address] },
          { ...contracts.lender, functionName: 'amountOwed', args: [address] },
          { ...contracts.tusd, functionName: 'balanceOf', args: [address] },
          { ...contracts.tusd, functionName: 'allowance', args: [address, addresses.lender] },
          { ...contracts.tusd, functionName: 'balanceOf', args: [addresses.lender] },
        ]
      : [],
    query: { enabled: Boolean(address) && isDeployed, refetchInterval: 8000 },
  });
  const offer = q.data?.[0]?.result as [number, number, number, number, bigint] | undefined;
  const loan = q.data?.[1]?.result as [bigint, bigint, number, bigint] | undefined;
  const owed = (q.data?.[2]?.result as bigint | undefined) ?? 0n;
  const bal = (q.data?.[3]?.result as bigint | undefined) ?? 0n;
  const allowance = (q.data?.[4]?.result as bigint | undefined) ?? 0n;
  const liquidity = (q.data?.[5]?.result as bigint | undefined) ?? 0n;
  const hasLoan = Boolean(loan && loan[1] > 0n);

  const [ctc, setCtc] = useState('5');
  const [amt, setAmt] = useState('1');
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const rcpt = useWaitForTransactionReceipt({ hash, query: { enabled: Boolean(hash) } });
  if (rcpt.isSuccess && !q.isFetching && hash) { /* refetch on settle */ setTimeout(() => { q.refetch(); p.refetch(); }, 0); }

  const ltv = offer ? offer[2] / 100 : 0, apr = offer ? offer[3] / 100 : 0;
  const maxBorrow = offer && ctc ? (Number(ctc) * offer[2]) / 10000 : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-32">
      <h1 className="text-4xl font-semibold">TieredLender</h1>
      <p className="mt-2 max-w-[680px] text-base text-fg-2">A demo lender that reads ICreditOracle at borrow time. Deposit CTC, borrow TUSD at your tier&apos;s terms, repay, and watch a native Creditcoin repayment move your score with no proof at all. Demo pricing: 1 CTC = 1 TUSD.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card title="Terms by tier">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-fg-3"><tr><th className="pb-2">Tier</th><th className="pb-2">LTV</th><th className="pb-2">APR</th></tr></thead>
            <tbody>
              {TIERS.map(([n, l, a], i) => (
                <tr key={n} className={`border-t border-line ${p.tier === i ? 'bg-raised' : ''}`}>
                  <td className="py-2 font-semibold" style={{ color: tierColor(i) }}>{n}{p.tier === i && <span className="ml-2 text-xs text-fg-2">you</span>}</td>
                  <td className="py-2 font-mono">{l}%</td>
                  <td className="py-2 font-mono">{a}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-fg-3">Pool liquidity {formatUnits(liquidity, 6)} TUSD · lender <HashLink href={explorer.cc3Address(addresses.lender)} label={addresses.lender.slice(0, 10) + '…'} /></p>
        </Card>

        {!isConnected ? (
          <div className="lg:col-span-2"><Empty title="Connect to see your offer"><div className="mt-4 flex justify-center"><ConnectButton /></div></Empty></div>
        ) : (
          <>
            <Card title="Your offer">
              {offer ? (
                <>
                  <p className="text-5xl font-semibold" style={{ color: tierColor(offer[1]) }}>{tierName(offer[1])}</p>
                  <p className="mt-1 text-sm text-fg-2">score {offer[0]} · read live from CreditLedger.getScore</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">LTV</dt><dd className="font-mono text-2xl">{ltv}%</dd></div>
                    <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">APR</dt><dd className="font-mono text-2xl">{apr}%</dd></div>
                  </dl>
                </>
              ) : <div className="skeleton h-32 w-full" />}
            </Card>

            <Card title={hasLoan ? 'Your loan' : 'Borrow'}>
              {hasLoan && loan ? (
                <div className="space-y-3 text-sm">
                  <p>Collateral <span className="font-mono">{formatEther(loan[0])} CTC</span> · principal <span className="font-mono">{formatUnits(loan[1], 6)} TUSD</span> · APR <span className="font-mono">{loan[2] / 100}%</span></p>
                  <p>Owed now <span className="font-mono text-lg">{formatUnits(owed, 6)} TUSD</span> · wallet {formatUnits(bal, 6)} TUSD</p>
                  {allowance < owed ? (
                    <Button onClick={() => writeContract({ ...contracts.tusd, functionName: 'approve', args: [addresses.lender, owed * 2n] })} disabled={isPending}>Approve TUSD</Button>
                  ) : (
                    <Button onClick={() => writeContract({ ...contracts.lender, functionName: 'repay' })} disabled={isPending || bal < owed}>Repay and record native repayment</Button>
                  )}
                  {bal < owed && <p className="text-xs text-bronze">Wallet needs {formatUnits(owed - bal, 6)} more TUSD for interest. The operator can mint TUSD to you.</p>}
                </div>
              ) : (
                <form className="space-y-3 text-sm" onSubmit={(e) => { e.preventDefault(); writeContract({ ...contracts.lender, functionName: 'borrow', args: [parseUnits(amt || '0', 6)], value: parseEther(ctc || '0') }); }}>
                  <label className="block">Collateral (CTC)
                    <input className="mt-1 w-full rounded-lg border border-line bg-raised px-3 py-2 font-mono" value={ctc} onChange={(e) => setCtc(e.target.value)} inputMode="decimal" required pattern="[0-9.]+" />
                  </label>
                  <label className="block">Borrow (TUSD) · max {maxBorrow.toFixed(2)}
                    <input className="mt-1 w-full rounded-lg border border-line bg-raised px-3 py-2 font-mono" value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" required pattern="[0-9.]+" />
                  </label>
                  <Button type="submit" disabled={!offer || isPending || Number(amt) > maxBorrow || Number(amt) <= 0}>Borrow at {apr}% APR</Button>
                </form>
              )}
              {hash && <p className="mt-3 text-xs"><HashLink href={explorer.cc3Tx(hash)} label={`tx ${hash.slice(0, 10)}…`} /> {rcpt.isLoading ? '· pending' : rcpt.isSuccess ? '· confirmed' : ''}</p>}
              {error && <p className="mt-3 text-xs text-bronze">{(error as Error & { shortMessage?: string }).shortMessage ?? error.message}</p>}
            </Card>
          </>
        )}
      </div>
      {isConnected && p.profile && (
        <p className="mt-6 text-sm text-fg-2">Native repayments recorded for you: <span className="font-mono text-fg">{p.profile.nativeRepayCount}</span> · score <span className="font-mono text-fg">{p.score}</span> ({p.tier !== undefined && tierName(p.tier)})</p>
      )}
    </div>
  );
}

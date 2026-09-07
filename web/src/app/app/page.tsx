'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSubject } from '@/hooks/useSubject';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowsClockwise, Sparkle } from '@phosphor-icons/react';
import { useProfile } from '@/hooks/useProfile';
import { ScoreGauge } from '@/components/ScoreGauge';
import { BreakdownTable } from '@/components/Breakdown';
import { PassportCard } from '@/components/PassportCard';
import { ProofTrail } from '@/components/ProofTrail';
import { Button, Card, Empty, HashLink } from '@/components/ui';
import { getJob, startImport, startSeed, workerHealth, type Job } from '@/lib/worker';
import { isDeployed, addresses } from '@/lib/contracts';
import { explorer } from '@/lib/chains';
import { usd6 } from '@/lib/format';

function Dashboard() {
  const { subject: address, isConnected: connected, viewingAs } = useSubject();
  const isConnected = connected || viewingAs;
  const p = useProfile(address);
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof workerHealth>>>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { workerHealth().then(setHealth); }, []);

  const poll = (id: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const j = await getJob(id);
        setJob(j);
        if (j.status !== 'running') { clearInterval(timer.current!); p.refetch(); }
      } catch (e) { setErr((e as Error).message); }
    }, 2500);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const doImport = async () => {
    if (!address) return;
    setErr(null);
    try { const { jobId } = await startImport(address); poll(jobId); } catch (e) { setErr((e as Error).message); }
  };
  const doSeed = async () => {
    setErr(null);
    try { const { jobId } = await startSeed(); poll(jobId); } catch (e) { setErr((e as Error).message); }
  };

  const running = job?.status === 'running';
  const noHistory = p.enabled && !p.isLoading && p.facts.length === 0 && !running;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-32">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-base text-fg-2">Your score, its breakdown and the proofs behind it. Every number is read from Creditcoin.</p>
        </div>
        {isConnected && (
          <div className="flex items-center gap-3">
            <Button onClick={doImport} disabled={!isDeployed || running || !health?.ok}>
              <ArrowsClockwise size={18} className={running ? 'animate-spin' : ''} /> {running ? 'Importing…' : 'Import Aave history'}
            </Button>
          </div>
        )}
      </header>

      {viewingAs && <p className="mt-6 rounded-xl border border-line bg-raised p-4 text-sm text-fg-2">Viewing as <span className="font-mono text-fg">{address}</span> · read only. Anyone can import proofs for any address; only the subject can mint its passport.</p>}
      {!isDeployed && <p className="mt-6 rounded-xl border border-line bg-warm p-4 text-sm text-fg-2">Contracts are not deployed yet on CC3 testnet. See the README quickstart.</p>}
      {health === null && <p className="mt-6 rounded-xl border border-line bg-warm p-4 text-sm text-fg-2">The proof worker is offline, so imports are disabled. Run <code className="font-mono">pnpm --filter @attestcredit/worker server</code>. On chain data still loads.</p>}
      {err && <p className="mt-6 rounded-xl border border-bronze/40 bg-warm p-4 text-sm text-bronze">{err}</p>}

      {!isConnected ? (
        <div className="mt-10">
          <Empty title="Connect the wallet you use on Aave Sepolia">
            <p>The same address owns its profile on Creditcoin. Connect on either network to see it.</p>
            <div className="mt-6 flex justify-center"><ConnectButton /></div>
          </Empty>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1" title="Score">
            <ScoreGauge score={p.score} tier={p.tier} pulse={p.pulse} />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Borrows</dt><dd className="font-mono text-lg">{p.profile?.borrowCount ?? '–'}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Repays</dt><dd className="font-mono text-lg">{p.profile?.repayCount ?? '–'}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Repaid</dt><dd className="font-mono text-lg">{p.profile ? usd6(p.profile.repaidVolumeUsd6) : '–'}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Liquidations</dt><dd className="font-mono text-lg">{p.profile?.liquidationCount ?? '–'}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-fg-3">Subject <HashLink href={explorer.cc3Address(address!)} label={address!.slice(0, 10) + '…'} /> · ledger <HashLink href={explorer.cc3Address(addresses.ledger)} label={addresses.ledger.slice(0, 10) + '…'} /></p>
          </Card>

          <Card className="lg:col-span-1" title="Why this score">
            <BreakdownTable b={p.breakdown} loading={p.isLoading} />
            <p className="mt-3 text-xs text-fg-3">Now = Sepolia block {p.nowBlock?.toString() ?? '–'} (latest attested on Creditcoin).</p>
          </Card>

          <Card className="lg:col-span-1" title="Credit Passport">
            <PassportCard subject={address!} hasPassport={p.hasPassport} canMint={p.facts.length > 0} onChanged={() => p.refetch()} />
          </Card>

          {noHistory && !job && (
            <div className="lg:col-span-3">
              <Empty title="No Aave history for this address yet">
                <p>AttestCredit only counts real Aave V3 Sepolia activity. Borrow and repay a small amount on Aave with this wallet, then come back and import.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button href={explorer.aaveApp} variant="secondary" external>Open Aave Sepolia</Button>
                  {health?.demoAddress && <Button onClick={doSeed} disabled={!health.ok}><Sparkle size={18} /> Run demo seed</Button>}
                </div>
                {health?.demoAddress && <p className="mt-4 text-xs text-fg-3">The demo seed creates a real borrow and repay history for the operator&apos;s demo wallet {health.demoAddress.slice(0, 8)}…. It never asks for your key.</p>}
              </Empty>
            </div>
          )}

          {job && (
            <Card className="lg:col-span-3" title="Proof trail" action={<span className="text-sm text-fg-2">{job.status === 'running' ? 'live' : job.status} · {job.events.at(-1)?.message}</span>}>
              {job.trails.length === 0 ? <p className="text-sm text-fg-2">{job.events.at(-1)?.message ?? 'starting…'}</p> : <ProofTrail trails={job.trails} />}
              {job.error && <p className="mt-3 text-sm text-bronze">{job.error}</p>}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}

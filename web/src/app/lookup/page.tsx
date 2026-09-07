'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isAddress } from 'viem';
import { Button, Card } from '@/components/ui';

export default function LookupIndex() {
  const r = useRouter();
  const [a, setA] = useState('');
  const ok = isAddress(a);
  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-32">
      <h1 className="text-4xl font-semibold">Bureau lookup</h1>
      <p className="mt-2 text-base text-fg-2">What any lender on Creditcoin sees for an address. Public, read only, shareable.</p>
      <Card className="mt-10">
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={(e) => { e.preventDefault(); if (ok) r.push(`/lookup/${a}`); }}>
          <input className="flex-1 rounded-full border border-line bg-raised px-4 py-2 font-mono text-sm" placeholder="0x…" value={a} onChange={(e) => setA(e.target.value.trim())} aria-label="Address" />
          <Button type="submit" disabled={!ok}>Look up</Button>
        </form>
        {a && !ok && <p className="mt-2 text-sm text-bronze">That is not a valid EVM address.</p>}
        <p className="mt-4 text-sm text-fg-3">Try the demo wallet: <button className="font-mono text-accent" onClick={() => setA('0x3C343AD077983371b29fee386bdBC8a92E934C51')}>0x3C343AD0…4C51</button></p>
      </Card>
    </div>
  );
}

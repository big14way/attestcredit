import { WORKER_URL } from './contracts';

export type Stage = 'found' | 'skipped' | 'waiting_attestation' | 'proving' | 'submitting' | 'verified' | 'failed';
export interface TxTrail {
  txHash: string;
  block: number;
  events: string[];
  stage: Stage;
  txIndex?: number;
  queryId?: string;
  attestedHeight?: number;
  continuityRoots?: number;
  creditcoinTx?: string;
  gasUsed?: string;
  facts?: Array<{ subject: string; factType: number; reserve: string; amount: string; amountUsd6: string; sourceBlock: number; queryId: string; factId: string }>;
  error?: string;
  batchId?: number;
}
export interface ImportEvent { type: string; message: string; tx?: TxTrail; data?: unknown }
export interface Job {
  id: string;
  address: string;
  status: 'running' | 'done' | 'error';
  startedAt: string;
  finishedAt?: string;
  events: ImportEvent[];
  trails: TxTrail[];
  error?: string;
  eventCount: number;
}

export async function workerHealth(): Promise<{ ok: boolean; latestAttestedSepolia?: number; demoAddress?: string | null } | null> {
  try {
    const r = await fetch(`${WORKER_URL}/health`, { cache: 'no-store' });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

export async function startImport(address: string): Promise<{ jobId: string }> {
  const r = await fetch(`${WORKER_URL}/import`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) });
  if (!r.ok) throw new Error((await r.json()).error ?? `worker ${r.status}`);
  return r.json();
}

export async function startSeed(): Promise<{ jobId: string; address: string }> {
  const r = await fetch(`${WORKER_URL}/seed`, { method: 'POST' });
  if (!r.ok) throw new Error((await r.json()).error ?? `worker ${r.status}`);
  return r.json();
}

export async function getJob(id: string): Promise<Job> {
  const r = await fetch(`${WORKER_URL}/jobs/${id}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`job ${id}: ${r.status}`);
  return r.json();
}

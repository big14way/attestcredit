import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { importSubject, type ImportEvent, type TxTrail } from './import.js';
import { assertSepoliaChainKey, latestAttested } from './attest/prove.js';
import { config, log, loadDeployments } from './config.js';
import { ethers } from 'ethers';

interface Job {
  id: string;
  address: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'done' | 'error';
  events: ImportEvent[];
  trails: TxTrail[];
  error?: string;
}

const jobs = new Map<string, Job>();
const running = new Map<string, string>(); // address → jobId
const DEMO_ADDRESS = (process.env.DEMO_ADDRESS ?? process.env.DEPLOYER_ADDRESS ?? '').toLowerCase();

function json(res: http.ServerResponse, code: number, body: unknown) {
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(body, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const s = Buffer.concat(chunks).toString('utf8');
  return s ? JSON.parse(s) : {};
}

function startImport(address: string, single = false): Job {
  const existing = running.get(address.toLowerCase());
  if (existing) return jobs.get(existing)!;
  const job: Job = { id: randomUUID(), address, startedAt: new Date().toISOString(), status: 'running', events: [], trails: [] };
  jobs.set(job.id, job);
  running.set(address.toLowerCase(), job.id);
  importSubject(address, (e) => {
    job.events.push(e);
    if (e.tx) {
      const i = job.trails.findIndex((t) => t.txHash === e.tx!.txHash);
      if (i >= 0) job.trails[i] = { ...e.tx };
      else job.trails.push({ ...e.tx });
    }
    if (e.type === 'scan' && Array.isArray(e.data)) job.trails = (e.data as TxTrail[]).map((t) => ({ ...t }));
    log(`[${job.id.slice(0, 8)}] ${e.type}: ${e.message}`);
  }, { single })
    .then(() => { job.status = 'done'; })
    .catch((err) => { job.status = 'error'; job.error = err.shortMessage ?? err.message ?? String(err); })
    .finally(() => { job.finishedAt = new Date().toISOString(); running.delete(address.toLowerCase()); });
  return job;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'OPTIONS') return json(res, 204, {});
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, latestAttestedSepolia: await latestAttested(), deployments: loadDeployments(), demoAddress: DEMO_ADDRESS || null });
    }
    if (req.method === 'POST' && url.pathname === '/import') {
      const body = await readBody(req);
      if (!ethers.isAddress(body.address)) return json(res, 400, { error: 'address required' });
      const job = startImport(ethers.getAddress(body.address), Boolean(body.single));
      return json(res, 202, { jobId: job.id, status: job.status });
    }
    if (req.method === 'POST' && url.pathname === '/seed') {
      // Runs the demo seed for the operator-controlled demo wallet only; never accepts a private key.
      if (!DEMO_ADDRESS) return json(res, 400, { error: 'DEMO_ADDRESS not configured' });
      const { seed } = await import('./seed/aaveSeed.js');
      const id = randomUUID();
      const job: Job = { id, address: DEMO_ADDRESS, startedAt: new Date().toISOString(), status: 'running', events: [], trails: [] };
      jobs.set(id, job);
      seed(undefined, (m) => job.events.push({ type: 'scan', message: m }))
        .then(() => { job.status = 'done'; })
        .catch((e) => { job.status = 'error'; job.error = e.shortMessage ?? e.message; })
        .finally(() => { job.finishedAt = new Date().toISOString(); });
      return json(res, 202, { jobId: id, address: DEMO_ADDRESS });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/jobs/')) {
      const job = jobs.get(url.pathname.slice('/jobs/'.length));
      if (!job) return json(res, 404, { error: 'unknown job' });
      const since = Number(url.searchParams.get('since') ?? 0);
      return json(res, 200, { ...job, events: job.events.slice(since), eventOffset: since, eventCount: job.events.length });
    }
    if (req.method === 'GET' && url.pathname === '/jobs') {
      return json(res, 200, [...jobs.values()].map((j) => ({ id: j.id, address: j.address, status: j.status, startedAt: j.startedAt })));
    }
    json(res, 404, { error: 'not found' });
  } catch (e: any) {
    json(res, 500, { error: e.shortMessage ?? e.message ?? String(e) });
  }
});

assertSepoliaChainKey()
  .then(() => {
    server.listen(config.workerPort, () => log(`worker API on http://localhost:${config.workerPort} (CORS: ${config.webOrigin})`));
  })
  .catch((e) => {
    console.error('startup check failed:', e.message);
    process.exit(1);
  });

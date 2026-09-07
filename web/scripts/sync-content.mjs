// Copies files the web app needs from outside web/ so a web-rooted deploy (Vercel) is self contained.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.cwd(), '..');
const out = path.join(process.cwd(), 'content');
fs.mkdirSync(out, { recursive: true });
const files = ['deployments/cc3-testnet.json', 'docs/ATTESTCOIN_INTEGRATION.md', 'docs/SCORING.md'];
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(out, path.basename(f))); console.log('synced', f); }
}

import fs from 'node:fs';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-static';

function read(name: string): string | null {
  const p = path.join(process.cwd(), 'content', name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

export default function Docs() {
  const integration = read('ATTESTCOIN_INTEGRATION.md');
  const scoring = read('SCORING.md');
  return (
    <div className="mx-auto max-w-4xl px-6 pb-20 pt-32">
      <h1 className="text-4xl font-semibold">Docs</h1>
      <p className="mt-2 text-base text-fg-2">How AttestCredit uses the Attestcoin Protocol, and how the score is computed. Rendered from the repository&apos;s docs folder.</p>
      <nav aria-label="Docs" className="mt-6 flex gap-3 text-sm">
        <a className="rounded-full border border-line px-3 py-1 hover:bg-raised" href="#integration">Attestcoin integration</a>
        <a className="rounded-full border border-line px-3 py-1 hover:bg-raised" href="#scoring">Scoring</a>
      </nav>
      <article id="integration" className="prose-doc mt-12">
        {integration ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{integration}</ReactMarkdown> : <p className="text-fg-2">docs/ATTESTCOIN_INTEGRATION.md is written after the first end to end testnet run so it can carry measured gas.</p>}
      </article>
      <article id="scoring" className="prose-doc mt-16">
        {scoring && <ReactMarkdown remarkPlugins={[remarkGfm]}>{scoring}</ReactMarkdown>}
      </article>
    </div>
  );
}

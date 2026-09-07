import Link from 'next/link';
import { Mark } from './Nav';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-fg-2">
          <Mark size={18} />
          <span>AttestCredit · built on Creditcoin CC3 testnet with the Attestcoin Protocol</span>
        </div>
        <ul className="flex flex-wrap gap-4 text-sm text-fg-2">
          <li><Link className="fluid hover:text-fg" href="/docs">Docs</Link></li>
          <li><a className="fluid hover:text-fg" href="https://github.com/big14way/attestcredit" target="_blank" rel="noreferrer">GitHub</a></li>
          <li><Link className="fluid hover:text-fg" href="/privacy">Privacy</Link></li>
          <li><Link className="fluid hover:text-fg" href="/terms">Terms</Link></li>
        </ul>
      </div>
    </footer>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const links = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/proofs', label: 'Proofs' },
  { href: '/app/lender', label: 'Lender' },
  { href: '/lookup', label: 'Lookup' },
  { href: '/docs', label: 'Docs' },
];

/** Fluid island nav (B7): floating glass pill, hamburger morphs into an X, full screen glass overlay with staggered links. */
export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === '/app' ? path === '/app' : path.startsWith(h));

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Primary"
        className="fluid pointer-events-auto mx-auto mt-6 flex w-max max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-line bg-black/70 px-3 py-2 backdrop-blur-2xl"
      >
        <Link href="/" className="press flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold" aria-label="AttestCredit home">
          <Mark />
          <span>AttestCredit</span>
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active(l.href) ? 'page' : undefined}
                className={`fluid press rounded-full px-3 py-2 text-sm font-semibold hover:bg-overlay ${active(l.href) ? 'bg-raised text-fg' : 'text-fg-2'}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
          className="press relative ml-1 flex h-9 w-9 items-center justify-center rounded-full hover:bg-overlay md:hidden"
        >
          <span className={`fluid absolute h-0.5 w-4 bg-fg ${open ? 'rotate-45' : '-translate-y-1'}`} />
          <span className={`fluid absolute h-0.5 w-4 bg-fg ${open ? '-rotate-45' : 'translate-y-1'}`} />
        </button>
      </nav>

      <div
        aria-hidden={!open}
        className={`fluid pointer-events-auto fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-3xl md:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        {links.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? `${100 + i * 50}ms` : '0ms' }}
            className={`fluid text-3xl font-semibold ${open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'} ${active(l.href) ? 'text-accent' : 'text-fg'}`}
          >
            {l.label}
          </Link>
        ))}
        <div style={{ transitionDelay: open ? '400ms' : '0ms' }} className={`fluid mt-4 ${open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
      </div>
    </header>
  );
}

/** Original mark: a proof check inside a ledger square. No Creditcoin logo, no penguin. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="#8AF0C8" strokeWidth="2" />
      <path d="M7 12.5l3.2 3L17 8.5" stroke="#8AF0C8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

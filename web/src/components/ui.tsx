import Link from 'next/link';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import type { ReactNode } from 'react';

export function Button({ children, href, onClick, variant = 'primary', disabled, type = 'button', size = 'md', external }: {
  children: ReactNode; href?: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; type?: 'button' | 'submit'; size?: 'md' | 'sm'; external?: boolean;
}) {
  const base = `fluid press inline-flex items-center justify-center gap-2 rounded-full font-semibold ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3 py-2 text-base'} disabled:cursor-not-allowed disabled:opacity-50`;
  const v = {
    primary: 'bg-accent text-accent-ink hover:bg-accent-strong hover:-translate-y-px',
    secondary: 'border border-line bg-raised text-fg hover:bg-overlay hover:-translate-y-px',
    ghost: 'text-fg-2 hover:bg-raised hover:text-fg',
  }[variant];
  if (href && !disabled) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={`${base} ${v}`}>{children}<ArrowSquareOut size={16} /></a>
    ) : (
      <Link href={href} className={`${base} ${v}`}>{children}</Link>
    );
  }
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v}`}>{children}</button>;
}

export function Card({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, loading }: { label: string; value: ReactNode; hint?: ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <p className="text-sm text-fg-2">{label}</p>
      {loading ? <div className="skeleton mt-2 h-9 w-24" /> : <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">{value}</p>}
      {hint && <p className="mt-1 text-xs text-fg-3">{hint}</p>}
    </div>
  );
}

export function HashLink({ href, label, mono = true }: { href: string; label: string; mono?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`fluid inline-flex items-center gap-1 text-accent hover:text-accent-strong ${mono ? 'font-mono text-sm' : ''}`}>
      {label}
      <ArrowSquareOut size={14} aria-hidden />
    </a>
  );
}

export function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: color ?? '#313131', color: color ?? '#9B9B9B' }}>
      {children}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-8 text-center">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mx-auto mt-3 max-w-md text-base text-fg-2">{children}</div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

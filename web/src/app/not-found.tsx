import Link from 'next/link';
import { Mark } from '@/components/Nav';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-40 text-center">
      <Mark size={40} />
      <h1 className="mt-6 text-4xl font-semibold">No fact at this address</h1>
      <p className="mt-3 text-base text-fg-2">The page you asked for does not exist. Every real page is one click away.</p>
      <Link href="/" className="fluid press mt-8 rounded-full bg-accent px-3 py-2 text-base font-semibold text-accent-ink">Back to AttestCredit</Link>
    </div>
  );
}

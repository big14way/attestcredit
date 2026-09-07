import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'AttestCredit — the cross chain credit bureau on Creditcoin',
  description:
    'AttestCredit proves a wallet’s Aave borrow and repay history on Creditcoin through the Attestcoin Protocol and turns it into a score any lender can read. No oracle, no bridge, no indexer.',
  metadataBase: new URL('https://attestcredit.xyz'),
  openGraph: {
    title: 'AttestCredit',
    description: 'Your Ethereum repayment history, proven on Creditcoin. Trustlessly.',
    images: ['/og.png'],
  },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <a href="#main" className="skip-link rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">
          Skip to content
        </a>
        <Providers>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

import type { NextConfig } from 'next';

// Wallet connector SDKs (Coinbase/WalletConnect via RainbowKit) reference optional packages we never use in the browser.
const ignored = ['@coinbase/cdp-sdk'];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    for (const m of ignored) config.resolve.alias[m] = false;
    return config;
  },
  turbopack: {
    resolveAlias: Object.fromEntries(ignored.map((m) => [m, './src/lib/empty.ts'])),
  },
};

export default nextConfig;

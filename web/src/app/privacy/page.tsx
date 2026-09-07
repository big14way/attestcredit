export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-32 text-base text-fg-2">
      <h1 className="text-4xl font-semibold text-fg">Privacy</h1>
      <p className="mt-6">AttestCredit stores nothing about you off chain. The site reads public state from Creditcoin CC3 testnet and Ethereum Sepolia using your browser. The proof worker keeps import jobs in memory only, for the lifetime of the process, keyed by the address you submit.</p>
      <p className="mt-4">Wallet connections go through your wallet extension. We do not run analytics, set tracking cookies, or send your address to anyone other than the public RPC endpoints listed in the repository.</p>
      <p className="mt-4">Everything written to Creditcoin (facts, scores, passports) is public by design: that is what a credit bureau on a public chain is.</p>
    </div>
  );
}

import { AbsoluteFill } from 'remotion';
import { Bg, Card, Eyebrow, Rise, SceneFade, Words } from '../components/primitives';
import { T } from '../theme';

export const Revenue = () => (
  <SceneFade>
    <Bg>
      <AbsoluteFill style={{ padding: '120px 160px' }}>
        <Eyebrow>Business model</Eyebrow>
        <Words text="Proof submission stays free and permissionless. Reading at scale is the product." delay={8} size={64} maxWidth={1500} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28, marginTop: 56 }}>
          {[
            ['Per query fees', 'Lenders reading the oracle at volume pay per score, the way they pay a bureau today.'],
            ['Premium passports', 'Richer attributes, more source chains, mainnet Ethereum, Compound and Morpho events.'],
            ['Underwriting feeds', 'Batch exports and webhooks for Credal, PenguinBase and ecosystem lenders.'],
          ].map(([t, b], i) => (
            <Card key={t} delay={50 + i * 12}>
              <div style={{ fontSize: 34, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 24, color: T.fg2, marginTop: 10 }}>{b}</div>
            </Card>
          ))}
        </div>
        <Rise delay={110} style={{ marginTop: 48 }}>
          <div style={{ fontSize: 28, color: T.fg2 }}>First market: emerging market stablecoin borrowers who already use Aave, launching with the Creditcoin lender ecosystem.</div>
        </Rise>
      </AbsoluteFill>
    </Bg>
  </SceneFade>
);

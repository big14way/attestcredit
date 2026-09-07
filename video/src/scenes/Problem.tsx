import { AbsoluteFill } from 'remotion';
import { Bg, Card, Counter, Eyebrow, Rise, SceneFade, Words } from '../components/primitives';
import { T } from '../theme';

export const Problem = () => (
  <SceneFade>
    <Bg>
      <AbsoluteFill style={{ padding: '120px 160px' }}>
        <Eyebrow>Not a me problem</Eyebrow>
        <Words text="Credit history that cannot travel is not credit history." delay={10} size={72} maxWidth={1400} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28, marginTop: 64 }}>
          <Card delay={50}>
            <div style={{ color: T.fg3, fontSize: 20 }}>Outstanding loans on Aave alone</div>
            <div style={{ marginTop: 8 }}><Counter to={12.5} delay={60} size={80} prefix="$" suffix="B" decimals={1} /></div>
            <div style={{ color: T.fg2, fontSize: 22, marginTop: 10 }}>Half of all DeFi lending. Every repayment public, permanent, and locked to the chain it happened on.</div>
          </Card>
          <Card delay={62}>
            <div style={{ color: T.fg3, fontSize: 20 }}>What a lender on any other chain sees</div>
            <div style={{ marginTop: 8 }}><Counter to={0} delay={72} size={80} color={T.bronze} suffix=" facts" /></div>
            <div style={{ color: T.fg2, fontSize: 22, marginTop: 10 }}>Every wallet starts from zero on every chain. Good borrowers are priced like strangers.</div>
          </Card>
          <Card delay={74}>
            <div style={{ color: T.fg3, fontSize: 20 }}>Off chain, the same wall</div>
            <div style={{ marginTop: 8, fontSize: 56, fontWeight: 600, fontFamily: T.mono, color: T.fg }}>borders</div>
            <div style={{ color: T.fg2, fontSize: 22, marginTop: 10 }}>Move countries and your file stays behind. A whole company, Nova Credit, exists only to translate it. On chain nobody even tries.</div>
          </Card>
        </div>
        <Rise delay={110} style={{ marginTop: 56 }}>
          <div style={{ fontSize: 30, color: T.fg2, maxWidth: 1300 }}>
            Creditcoin was founded for exactly this: portable credit history for people the banking system cannot see. The best credit data those people have is already on chain. Nobody could read it.
          </div>
        </Rise>
      </AbsoluteFill>
    </Bg>
  </SceneFade>
);

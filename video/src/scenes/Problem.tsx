import { AbsoluteFill } from 'remotion';
import { Bg, Card, Counter, Eyebrow, Rise, SceneFade, Words } from '../components/primitives';
import { T } from '../theme';

export const Problem = () => (
  <SceneFade>
    <Bg>
      <AbsoluteFill style={{ padding: '120px 160px' }}>
        <Eyebrow>The problem</Eyebrow>
        <Words text="Credit history that cannot leave its chain is not credit history." delay={10} size={72} maxWidth={1400} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28, marginTop: 64 }}>
          <Card delay={50}>
            <div style={{ color: T.fg3, fontSize: 20 }}>Lending on Ethereum</div>
            <div style={{ marginTop: 8 }}><Counter to={3} delay={60} size={80} suffix=" protocols" /></div>
            <div style={{ color: T.fg2, fontSize: 22, marginTop: 10 }}>Aave, Compound, Morpho. Billions borrowed and repaid, all public, all stuck.</div>
          </Card>
          <Card delay={62}>
            <div style={{ color: T.fg3, fontSize: 20 }}>What a lender elsewhere sees</div>
            <div style={{ marginTop: 8 }}><Counter to={0} delay={72} size={80} color={T.bronze} suffix=" facts" /></div>
            <div style={{ color: T.fg2, fontSize: 22, marginTop: 10 }}>Every wallet starts from zero on every chain. Good borrowers pay for strangers.</div>
          </Card>
          <Card delay={74}>
            <div style={{ color: T.fg3, fontSize: 20 }}>The only bridges today</div>
            <div style={{ marginTop: 8, fontSize: 56, fontWeight: 600, fontFamily: T.mono, color: T.fg }}>oracles</div>
            <div style={{ color: T.fg2, fontSize: 22, marginTop: 10 }}>Someone signs a claim about your history. Lenders do not price risk on hearsay.</div>
          </Card>
        </div>
        <Rise delay={110} style={{ marginTop: 56 }}>
          <div style={{ fontSize: 30, color: T.fg2, maxWidth: 1300 }}>
            Creditcoin was founded to make credit history portable for people banks cannot see. Their best credit data already lives on chain. Nobody could read it. Until now.
          </div>
        </Rise>
      </AbsoluteFill>
    </Bg>
  </SceneFade>
);

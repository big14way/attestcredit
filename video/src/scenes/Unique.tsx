import { AbsoluteFill } from 'remotion';
import { Bg, Card, Counter, Eyebrow, Rise, SceneFade, Words } from '../components/primitives';
import { T } from '../theme';

export const Unique = () => (
  <SceneFade>
    <Bg>
      <AbsoluteFill style={{ padding: '120px 160px' }}>
        <Eyebrow>Why this is different</Eyebrow>
        <Words text="Not another lending app. The credit layer every Creditcoin lender can call." delay={8} size={64} maxWidth={1500} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 56 }}>
          <Card delay={50}>
            <div style={{ color: T.fg3, fontSize: 20 }}>Gas per Sepolia transaction, measured on CC3</div>
            <div style={{ display: 'flex', gap: 48, marginTop: 12, alignItems: 'baseline' }}>
              <div><Counter to={568788} delay={60} size={64} color={T.fg2} /><div style={{ color: T.fg3, fontSize: 20 }}>single proof</div></div>
              <div><Counter to={361150} delay={70} size={64} /><div style={{ color: T.fg3, fontSize: 20 }}>batched, 7 txs, one continuity proof</div></div>
            </div>
          </Card>
          <Card delay={62}>
            <div style={{ color: T.fg3, fontSize: 20 }}>Trust assumptions</div>
            <div style={{ fontSize: 48, fontWeight: 600, marginTop: 8, lineHeight: 1.15 }}>No oracle.<br />No bridge.<br />No indexer.</div>
          </Card>
          <Card delay={74}>
            <div style={{ color: T.fg3, fontSize: 20 }}>Identity</div>
            <div style={{ fontSize: 26, color: T.fg2, marginTop: 8 }}>Same key, same address on both chains. Your Ethereum address owns its Creditcoin profile by construction. Only you can mint your Passport.</div>
          </Card>
          <Card delay={86}>
            <div style={{ color: T.fg3, fontSize: 20 }}>Integration</div>
            <div style={{ fontFamily: T.mono, fontSize: 24, color: T.fg2, marginTop: 8, lineHeight: 1.5 }}>(score, tier) = BUREAU.getScore(user);<br />ltv = tier == 3 ? 80% : …</div>
          </Card>
        </div>
      </AbsoluteFill>
    </Bg>
  </SceneFade>
);

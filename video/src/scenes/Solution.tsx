import { AbsoluteFill } from 'remotion';
import { Bg, Eyebrow, Rise, SceneFade, Words } from '../components/primitives';
import { Pipeline } from '../components/Pipeline';
import { T } from '../theme';

export const Solution = () => (
  <SceneFade>
    <Bg>
      <AbsoluteFill style={{ padding: '100px 160px' }}>
        <Eyebrow>The solution</Eyebrow>
        <Words text="Prove the history. Do not trust anyone with it." delay={8} size={72} maxWidth={1500} />
      </AbsoluteFill>
      <Pipeline delay={40} />
      <Rise delay={230} style={{ position: 'absolute', left: 160, bottom: 110, maxWidth: 1100 }}>
        <div style={{ fontSize: 30, color: T.fg2 }}>
          Creditcoin attests Ethereum blocks. A precompile verifies your transaction is in one. Our contract reads the receipt itself, requires success and the real Aave Pool, records the fact and recomputes your score. No oracle. No bridge. No indexer.
        </div>
      </Rise>
    </Bg>
  </SceneFade>
);

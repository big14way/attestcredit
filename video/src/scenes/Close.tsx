import { AbsoluteFill } from 'remotion';
import { Bg, Mark, Rise, SceneFade, Words } from '../components/primitives';
import { T } from '../theme';

export const Close = () => (
  <SceneFade out={20}>
    <Bg>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Words text="Attestcoin was built to read credit across chains." delay={0} size={72} maxWidth={1300} style={{ textAlign: 'center' }} />
        <Words text="This is that." delay={40} step={6} size={96} color={T.accent} maxWidth={1300} style={{ textAlign: 'center', marginTop: 16 }} />
        <Rise delay={110} style={{ marginTop: 64, display: 'flex', alignItems: 'center', gap: 20 }}>
          <Mark size={56} delay={110} />
          <div style={{ fontFamily: T.mono, fontSize: 30, color: T.fg2 }}>attestcredit.vercel.app · github.com/big14way/attestcredit</div>
        </Rise>
      </AbsoluteFill>
    </Bg>
  </SceneFade>
);

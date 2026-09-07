import { AbsoluteFill } from 'remotion';
import { Bg, Mark, Rise, SceneFade, Words } from '../components/primitives';
import { T } from '../theme';

export const ColdOpen = () => (
  <SceneFade>
    <Bg>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Mark size={140} delay={4} />
        <Rise delay={30} from={30} style={{ marginTop: 40 }}>
          <div style={{ fontSize: 88, fontWeight: 600, letterSpacing: '-0.02em' }}>AttestCredit</div>
        </Rise>
        <Words text="The cross chain credit bureau on Creditcoin." delay={58} step={4} size={34} weight={500} color={T.fg2} muted={0} style={{ marginTop: 18, textAlign: 'center' }} />
      </AbsoluteFill>
    </Bg>
  </SceneFade>
);

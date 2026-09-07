import { Composition, Sequence, AbsoluteFill } from 'remotion';
import { Fonts } from './components/Fonts';
import { ColdOpen } from './scenes/ColdOpen';
import { Story } from './scenes/Story';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Demo, DEMO_TOTAL } from './scenes/Demo';
import { Unique } from './scenes/Unique';
import { Revenue } from './scenes/Revenue';
import { Close } from './scenes/Close';
import { FPS, H, W, sec } from './theme';

/** Timeline (seconds). Total ≈ 3:00. Matches SCRIPT.md. */
export const SCENES = [
  { id: 'ColdOpen', C: ColdOpen, dur: sec(6) },
  { id: 'Story', C: Story, dur: sec(28) },
  { id: 'Problem', C: Problem, dur: sec(18) },
  { id: 'Solution', C: Solution, dur: sec(24) },
  { id: 'Demo', C: Demo, dur: DEMO_TOTAL },
  { id: 'Unique', C: Unique, dur: sec(16) },
  { id: 'Revenue', C: Revenue, dur: sec(14) },
  { id: 'Close', C: Close, dur: sec(10) },
];
const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);

const Film = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Fonts />
      {SCENES.map((s) => {
        const from = at;
        at += s.dur;
        return (
          <Sequence key={s.id} from={from} durationInFrames={s.dur}>
            <s.C />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const Root = () => (
  <>
    <Composition id="AttestCreditPitch" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    {SCENES.map((s) => (
      <Composition key={s.id} id={s.id} component={() => (<><Fonts /><s.C /></>)} durationInFrames={s.dur} fps={FPS} width={W} height={H} />
    ))}
  </>
);

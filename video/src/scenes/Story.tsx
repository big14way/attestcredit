import { AbsoluteFill, Sequence } from 'remotion';
import { Bg, Card, Eyebrow, Pill, Rise, SceneFade, Words } from '../components/primitives';
import { T, sec } from '../theme';

/** First person story. Edit the copy in SCRIPT.md and here to match what actually happened to you. */
export const Story = () => (
  <SceneFade>
    <Bg>
      <Sequence from={0} durationInFrames={sec(9)}>
        <AbsoluteFill style={{ padding: '0 160px', justifyContent: 'center' }}>
          <Eyebrow>A true story</Eyebrow>
          <Words text="I borrowed on Aave three times. I repaid every loan, on time, with interest." delay={12} size={84} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={sec(9)} durationInFrames={sec(9)}>
        <AbsoluteFill style={{ padding: '0 160px', justifyContent: 'center', gap: 40 }}>
          <Words text="Then I went to borrow on a different chain." delay={0} size={72} />
          <Card delay={22} style={{ width: 900 }}>
            <div style={{ color: T.fg3, fontSize: 20, fontFamily: T.mono }}>lender.app · new user</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <Pill color={T.bronze} delay={30}>Bronze</Pill>
              <Pill delay={36}>40% LTV</Pill>
              <Pill delay={42}>18% APR</Pill>
              <Pill delay={48}>no history</Pill>
            </div>
          </Card>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={sec(18)} durationInFrames={sec(10)}>
        <AbsoluteFill style={{ padding: '0 160px', justifyContent: 'center' }}>
          <Words text="My history was public, permanent, and worth nothing the moment I left the chain it lived on." delay={0} size={72} color={T.fg} />
          <Rise delay={70} style={{ marginTop: 40 }}>
            <div style={{ fontSize: 30, color: T.fg2 }}>That is not a me problem.</div>
          </Rise>
        </AbsoluteFill>
      </Sequence>
    </Bg>
  </SceneFade>
);

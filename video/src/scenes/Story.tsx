import { AbsoluteFill, Sequence } from 'remotion';
import { Bg, Card, Counter, Eyebrow, Pill, Rise, SceneFade, Words } from '../components/primitives';
import { T, sec } from '../theme';

/**
 * Scene 2 — your story. Beats: (1) where you come from, credit invisible by default; (2) you built a real record
 * on chain; (3) it was worth nothing one chain over. Facts on screen are sourced (see SCRIPT.md).
 */
export const Story = () => (
  <SceneFade>
    <Bg>
      <Sequence from={0} durationInFrames={sec(9)}>
        <AbsoluteFill style={{ padding: '0 160px', justifyContent: 'center', gap: 28 }}>
          <Eyebrow>My story</Eyebrow>
          <Words text="I am from Nigeria. Where I grew up, a bank cannot look you up, because there is nothing to look up." delay={10} size={72} />
          <Rise delay={80} style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <Counter to={8} delay={80} size={96} suffix="%" />
            <span style={{ fontSize: 28, color: T.fg2 }}>of Nigerian adults have a credit bureau file. Everyone else is a stranger to every lender.</span>
          </Rise>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={sec(9)} durationInFrames={sec(9)}>
        <AbsoluteFill style={{ padding: '0 160px', justifyContent: 'center', gap: 32 }}>
          <Words text="So I built my record where I could: on chain. I borrowed on Aave. I repaid every loan, with interest." delay={0} size={68} />
          <Card delay={40} style={{ width: 980 }}>
            <div style={{ color: T.fg3, fontSize: 20, fontFamily: T.mono }}>Aave V3 · my wallet</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <Pill color={T.accent} delay={48}>2 borrows</Pill>
              <Pill color={T.accent} delay={54}>5 repayments</Pill>
              <Pill color={T.accent} delay={60}>0 liquidations</Pill>
              <Pill delay={66}>public · permanent</Pill>
            </div>
          </Card>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={sec(18)} durationInFrames={sec(10)}>
        <AbsoluteFill style={{ padding: '0 160px', justifyContent: 'center', gap: 32 }}>
          <Words text="Then I went to borrow on another chain. Same wallet. Same key. To that lender I did not exist." delay={0} size={66} />
          <Card delay={50} style={{ width: 900 }}>
            <div style={{ color: T.fg3, fontSize: 20, fontFamily: T.mono }}>lender · new user</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <Pill color={T.bronze} delay={56}>Bronze</Pill>
              <Pill delay={62}>40% LTV</Pill>
              <Pill delay={68}>18% APR</Pill>
              <Pill delay={74}>no history</Pill>
            </div>
          </Card>
          <Rise delay={110}>
            <div style={{ fontSize: 30, color: T.fg2 }}>I had left one system that could not see me, and built a record inside another one that could not carry it.</div>
          </Rise>
        </AbsoluteFill>
      </Sequence>
    </Bg>
  </SceneFade>
);

import { Sequence } from 'remotion';
import { Bg, SceneFade } from '../components/primitives';
import { ClipSlot } from '../components/ClipSlot';
import { sec } from '../theme';

/** Your screen recordings. Durations here define how long each clip plays; see SHOTLIST.md for what to record. */
export const DEMO_CLIPS = [
  { name: '01-etherscan', dur: 8, caption: 'Real Aave V3 activity on Sepolia', sub: 'Two borrows, five repayments. Nothing mocked.' },
  { name: '02-import', dur: 26, caption: 'Import Aave history', sub: 'Found → attested → proof built → verified on Creditcoin. Seven transactions, one batch proof.' },
  { name: '03-score', dur: 12, caption: 'The score moves the moment the proof verifies', sub: 'Every point traces to a verified Sepolia transaction. Passport minted, image rendered on chain.' },
  { name: '04-lookup', dur: 10, caption: 'This is what any lender on Creditcoin sees', sub: '/lookup/<address> · one call: getScore(subject)' },
  { name: '05-lender', dur: 14, caption: 'Terms follow the tier', sub: 'TieredLender reads the oracle at borrow time. Repay on Creditcoin, score ticks up. No proof needed.' },
  { name: '06-docs', dur: 8, caption: 'Every Attestcoin touchpoint, with file and line', sub: 'Measured gas: 568,788 single · 361,150 per tx batched' },
] as const;

export const DEMO_TOTAL = DEMO_CLIPS.reduce((a, c) => a + sec(c.dur), 0);

export const Demo = () => {
  let at = 0;
  return (
    <SceneFade>
      <Bg>
        {DEMO_CLIPS.map((c) => {
          const from = at;
          at += sec(c.dur);
          return (
            <Sequence key={c.name} from={from} durationInFrames={sec(c.dur)}>
              <ClipSlot name={c.name} caption={c.caption} sub={c.sub} />
            </Sequence>
          );
        })}
      </Bg>
    </SceneFade>
  );
};

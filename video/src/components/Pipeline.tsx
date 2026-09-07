import { interpolate, useCurrentFrame } from 'remotion';
import { T, fluid } from '../theme';

/** Sepolia → Attestcoin → Creditcoin, with packets travelling and contract checks ticking on. */
export const Pipeline = ({ delay = 0 }: { delay?: number }) => {
  const f = useCurrentFrame() - delay;
  const nodes = [
    { x: 340, label: 'Ethereum Sepolia', sub: 'Aave Pool emits Borrow / Repay', c: T.fg2 },
    { x: 960, label: 'Attestcoin Protocol', sub: 'attest · Merkle + continuity proof', c: T.accent },
    { x: 1580, label: 'Creditcoin CC3', sub: 'CreditBureauASC → CreditLedger', c: T.fg2 },
  ];
  const checks = ['chainKey == 1', 'verifyAndEmit(batch) == true', 'receiptStatus == 1', 'log.address == AAVE_POOL', 'queryId unused'];
  const y = 420;
  const packet = (start: number, from: number, to: number) => {
    const p = fluid(interpolate(f, [start, start + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
    return { x: from + (to - from) * p, o: p > 0 && p < 1 ? 1 : 0 };
  };
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {/* rails */}
      {[0, 1].map((i) => {
        const a = nodes[i].x + 232, b = nodes[i + 1].x - 232;
        const p = fluid(interpolate(f, [10 + i * 14, 40 + i * 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
        return <line key={i} x1={a} y1={y} x2={a + (b - a) * p} y2={y} stroke={T.line} strokeWidth={3} />;
      })}
      {/* packets */}
      {[60, 90, 120].map((s, i) => {
        const p1 = packet(s, nodes[0].x + 232, nodes[1].x - 232);
        const p2 = packet(s + 45, nodes[1].x + 232, nodes[2].x - 232);
        return (
          <g key={i}>
            <circle cx={p1.x} cy={y} r={9} fill={T.accent} opacity={p1.o} />
            <circle cx={p2.x} cy={y} r={9} fill={T.accent} opacity={p2.o} />
          </g>
        );
      })}
      {/* nodes */}
      {nodes.map((n, i) => {
        const p = fluid(interpolate(f, [i * 14, i * 14 + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
        return (
          <g key={n.label} opacity={p} transform={`translate(0 ${(1 - p) * 30})`}>
            <rect x={n.x - 220} y={y - 70} width={440} height={140} rx={24} fill={T.surface} stroke={i === 1 ? T.accent : T.line} strokeWidth={1.5} />
            <text x={n.x} y={y - 8} textAnchor="middle" fill={T.fg} fontSize={28} fontWeight={600} fontFamily={T.font}>{n.label}</text>
            <text x={n.x} y={y + 30} textAnchor="middle" fill={n.c} fontSize={18} fontFamily={T.mono}>{n.sub}</text>
          </g>
        );
      })}
      {/* checks under Creditcoin */}
      {checks.map((c, i) => {
        const p = fluid(interpolate(f, [150 + i * 12, 170 + i * 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
        return (
          <g key={c} opacity={p} transform={`translate(${1290} ${560 + i * 52 + (1 - p) * 12})`}>
            <path d="M0 10l6 6 12-12" stroke={T.accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={30} strokeDashoffset={30 * (1 - p)} />
            <text x={34} y={18} fill={T.fg2} fontSize={22} fontFamily={T.mono}>{c}</text>
          </g>
        );
      })}
    </svg>
  );
};

import { AbsoluteFill, OffthreadVideo, getStaticFiles, staticFile, interpolate, useCurrentFrame } from 'remotion';
import { T, fluid } from '../theme';
import { Rise } from './primitives';

/**
 * A slot for one of your screen recordings (public/clips/<name>.mp4, 1920×1080, 30fps).
 * If the file exists it plays inside a device frame; otherwise a labelled placeholder renders so the whole
 * film can be previewed before recording. Drop the file in, nothing else to change.
 */
export const ClipSlot = ({ name, caption, sub, startFrom = 0, zoom = 1 }: { name: string; caption: string; sub?: string; startFrom?: number; zoom?: number }) => {
  const f = useCurrentFrame();
  const has = getStaticFiles().some((s) => s.name === `clips/${name}.mp4`);
  const p = fluid(interpolate(f, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: '56px 96px 150px', borderRadius: 28, border: `1px solid ${T.line}`, background: T.surface, overflow: 'hidden', opacity: p, transform: `scale(${0.96 + 0.04 * p})`, boxShadow: '0 40px 120px rgba(0,0,0,0.6)' }}>
        <div style={{ height: 44, background: T.raised, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px' }}>
          {[T.line, T.line, T.line].map((c, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
          <span style={{ marginLeft: 16, fontFamily: T.mono, fontSize: 15, color: T.fg3 }}>attestcredit.vercel.app</span>
        </div>
        <div style={{ position: 'absolute', inset: '44px 0 0', overflow: 'hidden' }}>
          {has ? (
            <OffthreadVideo src={staticFile(`clips/${name}.mp4`)} startFrom={startFrom} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, transformOrigin: 'top center' }} muted />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: T.fg3, textAlign: 'center' }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 28, color: T.accent }}>public/clips/{name}.mp4</div>
                <div style={{ fontSize: 22, marginTop: 12 }}>record this shot (see SHOTLIST.md)</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Rise delay={10} from={24} style={{ position: 'absolute', left: 96, bottom: 56 }}>
        <div style={{ fontSize: 40, fontWeight: 600 }}>{caption}</div>
        {sub && <div style={{ fontSize: 24, color: T.fg2, marginTop: 6 }}>{sub}</div>}
      </Rise>
    </AbsoluteFill>
  );
};

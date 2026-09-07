/** Hero heading words rise one at a time (B7 easing). Server safe: pure CSS animation with per word delay. */
export function HeroWords({ lines, className = '', wordClass = '', start = 0, step = 60 }: { lines: string[]; className?: string; wordClass?: string; start?: number; step?: number }) {
  let i = 0;
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(' ').map((w, wi) => {
            const d = start + i++ * step;
            return (
              <span key={wi} className={`word-rise ${wordClass}`} style={{ animationDelay: `${d}ms` }}>
                {w}{wi < line.split(' ').length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

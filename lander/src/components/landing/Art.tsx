/**
 * Drawn artwork for the page. These are deliberately diagrammatic marks, not
 * imitations of the app's interface: thick strokes, rounded caps, flat fills.
 * A fake screenshot built out of shapes would be worse than no image at all.
 *
 * Everything inherits colour from the card it sits on where it can, so one
 * drawing works on cream, navy and rose without a second version.
 */

interface ArtProps {
  className?: string;
}

/** The whole idea in one drawing: scattered marks resolved into one route. */
export function PathArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 520 420" fill="none" className={className} role="img" aria-label="A winding path with completed steps and one in progress">
      {/* loose work, drifting */}
      <g className="fill-foreground/15">
        <circle cx="70" cy="66" r="7" />
        <circle cx="446" cy="52" r="5" />
        <circle cx="486" cy="212" r="8" />
        <circle cx="38" cy="286" r="6" />
        <circle cx="212" cy="34" r="5" />
      </g>

      {/* the route */}
      <path
        d="M52 366 C 130 366 132 258 196 250 C 268 240 262 152 330 148 C 396 144 404 78 470 84"
        className="stroke-primary"
        strokeWidth="22"
        strokeLinecap="round"
      />

      {/* done */}
      {[
        [52, 366],
        [196, 250],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="30" className="fill-primary" />
          <path
            d={`M${x - 13} ${y} l 9 10 l 18 -20`}
            className="stroke-background"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* in progress, the one thing you are on */}
      <circle cx="330" cy="148" r="42" className="fill-background" />
      <circle cx="330" cy="148" r="31" className="fill-accent stroke-foreground" strokeWidth="6" />
      <circle cx="330" cy="148" r="9" className="fill-background" />

      {/* still ahead */}
      <circle cx="470" cy="84" r="26" className="fill-background stroke-primary" strokeWidth="10" />
    </svg>
  );
}

/** Ordered work: bars of decreasing weight, the first two struck through. */
export function StepsArt({ className }: ArtProps) {
  const rows = [
    { w: 300, done: true },
    { w: 240, done: true },
    { w: 320, done: false },
    { w: 200, done: false },
  ];
  return (
    <svg viewBox="0 0 400 260" fill="none" className={className} role="img" aria-label="A list of steps, the first two completed">
      {rows.map((r, i) => {
        const y = 24 + i * 62;
        return (
          <g key={i} opacity={r.done ? 0.45 : 1}>
            <circle cx="28" cy={y + 16} r="16" className={r.done ? "fill-current" : "fill-none stroke-current"} strokeWidth="6" />
            {r.done && (
              <path d={`M20 ${y + 16} l 6 7 l 12 -14`} className="stroke-background" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            )}
            <rect x="62" y={y + 4} width={r.w} height="24" rx="12" className="fill-current" />
          </g>
        );
      })}
    </svg>
  );
}

/** A month: a grid where only some days carry anything. */
export function MonthArt({ className }: ArtProps) {
  const cells = Array.from({ length: 35 }, (_, i) => i);
  const marked = new Set([3, 4, 9, 11, 12, 17, 18, 22, 25, 26, 27, 31]);
  const today = 18;
  return (
    <svg viewBox="0 0 400 290" fill="none" className={className} role="img" aria-label="A month grid with several days marked">
      {cells.map((i) => {
        const x = 14 + (i % 7) * 54;
        const y = 14 + Math.floor(i / 7) * 54;
        if (i === today) {
          return (
            <g key={i}>
              <rect x={x} y={y} width="42" height="42" rx="14" className="fill-current" />
              <circle cx={x + 21} cy={y + 21} r="7" className="fill-background" />
            </g>
          );
        }
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="42"
            height="42"
            rx="14"
            className="fill-current"
            opacity={marked.has(i) ? 0.55 : 0.16}
          />
        );
      })}
    </svg>
  );
}

/** Time spent: chunky bars, no axes, no numbers. */
export function TimeArt({ className }: ArtProps) {
  const bars = [70, 130, 96, 178, 118, 208, 150];
  return (
    <svg viewBox="0 0 400 250" fill="none" className={className} role="img" aria-label="Bars showing time spent across a week">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={20 + i * 54}
          y={230 - h}
          width="36"
          height={h}
          rx="18"
          className="fill-current"
          opacity={i === 5 ? 1 : 0.45}
        />
      ))}
    </svg>
  );
}


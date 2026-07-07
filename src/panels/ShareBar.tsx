/** A generic stacked proportional bar + legend, for share distributions. */
export interface ShareItem {
  label: string;
  color: string;
  share: number;
}

export function ShareBar({ items }: { items: readonly ShareItem[] }) {
  const total = items.reduce((s, it) => s + it.share, 0) || 1;
  const sorted = [...items].sort((a, b) => b.share - a.share);
  return (
    <div>
      <div
        className="infbar"
        role="img"
        aria-label={sorted
          .map((it) => `${it.label} ${Math.round((it.share / total) * 100)}%`)
          .join(", ")}
      >
        {sorted.map((it) => (
          <div
            key={it.label}
            className="infbar__seg"
            style={{ width: `${(it.share / total) * 100}%`, background: it.color }}
            title={`${it.label} — ${Math.round((it.share / total) * 100)}%`}
          />
        ))}
      </div>
      <div className="demo-legend">
        {sorted.map((it) => (
          <span className="demo-legend__item" key={it.label}>
            <span className="demo-legend__dot" style={{ background: it.color }} />
            {it.label} · {Math.round((it.share / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

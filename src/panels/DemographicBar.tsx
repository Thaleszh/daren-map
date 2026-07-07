import type { Demographics } from "@/domain/selectors";
import { RACE_META, formatCount } from "@/map/raceStyle";

/** A stacked proportional bar of a population's race composition, with legend. */
export function DemographicBar({ demographics }: { demographics: Demographics }) {
  const { total, rows } = demographics;
  return (
    <div>
      <div className="panel__field" style={{ margin: "2px 0 8px" }}>
        <b>≈ {formatCount(total)}</b> habitantes
      </div>
      <div
        className="infbar"
        role="img"
        aria-label={rows
          .map((r) => `${RACE_META[r.race].label} ${Math.round(r.share * 100)}%`)
          .join(", ")}
      >
        {rows.map((r) => (
          <div
            key={r.race}
            className="infbar__seg"
            style={{ width: `${r.share * 100}%`, background: RACE_META[r.race].color }}
            title={`${RACE_META[r.race].label} — ${formatCount(r.count)}`}
          />
        ))}
      </div>
      <div className="demo-legend">
        {rows.map((r) => (
          <span className="demo-legend__item" key={r.race}>
            <span className="demo-legend__dot" style={{ background: RACE_META[r.race].color }} />
            {RACE_META[r.race].label} · {formatCount(r.count)}
            {r.race !== "human" && ` (${(r.share * 100).toFixed(r.share < 0.01 ? 1 : 0)}%)`}
          </span>
        ))}
      </div>
    </div>
  );
}

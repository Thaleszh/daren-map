import type { AreaStanding } from "@/domain/selectors";

/** A single stacked bar showing each faction's control share of an area. */
export function InfluenceBar({ standings }: { standings: readonly AreaStanding[] }) {
  if (standings.length === 0) {
    return <div className="infbar" aria-hidden />;
  }
  return (
    <div
      className="infbar"
      role="img"
      aria-label={standings
        .map((s) => `${s.faction.name} ${Math.round(s.share * 100)}%`)
        .join(", ")}
    >
      {standings.map((s) => (
        <div
          key={s.faction.id}
          className="infbar__seg"
          style={{ width: `${s.share * 100}%`, background: s.faction.color }}
          title={`${s.faction.name} — ${Math.round(s.share * 100)}%`}
        />
      ))}
    </div>
  );
}

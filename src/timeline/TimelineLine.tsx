import { useMemo } from "react";
import type { TimelineEvent } from "@/domain/schema";
import type { TimelineEventId } from "@/domain/ids";
import { MONTHS, monthKey, moonPhase, parseWorldDate } from "@/domain/calendar";
import { KIND_META } from "./meta";

/** "4 Feb – 8 Feb" — the month heading already carries the year. */
function shortSpan(ev: TimelineEvent): string {
  const p = parseWorldDate(ev.start);
  const q = ev.end ? parseWorldDate(ev.end) : undefined;
  if (!p) return ev.start;
  const a = `${p.day} ${MONTHS[p.month]!.short}`;
  if (!q || ev.end === ev.start) return a;
  return `${a} – ${q.day} ${MONTHS[q.month]!.short}`;
}

type Row =
  | { type: "month"; key: string; row: number }
  | { type: "event"; ev: TimelineEvent; row: number; col: number; tailFrom: number };

/** Fixed columns: 1 season, 2 moon, 3–4 missions, 5 events. */
const MISSION_COLS = [3, 4];
const COLUMNS = [
  { label: "Estação", width: "92px" },
  { label: "Lua", width: "72px" },
  { label: "Missões", width: "minmax(160px, 1fr)" },
  { label: "", width: "minmax(160px, 1fr)" },
  { label: "Eventos", width: "minmax(160px, 1.2fr)" },
];

/**
 * Lay events out newest first, one grid row each (no time-proportional
 * spacing), in parallel lanes: an event takes the first lane whose previous
 * occupant has already ended, so concurrent events sit side by side. A
 * multi-day event keeps a thin tail in its lane running up from its card to the
 * last (newest) row that starts while it is still going.
 * Date strings are zero-padded, so a plain string compare is chronological.
 */
function layout(events: TimelineEvent[]): { rows: Row[] } {
  const sorted = [...events].sort(
    (a, b) => a.start.localeCompare(b.start) || (a.end ?? a.start).localeCompare(b.end ?? b.start),
  );
  // Lanes and reach are decided in chronological order, then displayed reversed.
  const missionEnd = MISSION_COLS.map(() => "");
  const col: number[] = [];
  sorted.forEach((ev) => {
    if (ev.kind === "season") {
      col.push(1);
      return;
    }
    if (ev.kind !== "mission" && ev.kind !== "side-mission") {
      col.push(5);
      return;
    }
    // First free mission lane, else the one that frees up soonest.
    let l = missionEnd.findIndex((end) => end < ev.start);
    if (l < 0) l = missionEnd.indexOf([...missionEnd].sort()[0]!);
    missionEnd[l] = ev.end ?? ev.start;
    col.push(MISSION_COLS[l]!);
  });
  const reach = sorted.map((ev, i) => {
    const end = ev.end ?? ev.start;
    let last = i;
    while (last + 1 < sorted.length && sorted[last + 1]!.start <= end) last++;
    return last;
  });

  const rows: Row[] = [];
  const rowOf: number[] = [];
  let month = "";
  let row = 2; // row 1 is the column header
  for (let i = sorted.length - 1; i >= 0; i--) {
    const key = monthKey(sorted[i]!.start);
    if (key !== month) {
      month = key;
      rows.push({ type: "month", key, row: row++ });
    }
    rowOf[i] = row++;
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    rows.push({
      type: "event",
      ev: sorted[i]!,
      row: rowOf[i]!,
      col: col[i]!,
      tailFrom: rowOf[reach[i]!]!,
    });
  }
  return { rows };
}

/**
 * The "line" layout: events newest first, with concurrent ones
 * in parallel lanes. An empty month costs nothing; month headings are the only
 * markers (the calendar layout is the one that shows gaps).
 */
export function TimelineLine({
  events,
  selectedId,
  onSelectId,
}: {
  events: TimelineEvent[];
  selectedId: TimelineEventId | null;
  onSelectId: (id: TimelineEventId) => void;
}) {
  const { rows } = useMemo(() => layout(events), [events]);

  if (rows.length === 0) return <div className="panel__empty">Nenhum evento.</div>;

  return (
    <div className="tl-line-scroll">
      <div
        className="tl-line"
        style={{ gridTemplateColumns: COLUMNS.map((c) => c.width).join(" ") }}
      >
        {COLUMNS.map((c, i) => (
          <div key={i} className="tl-line__head" style={{ gridRow: 1, gridColumn: i + 1 }}>
            {c.label}
          </div>
        ))}
        {rows.map((r) => {
          if (r.type === "month") {
            const year = r.key.slice(0, 4).replace(/^0+/, "");
            const month = MONTHS[Number(r.key.slice(5, 7))]!;
            return (
              <div
                key={r.key}
                className="tl-line__month"
                style={{ gridRow: r.row, gridColumn: "1 / -1" }}
              >
                {month.name} <span className="tl-month__year">{year}</span>
              </div>
            );
          }
          const { ev } = r;
          const meta = KIND_META[ev.kind];
          const sp = parseWorldDate(ev.start);
          const moon = sp ? moonPhase(sp) : null;
          return (
            <div key={ev.id} style={{ display: "contents" }}>
              {r.tailFrom < r.row && (
                <span
                  className="tl-line__tail"
                  style={{
                    gridRow: `${r.tailFrom} / ${r.row}`,
                    gridColumn: r.col,
                    background: meta.color,
                  }}
                />
              )}
              {moon && (
                <div
                  className="tl-line__moon"
                  style={{ gridRow: r.row, gridColumn: 2 }}
                  title={moon.name}
                >
                  {moon.glyph}
                </div>
              )}
              <div className="tl-line__cell" style={{ gridRow: r.row, gridColumn: r.col }}>
                <button
                  type="button"
                  className={
                    "tl-line__card" + (ev.id === selectedId ? " tl-line__card--active" : "")
                  }
                  style={{ borderLeftColor: meta.color }}
                  aria-current={ev.id === selectedId}
                  onClick={() => onSelectId(ev.id)}
                >
                  <span className="tl-line__date">{shortSpan(ev)}</span>
                  <span className="tl-line__title">{ev.title}</span>
                  <span className="tl-line__kind" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

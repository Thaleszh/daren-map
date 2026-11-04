import { useMemo } from "react";
import type { TimelineEvent } from "@/domain/schema";
import type { TimelineEventId } from "@/domain/ids";
import { MONTHS, monthKey, parseWorldDate } from "@/domain/calendar";
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
  | { type: "event"; ev: TimelineEvent; row: number; lane: number; tailFrom: number };

/**
 * Lay events out newest first, one grid row each (no time-proportional
 * spacing), in parallel lanes: an event takes the first lane whose previous
 * occupant has already ended, so concurrent events sit side by side. A
 * multi-day event keeps a thin tail in its lane running up from its card to the
 * last (newest) row that starts while it is still going.
 * Date strings are zero-padded, so a plain string compare is chronological.
 */
function layout(events: TimelineEvent[]): { rows: Row[]; lanes: number } {
  const sorted = [...events].sort(
    (a, b) => a.start.localeCompare(b.start) || (a.end ?? a.start).localeCompare(b.end ?? b.start),
  );
  // Lanes and reach are decided in chronological order, then displayed reversed.
  const laneEnd: string[] = [];
  const lane: number[] = [];
  sorted.forEach((ev) => {
    let l = laneEnd.findIndex((end) => end < ev.start);
    if (l < 0) l = laneEnd.length;
    laneEnd[l] = ev.end ?? ev.start;
    lane.push(l);
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
  let row = 1;
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
      lane: lane[i]!,
      tailFrom: rowOf[reach[i]!]!,
    });
  }
  return { rows, lanes: Math.max(1, laneEnd.length) };
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
  const { rows, lanes } = useMemo(() => layout(events), [events]);

  if (rows.length === 0) return <div className="panel__empty">Nenhum evento.</div>;

  return (
    <div className="tl-line-scroll">
      <div
        className="tl-line"
        style={{ gridTemplateColumns: `repeat(${lanes}, minmax(150px, 1fr))` }}
      >
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
          return (
            <div key={ev.id} style={{ display: "contents" }}>
              {r.tailFrom < r.row && (
                <span
                  className="tl-line__tail"
                  style={{
                    gridRow: `${r.tailFrom} / ${r.row}`,
                    gridColumn: r.lane + 1,
                    background: meta.color,
                  }}
                />
              )}
              <div className="tl-line__cell" style={{ gridRow: r.row, gridColumn: r.lane + 1 }}>
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

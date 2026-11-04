import { useMemo, useRef, type RefObject } from "react";
import type { TimelineEvent } from "@/domain/schema";
import type { TimelineEventId } from "@/domain/ids";
import { MONTHS, monthKey, moonPhase, parseWorldDate } from "@/domain/calendar";
import { KIND_META } from "./meta";

/** Click-and-drag horizontal panning; a drag swallows the click that ends it. */
function useDragScroll(ref: RefObject<HTMLDivElement | null>) {
  const st = useRef({ x: 0, left: 0, down: false, moved: false });
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 || !ref.current) return;
      st.current = { x: e.clientX, left: ref.current.scrollLeft, down: true, moved: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = st.current;
      if (!s.down || !ref.current) return;
      const dx = e.clientX - s.x;
      if (!s.moved && Math.abs(dx) < 5) return;
      s.moved = true;
      ref.current.scrollLeft = s.left - dx;
    },
    onPointerUp: () => {
      st.current.down = false;
    },
    onPointerLeave: () => {
      st.current.down = false;
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (st.current.moved) {
        e.stopPropagation();
        e.preventDefault();
        st.current.moved = false;
      }
    },
  };
}

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
  | { type: "month"; key: string; row: number; end: number }
  | { type: "event"; ev: TimelineEvent; row: number; col: number; tailFrom: number };

/** Column ids: 0 month, 1 season, 2 moon, 3+ shared event lanes. */
const FIRST_LANE = 3;

/** "Início do outono" → "Outono": the column shows the season in force. */
function seasonName(title: string): string {
  const t = title.replace(/^In[ií]cio d[oa]s? /i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Lay events out newest first, one grid row each (no time-proportional
 * spacing). Missions and other events share lanes: an event takes the first
 * lane whose previous occupant no longer reaches its row, so only genuinely
 * overlapping events sit side by side. A season holds its own column until the
 * next one starts; missions stretch over the rows they overlap.
 * Date strings are zero-padded, so a plain string compare is chronological.
 */
function layout(events: TimelineEvent[]): { rows: Row[]; lanes: number } {
  const sorted = [...events].sort(
    (a, b) => a.start.localeCompare(b.start) || (a.end ?? a.start).localeCompare(b.end ?? b.start),
  );
  // A season lasts until the next one starts (or the last event, for the newest).
  const lastDate = sorted.reduce((m, e) => ((e.end ?? e.start) > m ? (e.end ?? e.start) : m), "");
  const reach = sorted.map((ev, i) => {
    let end = ev.end ?? ev.start;
    let last = i;
    if (ev.kind === "season") {
      const next = sorted.slice(i + 1).find((e) => e.kind === "season");
      end = next ? next.start : lastDate;
      // Stop short of the next season's own row.
      while (last + 1 < sorted.length && sorted[last + 1]!.start < end) last++;
      return last;
    }
    while (last + 1 < sorted.length && sorted[last + 1]!.start <= end) last++;
    return last;
  });
  // Lanes are decided in chronological order (by row index), displayed reversed.
  const busyUntil: number[] = [];
  const col: number[] = [];
  sorted.forEach((ev, i) => {
    if (ev.kind === "season") {
      col.push(1);
      return;
    }
    let l = busyUntil.findIndex((last) => last < i);
    if (l < 0) l = busyUntil.length;
    busyUntil[l] = reach[i]!;
    col.push(FIRST_LANE + l);
  });

  const rows: Row[] = [];
  const rowOf: number[] = [];
  let month = "";
  let row = 2; // row 1 is the column header
  for (let i = sorted.length - 1; i >= 0; i--) {
    const key = monthKey(sorted[i]!.start);
    if (key !== month) {
      month = key;
      rows.push({ type: "month", key, row, end: row });
    }
    const m = rows[rows.length - 1] as Extract<Row, { type: "month" }>;
    m.end = row;
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
  return { rows, lanes: Math.max(1, busyUntil.length) };
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
  showMoon,
}: {
  events: TimelineEvent[];
  selectedId: TimelineEventId | null;
  onSelectId: (id: TimelineEventId) => void;
  showMoon: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useDragScroll(scrollRef);
  const { rows, lanes } = useMemo(() => layout(events), [events]);

  if (rows.length === 0) return <div className="panel__empty">Nenhum evento.</div>;

  const showSeason = events.some((e) => e.kind === "season");
  const cols = [
    { id: 0, label: "", width: "34px" },
    ...(showSeason ? [{ id: 1, label: "Estação", width: "96px" }] : []),
    ...(showMoon ? [{ id: 2, label: "Lua", width: "48px" }] : []),
    ...Array.from({ length: lanes }, (_, l) => ({
      id: FIRST_LANE + l,
      label: l === 0 ? "Missões e eventos" : "",
      width: "190px",
    })),
  ];
  const colOf = (id: number) => cols.findIndex((c) => c.id === id) + 1;

  return (
    <div className="tl-line-scroll" ref={scrollRef} {...drag}>
      <div className="tl-line" style={{ gridTemplateColumns: cols.map((c) => c.width).join(" ") }}>
        {cols.map((c, i) => (
          <div key={c.id} className="tl-line__head" style={{ gridRow: 1, gridColumn: i + 1 }}>
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
                style={{ gridRow: `${r.row} / ${r.end + 1}`, gridColumn: 1 }}
              >
                <span className="tl-line__month-label">
                  {month.name} <span className="tl-month__year">{year}</span>
                </span>
              </div>
            );
          }
          const { ev } = r;
          const meta = KIND_META[ev.kind];
          const sp = parseWorldDate(ev.start);
          const moon = sp && showMoon ? moonPhase(sp) : null;
          const gc = colOf(r.col);
          // Missions stretch over every row they overlap, so length reads as time.
          // Seasons likewise hold the column for as long as they last.
          const isMission =
            ev.kind === "mission" || ev.kind === "side-mission" || ev.kind === "season";
          const cellRow = isMission ? `${r.tailFrom} / ${r.row + 1}` : r.row;
          return (
            <div key={ev.id} style={{ display: "contents" }}>
              {r.tailFrom < r.row && !isMission && (
                <span
                  className="tl-line__tail"
                  style={{
                    gridRow: `${r.tailFrom} / ${r.row}`,
                    gridColumn: gc,
                    background: meta.color,
                  }}
                />
              )}
              {moon && (
                <div
                  className="tl-line__moon"
                  style={{ gridRow: r.row, gridColumn: colOf(2) }}
                  title={moon.name}
                >
                  {moon.glyph}
                </div>
              )}
              <div className="tl-line__cell" style={{ gridRow: cellRow, gridColumn: gc }}>
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
                  <span className="tl-line__title">
                    {ev.kind === "season" ? seasonName(ev.title) : ev.title}
                  </span>
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

import { useMemo } from "react";
import type { TimelineEvent } from "@/domain/schema";
import type { TimelineEventId } from "@/domain/ids";
import { formatWorldDate, formatWorldSpan, shortWorldDate } from "@/domain/calendar";
import { seasonSpans } from "@/domain/seasons";
import { KIND_META } from "./meta";

const GLYPHS: Record<string, string> = {
  verão: "☀️",
  outono: "🍂",
  inverno: "❄️",
  primavera: "🌱",
};

/**
 * The "seasons" layout: one card per season (newest first), spanning from its
 * start marker to the day before the next one, listing the events that begin in it.
 */
export function TimelineSeasons({
  events,
  selectedId,
  onSelectId,
}: {
  /** Season markers plus whatever other events pass the kind filter. */
  events: TimelineEvent[];
  selectedId: TimelineEventId | null;
  onSelectId: (id: TimelineEventId) => void;
}) {
  const spans = useMemo(() => seasonSpans(events).reverse(), [events]);

  if (spans.length === 0) return <div className="panel__empty">Nenhuma estação registrada.</div>;

  return (
    <div className="tl-seasons">
      {spans.map((s) => (
        <section key={s.marker.id} className="tl-season">
          <button
            type="button"
            className={
              "tl-season__head" + (s.marker.id === selectedId ? " tl-season__head--active" : "")
            }
            onClick={() => onSelectId(s.marker.id)}
          >
            <span className="tl-season__name">
              {GLYPHS[s.name.toLowerCase()] ?? "🗓️"} {s.name}
            </span>
            <span className="tl-season__range">
              {s.end ? formatWorldSpan(s.start, s.end) : `desde ${formatWorldDate(s.start)}`}
              {s.days !== undefined ? ` · ${s.days} dias` : " · em curso"}
            </span>
          </button>
          {s.events.length === 0 ? (
            <div className="tl-month__empty">Sem eventos.</div>
          ) : (
            <ul className="tl-list">
              {s.events.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className={"tl-item" + (ev.id === selectedId ? " tl-item--active" : "")}
                    onClick={() => onSelectId(ev.id)}
                  >
                    <span
                      className="tl-item__dot"
                      style={{ background: KIND_META[ev.kind].color }}
                    />
                    <span className="tl-item__date">{shortWorldDate(ev.start)}</span>
                    <span className="tl-item__title">{ev.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

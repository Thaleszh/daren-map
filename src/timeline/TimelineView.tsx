import { useMemo, useState } from "react";
import type { Atlas } from "@/domain/selectors";
import type { TimelineEvent, TimelineKind } from "@/domain/schema";
import type { ExpeditionId, MemberId, TimelineEventId } from "@/domain/ids";
import {
  ERA_NAME,
  MONTHS,
  WEEKDAYS,
  dayNumber,
  formatWorldDate,
  formatWorldSpan,
  monthKey,
  monthStartWeekday,
  monthsBetween,
  moonPhase,
  nextDay,
  parseWorldDate,
  spanDays,
  weekdayOf,
  worldDate,
} from "@/domain/calendar";
import { MemberChips } from "@/members/MemberChips";
import { KIND_META, KIND_ORDER, MOON_COLOR } from "./meta";
import { TimelineLine } from "./TimelineLine";
import { TimelineSeasons } from "./TimelineSeasons";

export interface TimelineViewProps {
  atlas: Atlas;
  /** Controlled selection, mirrored to the URL by App so a link restores it. */
  selectedId: TimelineEventId | null;
  onSelectId: (id: TimelineEventId) => void;
  onOpenMember: (id: MemberId) => void;
  onOpenExpedition: (id: ExpeditionId) => void;
}

/** Every date an event covers, as `YYYY-MM-DD` strings. */
function daysOf(ev: TimelineEvent): string[] {
  const first = parseWorldDate(ev.start);
  const last = parseWorldDate(ev.end ?? ev.start);
  if (!first || !last) return [];
  const out: string[] = [];
  for (let p = first; dayNumber(p) <= dayNumber(last); p = nextDay(p)) {
    out.push(worldDate(p.year, p.month, p.day));
  }
  return out;
}

/**
 * The in-world timeline: Daren's own calendar, month by month, running beside
 * the real session dates used everywhere else. Left: kind filters and a card per
 * month (a 4-week grid plus that month's events); right: the selected event.
 */
export function TimelineView({
  atlas,
  selectedId,
  onSelectId,
  onOpenMember,
  onOpenExpedition,
}: TimelineViewProps) {
  const [hidden, setHidden] = useState<ReadonlySet<TimelineKind>>(new Set());
  const [showMoon, setShowMoon] = useState(true);
  const [layout, setLayout] = useState<"line" | "calendar" | "seasons">("line");
  // Nothing after the last mission: later entries are future/planned.
  const all = useMemo(() => {
    const every = atlas.timeline();
    const cutoff = every
      .filter((e) => e.kind === "mission" || e.kind === "side-mission")
      .reduce((m, e) => (e.start > m ? e.start : m), "");
    return cutoff ? every.filter((e) => e.start <= cutoff) : every;
  }, [atlas]);
  const events = useMemo(() => all.filter((e) => !hidden.has(e.kind)), [all, hidden]);
  // Season markers define the spans, so they stay even when the "Estação" filter is off.
  const seasonEvents = useMemo(
    () => [...all.filter((e) => e.kind === "season"), ...events.filter((e) => e.kind !== "season")],
    [all, events],
  );
  const selected = selectedId ? atlas.timelineEvent(selectedId) : undefined;

  // Months span the whole timeline (not the filtered one) so toggling a filter
  // never reshuffles the page.
  const months = useMemo(() => {
    if (all.length === 0) return [];
    const last = all.reduce(
      (m, e) => ((e.end ?? e.start) > m ? (e.end ?? e.start) : m),
      all[0]!.start,
    );
    return monthsBetween(monthKey(all[0]!.start), monthKey(last));
  }, [all]);

  const byDay = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const ev of events) {
      for (const day of daysOf(ev)) map.set(day, [...(map.get(day) ?? []), ev]);
    }
    return map;
  }, [events]);

  const selectedDays = useMemo(() => new Set(selected ? daysOf(selected) : []), [selected]);

  function toggle(kind: TimelineKind) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (!next.delete(kind)) next.add(kind);
      return next;
    });
  }

  const firstYear = months[0]?.slice(0, 4).replace(/^0+/, "");
  const lastYear = months.at(-1)?.slice(0, 4).replace(/^0+/, "");

  return (
    <div className="app__body app__body--initiatives">
      <aside className="initiatives__list">
        <div className="initiatives__eyebrow">
          Linha do tempo
          {firstYear && ` · ${firstYear}${lastYear !== firstYear ? `–${lastYear}` : ""}`} ·{" "}
          {ERA_NAME}
        </div>
        <div className="tl-filters" role="group" aria-label="Layout">
          {(["line", "calendar", "seasons"] as const).map((l) => (
            <button
              type="button"
              key={l}
              className={"chip tl-filter" + (layout === l ? "" : " tl-filter--off")}
              aria-pressed={layout === l}
              onClick={() => setLayout(l)}
            >
              {l === "line" ? "Linha" : l === "calendar" ? "Calendário" : "Estações"}
            </button>
          ))}
        </div>
        <div className="tl-filters" role="group" aria-label="Filtrar por tipo">
          {KIND_ORDER.map((kind) => {
            const meta = KIND_META[kind];
            const on = !hidden.has(kind);
            return (
              <button
                type="button"
                key={kind}
                className={"chip tl-filter" + (on ? "" : " tl-filter--off")}
                style={{ borderColor: meta.color, color: meta.color }}
                aria-pressed={on}
                onClick={() => toggle(kind)}
              >
                {meta.label}
              </button>
            );
          })}
          {layout === "calendar" && (
            <button
              type="button"
              className={"chip tl-filter" + (showMoon ? "" : " tl-filter--off")}
              style={{ borderColor: MOON_COLOR, color: MOON_COLOR }}
              aria-pressed={showMoon}
              onClick={() => setShowMoon((v) => !v)}
            >
              🌕 Lua
            </button>
          )}
        </div>
        {all.length === 0 && <div className="panel__empty">Nenhum evento registrado.</div>}
        {layout === "line" && (
          <TimelineLine events={events} selectedId={selected?.id ?? null} onSelectId={onSelectId} />
        )}
        {layout === "seasons" && (
          <TimelineSeasons
            events={seasonEvents}
            selectedId={selected?.id ?? null}
            onSelectId={onSelectId}
          />
        )}
        {layout === "calendar" &&
          months.map((key) => (
            <MonthCard
              key={key}
              monthStr={key}
              events={events}
              byDay={byDay}
              selectedId={selected?.id ?? null}
              selectedDays={selectedDays}
              showMoon={showMoon}
              onSelectId={onSelectId}
            />
          ))}
      </aside>

      {selected ? (
        <TimelineDetail
          key={selected.id}
          atlas={atlas}
          event={selected}
          onOpenMember={onOpenMember}
          onOpenExpedition={onOpenExpedition}
        />
      ) : (
        <div className="initiatives__detail app__panel">
          <div className="panel__empty">Selecione um dia ou evento para ver os detalhes.</div>
        </div>
      )}
    </div>
  );
}

function MonthCard({
  monthStr,
  events,
  byDay,
  selectedId,
  selectedDays,
  showMoon,
  onSelectId,
}: {
  monthStr: string;
  events: TimelineEvent[];
  byDay: Map<string, TimelineEvent[]>;
  selectedId: TimelineEventId | null;
  selectedDays: ReadonlySet<string>;
  showMoon: boolean;
  onSelectId: (id: TimelineEventId) => void;
}) {
  const year = Number(monthStr.slice(0, 4));
  const month = Number(monthStr.slice(5, 7));
  const def = MONTHS[month]!;
  const startsHere = events.filter((e) => monthKey(e.start) === monthStr);
  const dayKey = (day: number) => `${monthStr}-${String(day).padStart(2, "0")}`;
  const hasAny = [...Array(def.days)].some((_, i) => byDay.has(dayKey(i + 1)));

  // Clicking a day picks its first event; clicking again moves to the next one,
  // so overlapping events on one day are all reachable.
  function pickDay(list: TimelineEvent[]) {
    const i = list.findIndex((e) => e.id === selectedId);
    onSelectId(list[(i + 1) % list.length]!.id);
  }

  function cell(day: number) {
    const key = dayKey(day);
    const list = byDay.get(key) ?? [];
    const moon = showMoon ? moonPhase({ year, month, day }) : null;
    const glyph = moon && (
      <span className="tl-day__moon" aria-hidden="true">
        {moon.glyph}
      </span>
    );
    const label = `${formatWorldDate(key)}${moon ? ` (${moon.name})` : ""}${list.length ? `: ${list.map((e) => e.title).join(", ")}` : ""}`;
    if (list.length === 0) {
      return (
        <div key={day} className="tl-day" title={label} aria-label={label}>
          <span className="tl-day__n">{day}</span>
          {glyph}
        </div>
      );
    }
    const colors = [...new Set(list.map((e) => KIND_META[e.kind].color))].slice(0, 3);
    const stops = colors
      .map((c, i) => `${c} ${(i * 100) / colors.length}% ${((i + 1) * 100) / colors.length}%`)
      .join(", ");
    return (
      <button
        type="button"
        key={day}
        className={"tl-day tl-day--has" + (selectedDays.has(key) ? " tl-day--selected" : "")}
        title={label}
        aria-label={label}
        onClick={() => pickDay(list)}
      >
        <span className="tl-day__n">{day}</span>
        {glyph}
        <span className="tl-day__bar" style={{ background: `linear-gradient(90deg, ${stops})` }} />
      </button>
    );
  }

  return (
    <section className="tl-month">
      <h3 className="tl-month__title">
        {def.name} <span className="tl-month__year">{year}</span>
      </h3>
      {hasAny || startsHere.length > 0 || showMoon ? (
        <div className="tl-grid" role="group" aria-label={`${def.name} ${year}`}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="tl-grid__head">
              {w}
            </div>
          ))}
          {/* A month is exactly four weeks, but the year decides which weekday it opens on. */}
          {[...Array(monthStartWeekday(year))].map((_, i) => (
            <div key={`pad${i}`} />
          ))}
          {[...Array(28)].map((_, i) => cell(i + 1))}
          {def.days > 28 && (
            <div className="tl-grid__extra">
              <span className="tl-grid__extra-label">Dia Perdido</span>
              {cell(29)}
            </div>
          )}
        </div>
      ) : (
        <div className="tl-month__empty">Sem eventos.</div>
      )}
      {startsHere.length > 0 && (
        <ul className="tl-list">
          {startsHere.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                className={"tl-item" + (ev.id === selectedId ? " tl-item--active" : "")}
                onClick={() => onSelectId(ev.id)}
              >
                <span className="tl-item__dot" style={{ background: KIND_META[ev.kind].color }} />
                <span className="tl-item__date">{shortSpan(ev)}</span>
                <span className="tl-item__title">{ev.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "4 Feb – 8 Feb" — the month list sits under a year-labelled header, so drop the year. */
function shortSpan(ev: TimelineEvent): string {
  const p = parseWorldDate(ev.start);
  const q = ev.end ? parseWorldDate(ev.end) : undefined;
  if (!p) return ev.start;
  const a = `${p.day} ${MONTHS[p.month]!.short}`;
  if (!q || ev.end === ev.start) return a;
  return `${a} – ${q.day} ${MONTHS[q.month]!.short}`;
}

function TimelineDetail({
  atlas,
  event,
  onOpenMember,
  onOpenExpedition,
}: {
  atlas: Atlas;
  event: TimelineEvent;
  onOpenMember: (id: MemberId) => void;
  onOpenExpedition: (id: ExpeditionId) => void;
}) {
  const meta = KIND_META[event.kind];
  const startParts = parseWorldDate(event.start);
  const weekday = startParts ? weekdayOf(startParts) : null;
  const days = event.end ? spanDays(event.start, event.end) : 1;
  const moon = startParts ? moonPhase(startParts) : null;
  const expedition = event.expeditionId ? atlas.expedition(event.expeditionId) : undefined;

  return (
    <div className="initiatives__detail app__panel">
      <div className="panel__eyebrow">
        {weekday !== null && `${WEEKDAYS[weekday]} · `}
        {formatWorldSpan(event.start, event.end)}
        {days > 1 && ` · ${days} dias`}
      </div>
      <h2 className="panel__title">{event.title}</h2>
      <div className="init-detail__status">
        <span className="chip" style={{ borderColor: meta.color, color: meta.color }}>
          {meta.label}
        </span>
      </div>
      {event.summary && <p className="panel__desc">{event.summary}</p>}

      <dl className="exp-facts">
        {moon && (
          <>
            <dt>Lua</dt>
            <dd>
              {moon.glyph} {moon.name}
            </dd>
          </>
        )}
        {event.places.length > 0 && (
          <>
            <dt>Lugares</dt>
            <dd>{event.places.join(" · ")}</dd>
          </>
        )}
        {event.foes.length > 0 && (
          <>
            <dt>Inimigos</dt>
            <dd>{event.foes.join(" · ")}</dd>
          </>
        )}
        {event.companions.length > 0 && (
          <>
            <dt>Aliados</dt>
            <dd>{event.companions.join(" · ")}</dd>
          </>
        )}
      </dl>

      {event.memberIds.length > 0 && (
        <>
          <div className="panel__section-title">Membros</div>
          <MemberChips atlas={atlas} ids={event.memberIds} onOpenMember={onOpenMember} />
        </>
      )}

      {expedition && (
        <>
          <div className="panel__section-title">Expedição</div>
          <button
            type="button"
            className="chip chip--link"
            onClick={() => onOpenExpedition(expedition.id)}
          >
            {expedition.name}
          </button>
        </>
      )}
    </div>
  );
}

import type { TimelineEvent } from "./schema";
import { parseWorldDate, prevDay, worldDate, spanDays } from "./calendar";

export interface SeasonSpan {
  /** The `season` event that opens it. */
  marker: TimelineEvent;
  /** "Verão", from "Início do verão"; the raw title when it doesn't follow that pattern. */
  name: string;
  start: string;
  /** Last day (inclusive); undefined for the latest season, whose end isn't recorded yet. */
  end?: string | undefined;
  /** Length in days; undefined while open-ended. */
  days?: number | undefined;
  /** Non-season events that start inside the span, chronological. */
  events: TimelineEvent[];
}

export function seasonName(title: string): string {
  const bare = title.replace(/^in[ií]cio d[oa]s?\s+/i, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/**
 * Seasons are not stored: each `season` event marks a start, and the season lasts
 * until the next one begins. Other events belong to the season they start in.
 * Returned chronologically; events before the first marker belong to no season.
 */
export function seasonSpans(all: readonly TimelineEvent[]): SeasonSpan[] {
  const byStart = (a: TimelineEvent, b: TimelineEvent) => a.start.localeCompare(b.start);
  const markers = all.filter((e) => e.kind === "season").sort(byStart);
  const others = all.filter((e) => e.kind !== "season").sort(byStart);

  return markers.map((marker, i) => {
    const next = markers[i + 1];
    const nextParts = next && parseWorldDate(next.start);
    const end = nextParts ? prevDay(nextParts) : undefined;
    const endStr = end && worldDate(end.year, end.month, end.day);
    return {
      marker,
      name: seasonName(marker.title),
      start: marker.start,
      end: endStr,
      days: endStr ? spanDays(marker.start, endStr) : undefined,
      events: others.filter((e) => e.start >= marker.start && (!next || e.start < next.start)),
    };
  });
}

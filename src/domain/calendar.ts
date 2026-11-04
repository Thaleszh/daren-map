/**
 * Daren's calendar — the in-world clock that runs beside the real session dates.
 * Framework-free. A world date is the string `YYYY-MM-DD` with a 4-digit year and
 * a 2-digit month index (`00` = Ascensão, `01` = January … `12` = December), so
 * plain string comparison orders dates correctly.
 *
 * The year has 13 months of 28 days, except December (29): 365 days, no leap
 * years. Because every month but December is exactly four weeks, a month always
 * begins on the same weekday for a whole year; the year's last day (29 December)
 * sits outside the week — the "Lost Day". The next year starts one weekday later.
 */

export interface CalendarMonth {
  name: string;
  short: string;
  days: number;
}

export const MONTHS: readonly CalendarMonth[] = [
  { name: "Ascensão", short: "Asc", days: 28 },
  { name: "January", short: "Jan", days: 28 },
  { name: "February", short: "Feb", days: 28 },
  { name: "March", short: "Mar", days: 28 },
  { name: "April", short: "Apr", days: 28 },
  { name: "May", short: "May", days: 28 },
  { name: "June", short: "Jun", days: 28 },
  { name: "July", short: "Jul", days: 28 },
  { name: "August", short: "Aug", days: 28 },
  { name: "September", short: "Sep", days: 28 },
  { name: "October", short: "Oct", days: 28 },
  { name: "November", short: "Nov", days: 28 },
  { name: "December", short: "Dec", days: 29 },
];

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const DAYS_PER_YEAR = MONTHS.reduce((n, m) => n + m.days, 0);
export const ERA_NAME = "Após Siarel";

/** Year whose months begin on a Sunday; every later year starts one weekday later. */
const WEEKDAY_ANCHOR_YEAR = 560;

export interface WorldDateParts {
  year: number;
  /** 0 = Ascensão … 12 = December. */
  month: number;
  day: number;
}

export const WORLD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse `YYYY-MM-DD`; undefined when malformed or not a real day of Daren's calendar. */
export function parseWorldDate(s: string): WorldDateParts | undefined {
  if (!WORLD_DATE_PATTERN.test(s)) return undefined;
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(5, 7));
  const day = Number(s.slice(8, 10));
  const m = MONTHS[month];
  if (!m || day < 1 || day > m.days) return undefined;
  return { year, month, day };
}

export function worldDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Absolute day count (1-based inside the year); differences are exact day spans. */
export function dayNumber(p: WorldDateParts): number {
  let n = p.year * DAYS_PER_YEAR + p.day;
  for (let i = 0; i < p.month; i++) n += MONTHS[i]!.days;
  return n;
}

/** Inclusive length of a span in days (a one-day event is 1). */
export function spanDays(start: string, end: string): number {
  const a = parseWorldDate(start);
  const b = parseWorldDate(end);
  return a && b ? dayNumber(b) - dayNumber(a) + 1 : 1;
}

/** Weekday index (0 = Dom) a month's 1st falls on that year. */
export function monthStartWeekday(year: number): number {
  return (((year - WEEKDAY_ANCHOR_YEAR) % 7) + 7) % 7;
}

/** Weekday index of a date, or null for the Lost Day (29 Dec), which is outside the week. */
export function weekdayOf(p: WorldDateParts): number | null {
  if (p.day > 28) return null;
  return (monthStartWeekday(p.year) + p.day - 1) % 7;
}

/** "4 Feb 560"; unparseable input is returned untouched. */
export function formatWorldDate(s: string): string {
  const p = parseWorldDate(s);
  return p ? `${p.day} ${MONTHS[p.month]!.short} ${p.year}` : s;
}

/** "4 Feb", for lists already grouped under a year. */
export function shortWorldDate(s: string): string {
  const p = parseWorldDate(s);
  return p ? `${p.day} ${MONTHS[p.month]!.short}` : s;
}

/** "4 Feb – 8 Feb 560", collapsing a one-day event and sharing the year when equal. */
export function formatWorldSpan(start: string, end?: string): string {
  if (!end || end === start) return formatWorldDate(start);
  const a = parseWorldDate(start);
  const b = parseWorldDate(end);
  if (!a || !b) return `${start} – ${end}`;
  const from = a.year === b.year ? `${a.day} ${MONTHS[a.month]!.short}` : formatWorldDate(start);
  return `${from} – ${formatWorldDate(end)}`;
}

/** The day after `p`, rolling over month and year. */
export function nextDay(p: WorldDateParts): WorldDateParts {
  if (p.day < MONTHS[p.month]!.days) return { ...p, day: p.day + 1 };
  if (p.month < MONTHS.length - 1) return { year: p.year, month: p.month + 1, day: 1 };
  return { year: p.year + 1, month: 0, day: 1 };
}

/** The day before `p`, rolling back over month and year. */
export function prevDay(p: WorldDateParts): WorldDateParts {
  if (p.day > 1) return { ...p, day: p.day - 1 };
  if (p.month > 0) return { ...p, month: p.month - 1, day: MONTHS[p.month - 1]!.days };
  return { year: p.year - 1, month: MONTHS.length - 1, day: MONTHS[MONTHS.length - 1]!.days };
}

/** `YYYY-MM` key for grouping events by month. */
export function monthKey(s: string): string {
  return s.slice(0, 7);
}

/** Every `YYYY-MM` from `first` to `last`, inclusive. */
export function monthsBetween(first: string, last: string): string[] {
  const a = parseWorldDate(`${first}-01`);
  const b = parseWorldDate(`${last}-01`);
  if (!a || !b) return [];
  const out: string[] = [];
  let { year, month } = a;
  while (year < b.year || (year === b.year && month <= b.month)) {
    out.push(`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`);
    if (++month >= MONTHS.length) {
      month = 0;
      year++;
    }
  }
  return out;
}

export interface MoonPhase {
  /** Days since the new moon, 0–27. */
  step: number;
  name: string;
  glyph: string;
}

const MOON_PHASES = [
  ["Sem lua", "🌑"],
  ["Lua crescente", "🌒"],
  ["Quarto crescente", "🌓"],
  ["Gibosa crescente", "🌔"],
  ["Lua cheia", "🌕"],
  ["Gibosa minguante", "🌖"],
  ["Quarto minguante", "🌗"],
  ["Lua minguante", "🌘"],
] as const;

/** Day of the month the moon is absent (it is full 14 days earlier or later). */
const NEW_MOON_DAY = 24;

/**
 * The moon on a given day. Each 28-day month holds two 14-day half-cycles —
 * full on the 10th, none on the 24th — so the phase depends only on the day of
 * the month. The Lost Day (29 Dec) has no moon, like it has no weekday.
 */
export function moonPhase(p: WorldDateParts): MoonPhase | null {
  if (p.day > 28) return null;
  const step = (p.day - NEW_MOON_DAY + 28) % 28;
  const [name, glyph] = MOON_PHASES[Math.round(step / 3.5) % 8]!;
  return { step, name, glyph };
}

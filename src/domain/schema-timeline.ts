import { z } from "zod";
import { ExpeditionIdSchema, MemberIdSchema, TimelineEventIdSchema } from "./ids";
import { WORLD_DATE_PATTERN, parseWorldDate } from "./calendar";

/* ------------------------------------------------------------------ timeline */

/**
 * A date on Daren's own calendar (see `calendar.ts`), `YYYY-MM-DD` with month
 * `00` = Ascensão. Distinct from the real-world session dates used elsewhere.
 */
export const WorldDateSchema = z
  .string()
  .regex(WORLD_DATE_PATTERN, "expected a YYYY-MM-DD world date")
  .refine((s) => parseWorldDate(s) !== undefined, "not a valid day of Daren's calendar");

export const TimelineKindSchema = z.enum([
  "mission",
  "side-mission",
  "meeting",
  "festivity",
  "season",
]);
export type TimelineKind = z.infer<typeof TimelineKindSchema>;

/**
 * Something that happens on the in-world calendar — a job, a guild meeting, a
 * festival, a change of season. (Moon phases are derived from the date, not stored.) The world clock runs in parallel
 * with the real session dates; an event may point at the expedition it belongs
 * to. A one-day event has no `end`.
 */
export const TimelineEventSchema = z.object({
  id: TimelineEventIdSchema,
  title: z.string().min(1),
  kind: TimelineKindSchema,
  start: WorldDateSchema,
  /** Last day (inclusive); omitted for a one-day event or a marker like a season start. */
  end: WorldDateSchema.optional(),
  summary: z.string().default(""),
  /** Guild members who took part. */
  memberIds: z.array(MemberIdSchema).default([]),
  /** Participants who aren't on the guild roster, by name. */
  companions: z.array(z.string().min(1)).default([]),
  /** Where it happened, as free text (regions, sites). */
  places: z.array(z.string().min(1)).default([]),
  /** Who or what the party faced. */
  foes: z.array(z.string().min(1)).default([]),
  expeditionId: ExpeditionIdSchema.optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

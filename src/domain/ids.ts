import { z } from "zod";

/**
 * Branded ID types.
 *
 * A branded string is still a `string` at runtime, but the compiler treats
 * `FactionId` and `AreaId` as incompatible. This makes it a *compile error*
 * to pass an area id where a faction id is expected — a whole class of bugs
 * ("I indexed factions by the wrong id") simply cannot be written.
 *
 * The brand and the runtime schema come from the *same* Zod definition, so the
 * inferred type and validated value can never drift apart.
 */

const idBase = z.string().min(1);

export const LevelIdSchema = idBase.brand<"LevelId">();
export const DistrictIdSchema = idBase.brand<"DistrictId">();
export const AreaIdSchema = idBase.brand<"AreaId">();
export const FactionIdSchema = idBase.brand<"FactionId">();
export const ElevatorIdSchema = idBase.brand<"ElevatorId">();
export const LandmarkIdSchema = idBase.brand<"LandmarkId">();
export const NpcIdSchema = idBase.brand<"NpcId">();
export const ProjectIdSchema = idBase.brand<"ProjectId">();
export const EventIdSchema = idBase.brand<"EventId">();

export type LevelId = z.infer<typeof LevelIdSchema>;
export type DistrictId = z.infer<typeof DistrictIdSchema>;
export type AreaId = z.infer<typeof AreaIdSchema>;
export type FactionId = z.infer<typeof FactionIdSchema>;
export type ElevatorId = z.infer<typeof ElevatorIdSchema>;
export type LandmarkId = z.infer<typeof LandmarkIdSchema>;
export type NpcId = z.infer<typeof NpcIdSchema>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;

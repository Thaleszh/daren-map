import { z } from "zod";
import { FactionIdSchema, GroupingIdSchema } from "./ids";
import {
  FactionSchema,
  GroupingSchema,
  LandmarkSchema,
  NpcSchema,
  PointSchema,
  PresenceSchema,
  type Faction,
  type Landmark,
  type Npc,
  type Point,
  type Presence,
  type WorldInput,
} from "./schema";

/**
 * Hand-authored annotations that live *outside* the generated world.
 *
 * The world geometry is generated from the PSD (see scripts/), but the GM also
 * authors content live in the in-app annotate tool. Keeping it in a separate
 * file means re-generating the world from the PSD never clobbers this manual
 * work — it is merged back on top at load time. Authored here:
 *
 * - **polygons** — per-area traced outlines (areaId → vertices).
 * - **landmarks** — appended points of interest.
 * - **npcs / factions** — override a generated entity *by id*, or add new ones.
 * - **presence** — override a faction's influence/power in an area (keyed by the
 *   `(area, faction)` pair), or add a new footing. This is the live GM loop that
 *   recolors the map.
 * - **memberships** — move a faction to another group of a generated grouping
 *   (or out of every group), keyed by `(grouping, faction)`. Groups themselves
 *   stay generated; this is how "Relação com os Sem Cores" changes in play.
 */

/** Put `factionId` in `groupId` within `groupingId`; `null` = in no group. */
export const MembershipSchema = z.object({
  groupingId: GroupingIdSchema,
  factionId: FactionIdSchema,
  groupId: FactionIdSchema.nullable(),
});
export type Membership = z.infer<typeof MembershipSchema>;
export const AnnotationsSchema = z.object({
  /** areaId → traced polygon vertices, in the level's coordinate space. */
  polygons: z.record(z.string(), z.array(PointSchema)).default({}),
  landmarks: z.array(LandmarkSchema).default([]),
  npcs: z.array(NpcSchema).default([]),
  factions: z.array(FactionSchema).default([]),
  presence: z.array(PresenceSchema).default([]),
  memberships: z.array(MembershipSchema).default([]),
});
export type Annotations = z.input<typeof AnnotationsSchema>;

/**
 * The in-memory shape used by the annotate tool: fully-formed (validated-shape)
 * entities and a plain polygon map. Distinct from {@link Annotations}, which is
 * the looser on-disk/input shape merged at load time.
 */
export interface WorkingAnnotations {
  polygons: Record<string, Point[]>;
  landmarks: Landmark[];
  npcs: Npc[];
  factions: Faction[];
  presence: Presence[];
  memberships: Membership[];
}

/** Empty annotations, for a fresh start. */
export const EMPTY_ANNOTATIONS: WorkingAnnotations = {
  polygons: {},
  landmarks: [],
  npcs: [],
  factions: [],
  presence: [],
  memberships: [],
};

/** Fill any missing collections so a partial on-disk file is safe to work with. */
export function normalizeAnnotations(ann: Partial<WorkingAnnotations>): WorkingAnnotations {
  return {
    polygons: ann.polygons ?? {},
    landmarks: ann.landmarks ?? [],
    npcs: ann.npcs ?? [],
    factions: ann.factions ?? [],
    presence: ann.presence ?? [],
    memberships: ann.memberships ?? [],
  };
}

/** Override entries in `base` whose key matches an entry in `over`, then append the rest. */
function upsert<T>(base: readonly T[], over: readonly T[], key: (t: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const b of base) merged.set(key(b), b);
  for (const o of over) merged.set(key(o), o);
  return [...merged.values()];
}

type GroupingInput = z.input<typeof GroupingSchema>;

/**
 * Apply membership moves to generated groupings. A move naming a grouping or
 * group that no longer exists (renamed in the generator) is left unapplied, so
 * the faction stays where the generator put it.
 */
export function applyMemberships(
  groupings: readonly GroupingInput[],
  moves: readonly z.input<typeof MembershipSchema>[],
): GroupingInput[] {
  return groupings.map((grouping) => {
    const mine = moves.filter((m) => m.groupingId === grouping.id);
    if (mine.length === 0) return grouping;
    const groupIds = new Set(grouping.groups.map((g) => String(g.id)));
    const target = new Map<string, string | null>();
    for (const m of mine) {
      if (m.groupId === null || groupIds.has(String(m.groupId))) {
        target.set(String(m.factionId), m.groupId === null ? null : String(m.groupId));
      }
    }
    return {
      ...grouping,
      groups: grouping.groups.map((g) => {
        const kept = (g.members ?? []).filter((f) => !target.has(String(f)));
        const added = [...target].filter(([, gid]) => gid === String(g.id)).map(([f]) => f);
        return { ...g, members: [...kept, ...added] as typeof kept };
      }),
    };
  });
}

const presenceKey = (p: { areaId: unknown; factionId: unknown }): string =>
  `${String(p.areaId)}::${String(p.factionId)}`;

/**
 * Overlay annotations onto a raw world: attach traced polygons to their areas,
 * append landmarks, and let hand-authored npcs/factions/presence override their
 * generated counterparts (by id, or by area+faction for presence) or add new
 * ones. Runs before {@link loadWorld} so everything is validated together.
 */
export function mergeAnnotations(world: WorldInput, ann: Annotations): WorldInput {
  const polygons = ann.polygons ?? {};
  const areas = world.areas.map((a) => {
    const poly = polygons[a.id as string];
    return poly && poly.length >= 3 ? { ...a, polygon: poly } : a;
  });
  return {
    ...world,
    areas,
    factions: upsert(world.factions, ann.factions ?? [], (f) => String(f.id)),
    npcs: upsert(world.npcs ?? [], ann.npcs ?? [], (n) => String(n.id)),
    presence: upsert(world.presence, ann.presence ?? [], presenceKey),
    landmarks: [...(world.landmarks ?? []), ...(ann.landmarks ?? [])],
    groupings: applyMemberships(world.groupings ?? [], ann.memberships ?? []),
  };
}

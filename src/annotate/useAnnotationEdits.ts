import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Membership, WorkingAnnotations } from "@/domain/annotations";
import type {
  Expedition,
  Faction,
  Initiative,
  Landmark,
  Npc,
  Point,
  Presence,
} from "@/domain/schema";
import type {
  AreaId,
  ExpeditionId,
  FactionId,
  GroupingId,
  InitiativeId,
  LandmarkId,
  NpcId,
} from "@/domain/ids";

/** New-entity payloads (id is generated on add). */
export type NewLandmark = Omit<Landmark, "id">;
export type NewNpc = Omit<Npc, "id">;
export type NewFaction = Omit<Faction, "id">;
export type NewInitiative = Omit<Initiative, "id">;
export type NewExpedition = Omit<Expedition, "id">;

export type SetAnnotations = Dispatch<SetStateAction<WorkingAnnotations>>;

/** Slugify a name into an id stem, keeping it unique against `taken`. */
export function uniqueId(stem: string, prefix: string, taken: Set<string>): string {
  const base =
    stem
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || prefix;
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

/* ------------------------------------------------------------- edit groups */
// Each group is an independent slice of the working annotations, split out so
// no single function (and no single reader) has to hold the whole editor at
// once. They all mutate through the shared `setAnnotations` dispatch.

export function usePolygonEdits(setAnnotations: SetAnnotations) {
  const setPolygon = useCallback(
    (areaId: string, points: Point[]) => {
      setAnnotations((a) => ({ ...a, polygons: { ...a.polygons, [areaId]: points } }));
    },
    [setAnnotations],
  );

  const clearPolygon = useCallback(
    (areaId: string) => {
      setAnnotations((a) => {
        const next = { ...a.polygons };
        delete next[areaId];
        return { ...a, polygons: next };
      });
    },
    [setAnnotations],
  );

  return { setPolygon, clearPolygon };
}

export function useLandmarkEdits(setAnnotations: SetAnnotations) {
  const addLandmark = useCallback(
    (lm: NewLandmark): string => {
      const id = `lm-${crypto.randomUUID().slice(0, 8)}`;
      setAnnotations((a) => ({
        ...a,
        landmarks: [...a.landmarks, { ...lm, id: id as LandmarkId }],
      }));
      return id;
    },
    [setAnnotations],
  );

  const updateLandmark = useCallback(
    (id: string, patch: Partial<NewLandmark>) => {
      setAnnotations((a) => ({
        ...a,
        landmarks: a.landmarks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    },
    [setAnnotations],
  );

  const removeLandmark = useCallback(
    (id: string) => {
      setAnnotations((a) => ({ ...a, landmarks: a.landmarks.filter((l) => l.id !== id) }));
    },
    [setAnnotations],
  );

  return { addLandmark, updateLandmark, removeLandmark };
}

export function useNpcEdits(setAnnotations: SetAnnotations) {
  const addNpc = useCallback(
    (npc: NewNpc): string => {
      const id = `npc-${crypto.randomUUID().slice(0, 8)}`;
      setAnnotations((a) => ({ ...a, npcs: [...a.npcs, { ...npc, id: id as NpcId }] }));
      return id;
    },
    [setAnnotations],
  );

  /** Override a generated (or annotation) npc by writing an entry with its id. */
  const upsertNpc = useCallback(
    (npc: Npc) => {
      setAnnotations((a) => {
        const exists = a.npcs.some((n) => n.id === npc.id);
        return {
          ...a,
          npcs: exists ? a.npcs.map((n) => (n.id === npc.id ? npc : n)) : [...a.npcs, npc],
        };
      });
    },
    [setAnnotations],
  );

  const removeNpc = useCallback(
    (id: string) => {
      setAnnotations((a) => ({ ...a, npcs: a.npcs.filter((n) => n.id !== id) }));
    },
    [setAnnotations],
  );

  return { addNpc, upsertNpc, removeNpc };
}

export function useFactionEdits(setAnnotations: SetAnnotations) {
  const addFaction = useCallback(
    (fac: NewFaction, takenIds: string[]): string => {
      const id = uniqueId(fac.name, "faction", new Set(takenIds));
      setAnnotations((a) => ({ ...a, factions: [...a.factions, { ...fac, id: id as FactionId }] }));
      return id;
    },
    [setAnnotations],
  );

  /** Override a generated (or annotation) faction by writing an entry with its id. */
  const upsertFaction = useCallback(
    (fac: Faction) => {
      setAnnotations((a) => {
        const exists = a.factions.some((f) => f.id === fac.id);
        return {
          ...a,
          factions: exists
            ? a.factions.map((f) => (f.id === fac.id ? fac : f))
            : [...a.factions, fac],
        };
      });
    },
    [setAnnotations],
  );

  /** Drop a faction override (reverts a generated faction; removes a new one). */
  const removeFaction = useCallback(
    (id: string) => {
      setAnnotations((a) => ({ ...a, factions: a.factions.filter((f) => f.id !== id) }));
    },
    [setAnnotations],
  );

  return { addFaction, upsertFaction, removeFaction };
}

export function usePresenceEdits(setAnnotations: SetAnnotations) {
  /** Upsert a faction's influence/power in an area (one entry per area+faction). */
  const setPresence = useCallback(
    (areaId: string, factionId: string, influence: number, power: number, note = "") => {
      setAnnotations((a) => {
        const match = (p: Presence) => p.areaId === areaId && p.factionId === factionId;
        const entry: Presence = {
          areaId: areaId as AreaId,
          factionId: factionId as FactionId,
          influence,
          power,
          note,
        };
        const exists = a.presence.some(match);
        return {
          ...a,
          presence: exists ? a.presence.map((p) => (match(p) ? entry : p)) : [...a.presence, entry],
        };
      });
    },
    [setAnnotations],
  );

  return { setPresence };
}

export function useMembershipEdits(setAnnotations: SetAnnotations) {
  /** Place a faction in a group of a grouping (`null` = no group); one entry per pair. */
  const setMembership = useCallback(
    (groupingId: string, factionId: string, groupId: string | null) => {
      setAnnotations((a) => {
        const others = a.memberships.filter(
          (m) => !(m.groupingId === groupingId && m.factionId === factionId),
        );
        const entry: Membership = {
          groupingId: groupingId as GroupingId,
          factionId: factionId as FactionId,
          groupId: groupId as FactionId | null,
        };
        return { ...a, memberships: [...others, entry] };
      });
    },
    [setAnnotations],
  );

  /** Drop the override so the faction goes back to its generated group. */
  const clearMembership = useCallback(
    (groupingId: string, factionId: string) => {
      setAnnotations((a) => ({
        ...a,
        memberships: a.memberships.filter(
          (m) => !(m.groupingId === groupingId && m.factionId === factionId),
        ),
      }));
    },
    [setAnnotations],
  );

  return { setMembership, clearMembership };
}

export function useInitiativeEdits(setAnnotations: SetAnnotations) {
  const addInitiative = useCallback(
    (init: NewInitiative, takenIds: string[]): string => {
      const id = uniqueId(`init ${init.name}`, "init", new Set(takenIds));
      setAnnotations((a) => ({
        ...a,
        initiatives: [...a.initiatives, { ...init, id: id as InitiativeId }],
      }));
      return id;
    },
    [setAnnotations],
  );

  /** Override a generated (or annotation) initiative by writing an entry with its id. */
  const upsertInitiative = useCallback(
    (init: Initiative) => {
      setAnnotations((a) => {
        const exists = a.initiatives.some((i) => i.id === init.id);
        return {
          ...a,
          initiatives: exists
            ? a.initiatives.map((i) => (i.id === init.id ? init : i))
            : [...a.initiatives, init],
        };
      });
    },
    [setAnnotations],
  );

  /** Drop an initiative override (reverts a generated one; removes a new one). */
  const removeInitiative = useCallback(
    (id: string) => {
      setAnnotations((a) => ({ ...a, initiatives: a.initiatives.filter((i) => i.id !== id) }));
    },
    [setAnnotations],
  );

  return { addInitiative, upsertInitiative, removeInitiative };
}

export function useExpeditionEdits(setAnnotations: SetAnnotations) {
  const addExpedition = useCallback(
    (exp: NewExpedition, takenIds: string[]): string => {
      const id = uniqueId(`exp ${exp.name}`, "exp", new Set(takenIds));
      setAnnotations((a) => ({
        ...a,
        expeditions: [...a.expeditions, { ...exp, id: id as ExpeditionId }],
      }));
      return id;
    },
    [setAnnotations],
  );

  /** Override a generated (or annotation) expedition by writing an entry with its id. */
  const upsertExpedition = useCallback(
    (exp: Expedition) => {
      setAnnotations((a) => {
        const exists = a.expeditions.some((e) => e.id === exp.id);
        return {
          ...a,
          expeditions: exists
            ? a.expeditions.map((e) => (e.id === exp.id ? exp : e))
            : [...a.expeditions, exp],
        };
      });
    },
    [setAnnotations],
  );

  /** Drop an expedition override (reverts a generated one; removes a new one). */
  const removeExpedition = useCallback(
    (id: string) => {
      setAnnotations((a) => ({ ...a, expeditions: a.expeditions.filter((e) => e.id !== id) }));
    },
    [setAnnotations],
  );

  return { addExpedition, upsertExpedition, removeExpedition };
}

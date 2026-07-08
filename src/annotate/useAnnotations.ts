import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeAnnotations, type WorkingAnnotations } from "@/domain/annotations";
import type { Faction, Landmark, Npc, Point, Presence } from "@/domain/schema";
import type { AreaId, FactionId, LandmarkId, NpcId } from "@/domain/ids";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** New-entity payloads (id is generated on add). */
export type NewLandmark = Omit<Landmark, "id">;
export type NewNpc = Omit<Npc, "id">;
export type NewFaction = Omit<Faction, "id">;

/** Slugify a name into an id stem, keeping it unique against `taken`. */
function uniqueId(stem: string, prefix: string, taken: Set<string>): string {
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

/**
 * Working state for the annotate tool: traced polygons, landmarks, and
 * hand-authored npcs / factions / presence overrides. `annotations.json` (via
 * `initial`) is the single source of truth on startup — no localStorage cache,
 * so a stale copy can never shadow (or clobber, on save) the file. "Save to
 * file" posts to the dev server (see saveAnnotationsPlugin) writing
 * src/data/annotations.json.
 */
export function useAnnotations(initial: WorkingAnnotations) {
  const [annotations, setAnnotations] = useState<WorkingAnnotations>(() =>
    normalizeAnnotations(initial),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);

  // Mark the working state dirty ("idle") after each edit, but not on mount.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("idle");
  }, [annotations]);

  /* ----------------------------------------------------------- polygons */

  const setPolygon = useCallback((areaId: string, points: Point[]) => {
    setAnnotations((a) => ({
      ...a,
      polygons: { ...a.polygons, [areaId]: points },
    }));
  }, []);

  const clearPolygon = useCallback((areaId: string) => {
    setAnnotations((a) => {
      const next = { ...a.polygons };
      delete next[areaId];
      return { ...a, polygons: next };
    });
  }, []);

  /* ---------------------------------------------------------- landmarks */

  const addLandmark = useCallback((lm: NewLandmark): string => {
    const id = `lm-${crypto.randomUUID().slice(0, 8)}`;
    setAnnotations((a) => ({
      ...a,
      landmarks: [...a.landmarks, { ...lm, id: id as LandmarkId }],
    }));
    return id;
  }, []);

  const updateLandmark = useCallback((id: string, patch: Partial<NewLandmark>) => {
    setAnnotations((a) => ({
      ...a,
      landmarks: a.landmarks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);

  const removeLandmark = useCallback((id: string) => {
    setAnnotations((a) => ({ ...a, landmarks: a.landmarks.filter((l) => l.id !== id) }));
  }, []);

  /* --------------------------------------------------------------- npcs */

  const addNpc = useCallback((npc: NewNpc): string => {
    const id = `npc-${crypto.randomUUID().slice(0, 8)}`;
    setAnnotations((a) => ({ ...a, npcs: [...a.npcs, { ...npc, id: id as NpcId }] }));
    return id;
  }, []);

  /** Override a generated (or annotation) npc by writing an entry with its id. */
  const upsertNpc = useCallback((npc: Npc) => {
    setAnnotations((a) => {
      const exists = a.npcs.some((n) => n.id === npc.id);
      return {
        ...a,
        npcs: exists ? a.npcs.map((n) => (n.id === npc.id ? npc : n)) : [...a.npcs, npc],
      };
    });
  }, []);

  const removeNpc = useCallback((id: string) => {
    setAnnotations((a) => ({ ...a, npcs: a.npcs.filter((n) => n.id !== id) }));
  }, []);

  /* ----------------------------------------------------------- factions */

  const addFaction = useCallback((fac: NewFaction, takenIds: string[]): string => {
    const id = uniqueId(fac.name, "faction", new Set(takenIds));
    setAnnotations((a) => ({ ...a, factions: [...a.factions, { ...fac, id: id as FactionId }] }));
    return id;
  }, []);

  /** Override a generated (or annotation) faction by writing an entry with its id. */
  const upsertFaction = useCallback((fac: Faction) => {
    setAnnotations((a) => {
      const exists = a.factions.some((f) => f.id === fac.id);
      return {
        ...a,
        factions: exists ? a.factions.map((f) => (f.id === fac.id ? fac : f)) : [...a.factions, fac],
      };
    });
  }, []);

  /** Drop a faction override (reverts a generated faction; removes a new one). */
  const removeFaction = useCallback((id: string) => {
    setAnnotations((a) => ({ ...a, factions: a.factions.filter((f) => f.id !== id) }));
  }, []);

  /* ----------------------------------------------------------- presence */

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
    [],
  );

  /* -------------------------------------------------------- persistence */

  const resetFromFile = useCallback(() => {
    setAnnotations(normalizeAnnotations(initial));
  }, [initial]);

  const saveToFile = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/__save-annotations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(annotations, null, 2),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [annotations]);

  return {
    annotations,
    saveState,
    setPolygon,
    clearPolygon,
    addLandmark,
    updateLandmark,
    removeLandmark,
    addNpc,
    upsertNpc,
    removeNpc,
    addFaction,
    upsertFaction,
    removeFaction,
    setPresence,
    resetFromFile,
    saveToFile,
  };
}

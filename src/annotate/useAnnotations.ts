import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { normalizeAnnotations, type WorkingAnnotations } from "@/domain/annotations";
import type { Faction, Landmark, Npc, Point, Presence } from "@/domain/schema";
import type { AreaId, FactionId, LandmarkId, NpcId } from "@/domain/ids";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** New-entity payloads (id is generated on add). */
export type NewLandmark = Omit<Landmark, "id">;
export type NewNpc = Omit<Npc, "id">;
export type NewFaction = Omit<Faction, "id">;

type SetAnnotations = Dispatch<SetStateAction<WorkingAnnotations>>;

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

/* ------------------------------------------------------------- edit groups */
// Each group is an independent slice of the working annotations, split out so
// no single function (and no single reader) has to hold the whole editor at
// once. They all mutate through the shared `setAnnotations` dispatch.

function usePolygonEdits(setAnnotations: SetAnnotations) {
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

function useLandmarkEdits(setAnnotations: SetAnnotations) {
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

function useNpcEdits(setAnnotations: SetAnnotations) {
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

function useFactionEdits(setAnnotations: SetAnnotations) {
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

function usePresenceEdits(setAnnotations: SetAnnotations) {
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

/** Save-to-file / reset-from-file, plus the save-status state they drive. */
function usePersistence(annotations: WorkingAnnotations) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveToFile = useCallback(async () => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/__save-annotations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(annotations, null, 2),
      });
      if (!res.ok) {
        // Surface the server's reason (the dev endpoint replies { error }) so a
        // failed save isn't a silent dead end for the GM.
        const detail = await res
          .json()
          .then((b) => (b && typeof b.error === "string" ? b.error : ""))
          .catch(() => "");
        throw new Error(detail || `HTTP ${res.status}`);
      }
      setSaveState("saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaveState("error");
    }
  }, [annotations]);

  return { saveState, saveError, setSaveState, saveToFile };
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
  const firstRun = useRef(true);

  const polygons = usePolygonEdits(setAnnotations);
  const landmarks = useLandmarkEdits(setAnnotations);
  const npcs = useNpcEdits(setAnnotations);
  const factions = useFactionEdits(setAnnotations);
  const presence = usePresenceEdits(setAnnotations);
  const persistence = usePersistence(annotations);
  const { setSaveState } = persistence;

  // Mark the working state dirty ("idle") after each edit, but not on mount.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("idle");
  }, [annotations, setSaveState]);

  const resetFromFile = useCallback(() => {
    setAnnotations(normalizeAnnotations(initial));
  }, [initial]);

  return {
    annotations,
    saveState: persistence.saveState,
    saveError: persistence.saveError,
    ...polygons,
    ...landmarks,
    ...npcs,
    ...factions,
    ...presence,
    resetFromFile,
    saveToFile: persistence.saveToFile,
  };
}

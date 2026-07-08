import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { buildCityscape, newBuilding, toCityscapeRecord, type DrawBuilding } from "@/map/cityscape";
import type { CityscapeStoreFile } from "@/map/cityscapeStore";
import type { Point, Polygon } from "@/domain/schema";
import type { SaveState } from "./useAnnotations";

type SetStore = Dispatch<SetStateAction<CityscapeStoreFile>>;

/** Bake/edit ops on the per-area records, split out to keep the hook small. */
function useCityscapeEdits(setStore: SetStore) {
  /** Replace one area's record with a fresh algorithmic bake at `density`. */
  const generateArea = useCallback(
    (areaId: string, polygon: Polygon, density: number) => {
      const city = buildCityscape(polygon, { seed: areaId });
      setStore((s) => ({
        ...s,
        areas: { ...s.areas, [areaId]: toCityscapeRecord(city, density) },
      }));
    },
    [setStore],
  );

  const updateBuildings = useCallback(
    (areaId: string, fn: (b: DrawBuilding[]) => DrawBuilding[]) => {
      setStore((s) => {
        const rec = s.areas[areaId];
        if (!rec) return s;
        return { ...s, areas: { ...s.areas, [areaId]: { ...rec, buildings: fn(rec.buildings) } } };
      });
    },
    [setStore],
  );

  const moveBuilding = useCallback(
    (areaId: string, i: number, p: Point) =>
      updateBuildings(areaId, (bs) =>
        bs.map((b, idx) => (idx === i ? { ...b, cx: p.x, cy: p.y } : b)),
      ),
    [updateBuildings],
  );
  const addBuilding = useCallback(
    (areaId: string, p: Point) => updateBuildings(areaId, (bs) => [...bs, newBuilding(p.x, p.y)]),
    [updateBuildings],
  );
  const removeBuilding = useCallback(
    (areaId: string, i: number) =>
      updateBuildings(areaId, (bs) => bs.filter((_, idx) => idx !== i)),
    [updateBuildings],
  );

  /** Drop an area's baked record entirely — it falls back to live generation. */
  const clearArea = useCallback(
    (areaId: string) => {
      setStore((s) => {
        const next = { ...s.areas };
        delete next[areaId];
        return { ...s, areas: next };
      });
    },
    [setStore],
  );

  return { generateArea, moveBuilding, addBuilding, removeBuilding, clearArea };
}

/** Save-to-file / save-status for the cityscape store (own dev endpoint). */
function usePersistence(store: CityscapeStoreFile) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveToFile = useCallback(async () => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/__save-cityscapes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(store),
      });
      if (!res.ok) {
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
  }, [store]);

  return { saveState, saveError, setSaveState, saveToFile };
}

/**
 * Working state for the **cityscape** annotate tool: the baked ("blessed") city
 * geometry per area. Persists to the separate `src/data/cityscapes.json` (via
 * the dev-only `/__save-cityscapes` endpoint), since a cityscape is a rendering
 * concern kept out of the world/annotations model. The file is the single
 * source of truth — no localStorage cache to shadow or clobber it on save.
 */
export function useCityscapes(initial: CityscapeStoreFile) {
  const [store, setStore] = useState<CityscapeStoreFile>(() => ({
    version: initial.version ?? 1,
    areas: { ...(initial.areas ?? {}) },
  }));
  const edits = useCityscapeEdits(setStore);
  const persistence = usePersistence(store);
  const { setSaveState } = persistence;
  const firstRun = useRef(true);

  // Any edit marks the working copy dirty (but not the initial mount).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("idle");
  }, [store, setSaveState]);

  const getArea = useCallback((areaId: string) => store.areas[areaId], [store]);
  const resetFromFile = useCallback(() => {
    setStore({ version: initial.version ?? 1, areas: { ...(initial.areas ?? {}) } });
  }, [initial]);

  return {
    store,
    saveState: persistence.saveState,
    saveError: persistence.saveError,
    getArea,
    ...edits,
    resetFromFile,
    saveToFile: persistence.saveToFile,
  };
}

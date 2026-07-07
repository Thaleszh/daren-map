import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkingAnnotations } from "@/domain/annotations";
import type { Landmark, Point } from "@/domain/schema";
import type { LandmarkId } from "@/domain/ids";

const LS_KEY = "daren-annotations";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** New-landmark payload (id is generated on add). */
export type NewLandmark = Omit<Landmark, "id">;

/**
 * Working state for the annotate tool: traced polygons + landmarks, mirrored to
 * localStorage so a refresh never loses work, with a "save to file" that posts
 * to the dev server (see saveAnnotationsPlugin) writing src/data/annotations.json.
 */
export function useAnnotations(initial: WorkingAnnotations) {
  const [annotations, setAnnotations] = useState<WorkingAnnotations>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return JSON.parse(stored) as WorkingAnnotations;
    } catch {
      /* ignore malformed local copy */
    }
    return initial;
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(annotations));
    } catch {
      /* storage full / unavailable — file save is the durable path */
    }
    setSaveState("idle");
  }, [annotations]);

  const setPolygon = useCallback((areaId: string, points: Point[]) => {
    setAnnotations((a) => ({
      ...a,
      polygons: { ...(a.polygons ?? {}), [areaId]: points },
    }));
  }, []);

  const clearPolygon = useCallback((areaId: string) => {
    setAnnotations((a) => {
      const next = { ...(a.polygons ?? {}) };
      delete next[areaId];
      return { ...a, polygons: next };
    });
  }, []);

  const addLandmark = useCallback((lm: NewLandmark): string => {
    const id = `lm-${crypto.randomUUID().slice(0, 8)}`;
    setAnnotations((a) => ({
      ...a,
      landmarks: [...(a.landmarks ?? []), { ...lm, id: id as LandmarkId }],
    }));
    return id;
  }, []);

  const updateLandmark = useCallback((id: string, patch: Partial<NewLandmark>) => {
    setAnnotations((a) => ({
      ...a,
      landmarks: (a.landmarks ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);

  const removeLandmark = useCallback((id: string) => {
    setAnnotations((a) => ({
      ...a,
      landmarks: (a.landmarks ?? []).filter((l) => l.id !== id),
    }));
  }, []);

  const resetFromFile = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setAnnotations(initial);
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
    resetFromFile,
    saveToFile,
  };
}

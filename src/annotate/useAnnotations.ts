import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeAnnotations, type WorkingAnnotations } from "@/domain/annotations";
import {
  useExpeditionEdits,
  useFactionEdits,
  useInitiativeEdits,
  useLandmarkEdits,
  useMembershipEdits,
  useNpcEdits,
  usePolygonEdits,
  usePresenceEdits,
} from "./useAnnotationEdits";

export type {
  NewExpedition,
  NewFaction,
  NewInitiative,
  NewLandmark,
  NewNpc,
} from "./useAnnotationEdits";

export type SaveState = "idle" | "saving" | "saved" | "error";

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
  const memberships = useMembershipEdits(setAnnotations);
  const initiatives = useInitiativeEdits(setAnnotations);
  const expeditions = useExpeditionEdits(setAnnotations);
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
    ...memberships,
    ...initiatives,
    ...expeditions,
    resetFromFile,
    saveToFile: persistence.saveToFile,
  };
}

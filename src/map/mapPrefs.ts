import type { FactionId } from "@/domain/ids";
import { LENSES, type MapLens } from "./lenses";

/**
 * The map's persisted display preferences — everything the settings menu owns.
 * Marker visibility is deliberately *not* here: it stays a live, un-persisted
 * quick-toggle next to the gear (see MapView).
 */
export interface MapPrefs {
  lens: MapLens;
  focusFactionId: FactionId | null;
  showElevators: boolean;
  parchment: boolean;
}

export const DEFAULT_MAP_PREFS: MapPrefs = {
  lens: "bairro",
  focusFactionId: null,
  showElevators: true,
  parchment: true,
};

const LENS_KEYS = new Set<string>(LENSES.map((l) => l.key));

/** Guards a value pulled from localStorage before it's trusted as MapPrefs. */
export function isMapPrefs(value: unknown): value is MapPrefs {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.lens === "string" &&
    LENS_KEYS.has(p.lens) &&
    (p.focusFactionId === null || typeof p.focusFactionId === "string") &&
    typeof p.showElevators === "boolean" &&
    typeof p.parchment === "boolean"
  );
}

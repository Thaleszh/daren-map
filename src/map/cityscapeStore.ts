import type { CityscapeRecord } from "./cityscape";
import store from "@/data/cityscapes.json";

/**
 * Baked ("blessed") city geometry, written by `scripts/seed-cityscape.mjs`.
 *
 * The store is a *sparse* override: an area with a saved record renders that
 * frozen geometry verbatim, immune to later changes in the generator algorithm
 * or district population; an area without one is generated live. This is the
 * same generated-vs-authored split the world uses for polygons/landmarks — kept
 * out of the domain model because a cityscape is a rendering concern, not world
 * data.
 */
interface CityscapeStore {
  version: number;
  areas: Record<string, CityscapeRecord>;
}

const saved = (store as CityscapeStore).areas;

/** The frozen geometry for an area, or undefined if it hasn't been baked. */
export function getSavedCityscape(areaId: string): CityscapeRecord | undefined {
  return saved[areaId];
}

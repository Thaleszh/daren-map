import { z } from "zod";
import { LandmarkCategorySchema, PointSchema } from "./schema";

/**
 * The regional map (the lands around Daren, from `photoshop/daren map.psd`).
 * It is a single flat image, independent of the city's levels, so its markers
 * live apart from the world graph: no area/faction references to validate.
 */
export const REGION_VIEWBOX = { width: 1709, height: 1600 } as const;
export const REGION_IMAGE = "region.png";
/** Sentinel for the URL hash's `level` slot: the region map instead of a city level. */
export const REGION_LEVEL_KEY = "region";

export const RegionMarkerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: LandmarkCategorySchema.default("other"),
  position: PointSchema,
  description: z.string().default(""),
});
export type RegionMarker = z.infer<typeof RegionMarkerSchema>;

export const RegionDataSchema = z.object({
  markers: z.array(RegionMarkerSchema).default([]),
});
export type RegionData = z.infer<typeof RegionDataSchema>;

/** Parse the stored JSON; a bad file degrades to "no markers" rather than a crash. */
export function parseRegionData(raw: unknown): RegionData {
  const r = RegionDataSchema.safeParse(raw);
  return r.success ? r.data : { markers: [] };
}

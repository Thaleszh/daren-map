import { z } from "zod";
import { LandmarkSchema, PointSchema, type Landmark, type Point, type WorldInput } from "./schema";

/**
 * Hand-authored annotations that live *outside* the generated world.
 *
 * The world geometry is generated from the PSD (see scripts/), but two things
 * are traced/placed by hand in the in-app annotate tool: per-area **polygons**
 * and **landmarks**. Keeping them in a separate file means re-generating the
 * world from the PSD never clobbers this manual work — they are merged back on
 * top at load time.
 */
export const AnnotationsSchema = z.object({
  /** areaId → traced polygon vertices, in the level's coordinate space. */
  polygons: z.record(z.string(), z.array(PointSchema)).default({}),
  landmarks: z.array(LandmarkSchema).default([]),
});
export type Annotations = z.input<typeof AnnotationsSchema>;

/**
 * The in-memory shape used by the annotate tool: fully-formed (validated-shape)
 * landmarks and a plain polygon map. Distinct from {@link Annotations}, which is
 * the looser on-disk/input shape merged at load time.
 */
export interface WorkingAnnotations {
  polygons: Record<string, Point[]>;
  landmarks: Landmark[];
}

/** Empty annotations, for a fresh start. */
export const EMPTY_ANNOTATIONS: WorkingAnnotations = { polygons: {}, landmarks: [] };

/**
 * Overlay annotations onto a raw world: attach traced polygons to their areas
 * and append landmarks. Runs before {@link loadWorld} so everything is validated
 * together.
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
    landmarks: [...(world.landmarks ?? []), ...(ann.landmarks ?? [])],
  };
}

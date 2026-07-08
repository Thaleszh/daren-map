import type { Point } from "./schema";

/**
 * Frontier snapping for traced polygons.
 *
 * Areas are traced independently, so two districts that share a border end up
 * with two *different* sets of eyeballed vertices — they overlap or gap instead
 * of connecting. These helpers make shared frontiers land on one coordinate:
 * {@link snapPoint} pulls a live click/drag onto a neighbour's vertex or edge,
 * and {@link weldPolygons} repairs a whole level of already-traced shapes.
 *
 * All distances are in the level's viewBox units (1709×1600), and every point
 * returned is integer-rounded to match the stored data.
 */

/** Default pull radius while tracing, in viewBox units (~0.8% of the map). */
export const SNAP_RADIUS = 14;
/** Default weld tolerance for the one-time cleanup, in viewBox units. */
export const WELD_TOLERANCE = 12;

export type SnapKind = "vertex" | "edge";

export interface SnapResult {
  /** The point to use — snapped when a target was in range, else the input. */
  point: Point;
  /** What we locked onto (for a UI highlight); null when nothing was in range. */
  target: Point | null;
  kind: SnapKind | null;
}

function round(p: Point): Point {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Nearest point on segment a→b to p (clamped to the segment). */
function projectToSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/**
 * Snap `p` to nearby existing geometry so adjacent areas share exact frontiers.
 * A neighbour *vertex* wins over a neighbour *edge* within the same radius — a
 * shared corner is a stronger intent than a shared border — so we take the
 * closest vertex first and only fall back to edge projection.
 *
 * `neighbours` are the other areas' polygons on the same level (closed shapes;
 * the last→first edge is considered). Returns the input unchanged when nothing
 * is within `radius`.
 */
export function snapPoint(
  p: Point,
  neighbours: readonly (readonly Point[])[],
  radius = SNAP_RADIUS,
): SnapResult {
  const r2 = radius * radius;

  let bestV: Point | null = null;
  let bestVd = r2;
  for (const poly of neighbours) {
    for (const v of poly) {
      const d = dist2(p, v);
      if (d <= bestVd) {
        bestVd = d;
        bestV = v;
      }
    }
  }
  if (bestV) return { point: round(bestV), target: round(bestV), kind: "vertex" };

  let bestE: Point | null = null;
  let bestEd = r2;
  for (const poly of neighbours) {
    if (poly.length < 2) continue;
    for (let i = 0; i < poly.length; i++) {
      const proj = projectToSegment(p, poly[i]!, poly[(i + 1) % poly.length]!);
      const d = dist2(p, proj);
      if (d <= bestEd) {
        bestEd = d;
        bestE = proj;
      }
    }
  }
  if (bestE) return { point: round(bestE), target: round(bestE), kind: "edge" };

  return { point: round(p), target: null, kind: null };
}

/**
 * Weld near-coincident vertices *across* a set of polygons so shared frontiers
 * collapse onto one coordinate. Greedy clustering (not transitive union-find):
 * each vertex joins the first existing cluster whose running centroid is within
 * `tolerance`, else starts its own — this avoids a long boundary chaining its
 * many distinct vertices into a single blob. Each cluster resolves to its
 * rounded centroid.
 *
 * Structure is preserved: every polygon keeps its vertex count and order; only
 * coordinates move. Pass the polygons of a *single* level together.
 */
export function weldPolygons(
  polygons: readonly (readonly Point[])[],
  tolerance = WELD_TOLERANCE,
): Point[][] {
  const t2 = tolerance * tolerance;
  const clusters: { cx: number; cy: number; n: number }[] = [];

  const assign = (p: Point): number => {
    let best = -1;
    let bestd = t2;
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i]!;
      const d = dist2(p, { x: c.cx, y: c.cy });
      if (d <= bestd) {
        bestd = d;
        best = i;
      }
    }
    if (best === -1) {
      clusters.push({ cx: p.x, cy: p.y, n: 1 });
      return clusters.length - 1;
    }
    const c = clusters[best]!;
    c.cx = (c.cx * c.n + p.x) / (c.n + 1);
    c.cy = (c.cy * c.n + p.y) / (c.n + 1);
    c.n += 1;
    return best;
  };

  // First pass builds clusters (and their final centroids); second pass maps
  // each vertex to its cluster's resolved coordinate.
  const indices = polygons.map((poly) => poly.map((p) => assign(p)));
  const resolved = clusters.map((c) => round({ x: c.cx, y: c.cy }));
  return polygons.map((poly, pi) => poly.map((_, vi) => ({ ...resolved[indices[pi]![vi]!]! })));
}

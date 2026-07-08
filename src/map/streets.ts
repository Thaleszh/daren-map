import type { Point } from "@/domain/schema";
import type { Segment, StreetNetwork } from "./cityscape";
import { type Polygon, centroid, pointInPolygon } from "./geometry";

/**
 * Street-network builders: three ways to carve an area polygon into *blocks*.
 * Each returns the block polygons (to be packed with houses) plus the segments
 * to draw as streets. The block outlines *are* the streets — houses are inset
 * from them, so the gap between neighbouring blocks reads as a road.
 *
 *  - {@link gridBlocks}: a rotated lattice warped by value noise — bent avenues.
 *  - {@link subdivisionBlocks}: recursive quarter splits — irregular quarters.
 *  - {@link voronoiBlocks}: a Voronoi tiling of blue-noise sites — organic cells.
 */

// Tuning knobs (viewBox units). The map is read from far, so blocks are small.
const BLOCK = 34; // target block size between streets
const WARP_AMP = 8; // grid street displacement amplitude
const WARP_FREQ = 0.028; // grid street displacement frequency

/** A block to be packed with houses, plus the edges to draw as its streets. */
export interface Blocks {
  blocks: Polygon[];
  roads: Segment[];
}

/** Seeded value noise in [-1,1], smooth over the integer lattice. Separate from
 *  the PRNG stream so warping never perturbs building jitter (determinism). */
function makeNoise(seed: number): (x: number, y: number) => number {
  const at = (i: number, j: number): number => {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + seed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const a = mix(at(x0, y0), at(x0 + 1, y0), tx);
    const b = mix(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx);
    return mix(a, b, ty) * 2 - 1;
  };
}

/** A seeded orthonormal frame so blocks aren't all axis-aligned. */
function frame(rng: () => number) {
  const theta = (rng() * Math.PI) / 2; // 0..90°
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    toU: (x: number, y: number) => x * cos + y * sin,
    toV: (x: number, y: number) => -x * sin + y * cos,
    fromUV: (u: number, v: number): Point => ({ x: u * cos - v * sin, y: u * sin + v * cos }),
  };
}

/** Extent of a polygon in a rotated (u,v) frame. */
function uvBounds(poly: Polygon, f: ReturnType<typeof frame>) {
  let uMin = Infinity,
    uMax = -Infinity,
    vMin = Infinity,
    vMax = -Infinity;
  for (const p of poly) {
    const u = f.toU(p.x, p.y);
    const v = f.toV(p.x, p.y);
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  return { uMin, uMax, vMin, vMax };
}

/** Dedup block outlines into one street segment per shared edge. */
function roadsFromBlocks(blocks: Polygon[]): Segment[] {
  const seen = new Set<string>();
  const roads: Segment[] = [];
  const key = (a: Point, b: Point) => {
    const ka = `${Math.round(a.x * 2)},${Math.round(a.y * 2)}`;
    const kb = `${Math.round(b.x * 2)},${Math.round(b.y * 2)}`;
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  };
  for (const poly of blocks) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[j]!;
      const b = poly[i]!;
      const k = key(a, b);
      if (seen.has(k)) continue;
      seen.add(k);
      roads.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
  return roads;
}

/** Noise-warped grid: a rotated lattice whose corners are pushed around by
 *  value noise, so straight avenues bend into something hand-drawn. */
function gridBlocks(polygon: Polygon, rng: () => number, seed: number): Blocks {
  const f = frame(rng);
  const { uMin, uMax, vMin, vMax } = uvBounds(polygon, f);
  const noise = makeNoise(seed);
  const u0 = uMin + rng() * BLOCK;
  const v0 = vMin + rng() * BLOCK;
  const warp = (p: Point): Point => ({
    x: p.x + WARP_AMP * noise(p.x * WARP_FREQ, p.y * WARP_FREQ),
    y: p.y + WARP_AMP * noise(p.x * WARP_FREQ + 100, p.y * WARP_FREQ + 100),
  });
  const blocks: Polygon[] = [];
  for (let u = u0; u < uMax; u += BLOCK) {
    for (let v = v0; v < vMax; v += BLOCK) {
      // Shared corners get an identical warp, so neighbouring blocks stay welded.
      const quad = [
        warp(f.fromUV(u, v)),
        warp(f.fromUV(u + BLOCK, v)),
        warp(f.fromUV(u + BLOCK, v + BLOCK)),
        warp(f.fromUV(u, v + BLOCK)),
      ];
      if (pointInPolygon(centroid(quad), polygon)) blocks.push(quad);
    }
  }
  return { blocks, roads: roadsFromBlocks(blocks) };
}

/** Recursive quarter subdivision: split the rotated bounding rectangle along its
 *  longer side (at a jittered point) until every leaf is about a block wide. */
function subdivisionBlocks(polygon: Polygon, rng: () => number): Blocks {
  const f = frame(rng);
  const { uMin, uMax, vMin, vMax } = uvBounds(polygon, f);
  const leaves: Array<[number, number, number, number]> = []; // u0,v0,u1,v1
  const split = (u0: number, v0: number, u1: number, v1: number, depth: number) => {
    const w = u1 - u0;
    const h = v1 - v0;
    if ((w <= BLOCK && h <= BLOCK) || depth > 9) {
      leaves.push([u0, v0, u1, v1]);
      return;
    }
    const frac = 0.5 + (rng() - 0.5) * 0.34;
    if (w >= h) {
      const um = u0 + w * frac;
      split(u0, v0, um, v1, depth + 1);
      split(um, v0, u1, v1, depth + 1);
    } else {
      const vm = v0 + h * frac;
      split(u0, v0, u1, vm, depth + 1);
      split(u0, vm, u1, v1, depth + 1);
    }
  };
  split(uMin, vMin, uMax, vMax, 0);
  const blocks: Polygon[] = [];
  for (const [u0, v0, u1, v1] of leaves) {
    const quad = [f.fromUV(u0, v0), f.fromUV(u1, v0), f.fromUV(u1, v1), f.fromUV(u0, v1)];
    if (pointInPolygon(centroid(quad), polygon)) blocks.push(quad);
  }
  return { blocks, roads: roadsFromBlocks(blocks) };
}

/** Clip a convex polygon to the half-plane of points closer to `s1` than `s2`
 *  (Sutherland–Hodgman against the perpendicular bisector). */
function clipHalfPlane(poly: Polygon, s1: Point, s2: Point): Polygon {
  // Keep p where (p - mid)·(s2 - s1) <= 0.
  const nx = s2.x - s1.x;
  const ny = s2.y - s1.y;
  const mx = (s1.x + s2.x) / 2;
  const my = (s1.y + s2.y) / 2;
  const side = (p: Point) => (p.x - mx) * nx + (p.y - my) * ny;
  const out: Polygon = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const da = side(a);
    const db = side(b);
    if (da <= 0) out.push(a);
    if (da <= 0 !== db <= 0) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** Voronoi tiling over blue-noise sites (jittered grid), one Lloyd relaxation
 *  pass to even the cells out. Cells are the blocks; their edges the streets. */
function voronoiBlocks(polygon: Polygon, rng: () => number): Blocks {
  const f = frame(rng);
  const { uMin, uMax, vMin, vMax } = uvBounds(polygon, f);
  const pad = BLOCK;
  const rect: Polygon = [
    f.fromUV(uMin - pad, vMin - pad),
    f.fromUV(uMax + pad, vMin - pad),
    f.fromUV(uMax + pad, vMax + pad),
    f.fromUV(uMin - pad, vMax + pad),
  ];
  // Jittered-grid sites — cheap, deterministic, and roughly blue-noise.
  let sites: Point[] = [];
  for (let u = uMin; u < uMax + BLOCK; u += BLOCK) {
    for (let v = vMin; v < vMax + BLOCK; v += BLOCK) {
      const ju = u + (rng() - 0.5) * BLOCK * 0.7;
      const jv = v + (rng() - 0.5) * BLOCK * 0.7;
      sites.push(f.fromUV(ju, jv));
    }
  }
  const cellsFor = (pts: Point[]): Polygon[] =>
    pts.map((s) => {
      let cell = rect;
      for (const o of pts) {
        if (o === s) continue;
        cell = clipHalfPlane(cell, s, o);
        if (cell.length < 3) break;
      }
      return cell;
    });
  // One Lloyd pass: move each site to its cell centroid, then retile.
  sites = cellsFor(sites).map((c, i) => (c.length >= 3 ? centroid(c) : sites[i]!));
  const cells = cellsFor(sites);
  const blocks: Polygon[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]!.length >= 3 && pointInPolygon(sites[i]!, polygon)) blocks.push(cells[i]!);
  }
  return { blocks, roads: roadsFromBlocks(blocks) };
}

/** Carve `polygon` into blocks using the chosen strategy. */
export function buildStreets(
  network: StreetNetwork,
  polygon: Polygon,
  rng: () => number,
  seed: number,
): Blocks {
  switch (network) {
    case "subdivision":
      return subdivisionBlocks(polygon, rng);
    case "voronoi":
      return voronoiBlocks(polygon, rng);
    case "grid":
    default:
      return gridBlocks(polygon, rng, seed);
  }
}

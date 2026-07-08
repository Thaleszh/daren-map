import type { Point } from "@/domain/schema";

/**
 * Procedural "city texture" for an area — a seeded street grid and buildings of
 * varied size, drawn under the lens tint to make a district read as a lived-in
 * place rather than a flat blob.
 *
 * Two invariants make this safe to lean on:
 *
 * 1. **Deterministic.** Geometry is seeded from a *stable* string (the area id),
 *    never from volatile inputs. The same area produces the exact same city on
 *    every load — no flicker, no re-roll when unrelated data changes.
 * 2. **Density is a filter, not a generator input.** {@link buildCityscape}
 *    always emits the *dense* superset; each building carries a fixed `rank` in
 *    [0,1). Showing "how urban" an area is means filtering by rank
 *    ({@link visibleBuildings}), which yields *nested* subsets: raising density
 *    only reveals more of the same buildings, never moves an existing one. So a
 *    small change to a district's population nudges the building count at the
 *    margin instead of restructuring the whole map.
 *
 * The superset is also the natural thing to *persist* later (Phase 2): bake it
 * into annotations once, and the renderer can prefer the saved geometry so a
 * future tweak to this algorithm can't reshape a map a GM has blessed.
 */

type Polygon = Point[];

/** Off, or one of the two demographics-driven visualizations. */
export type TextureStyle = "off" | "ink" | "rooftops";

export const TEXTURE_STYLES: Array<{ key: TextureStyle; label: string }> = [
  { key: "off", label: "Nenhuma" },
  { key: "ink", label: "Traço (mapa)" },
  { key: "rooftops", label: "Telhados" },
];

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Building {
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Rotation in degrees; aligned to the street grid (with a little jitter). */
  angle: number;
  /** Seeded 0..1 used only for rooftop shading variety. */
  shade: number;
  /** Seeded 0..1 threshold: shown when `rank < density`. Big compounds skew
   *  low so a sparse district keeps its estates and sheds its shacks. */
  rank: number;
}

export interface Cityscape {
  roads: Segment[];
  buildings: Building[];
}

export interface CityscapeOptions {
  /** Stable identity — pass the area id. Layout changes only if this changes. */
  seed: string;
  /** Hard ceiling on buildings kept (lowest-rank first), to bound render cost. */
  maxBuildings?: number;
}

// Tuning knobs (viewBox units). Kept together so the look is easy to dial in.
const SPACING = 30; // grid cell / block size at full density
const JITTER = 0.4; // fraction of a cell a building may wander from center
const ANGLE_JITTER = 10; // degrees a building may rotate off the grid
const COMPOUND_CHANCE = 0.12; // odds a cell holds a large compound vs a house
const DEFAULT_MAX_BUILDINGS = 600;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** FNV-1a over the seed string → a 32-bit integer for the PRNG. */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — tiny, fast, deterministic PRNG. Not for crypto; perfect here. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function bbox(poly: Polygon): Box {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Ray-cast point-in-polygon (odd crossings = inside). */
function pointInPolygon(p: Point, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const intersects =
      a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Shoelace area (absolute), in viewBox units². Exported for density weighting. */
export function polygonArea(poly: Polygon): number {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += (poly[j]!.x + poly[i]!.x) * (poly[j]!.y - poly[i]!.y);
  }
  return Math.abs(sum) / 2;
}

/**
 * Generate the dense superset of streets + buildings for a polygon. Density is
 * NOT an input — see {@link visibleBuildings}. Returns empty geometry for a
 * degenerate polygon.
 */
export function buildCityscape(polygon: Polygon, opts: CityscapeOptions): Cityscape {
  if (polygon.length < 3) return { roads: [], buildings: [] };
  const maxBuildings = opts.maxBuildings ?? DEFAULT_MAX_BUILDINGS;
  const rng = mulberry32(hashSeed(opts.seed));

  // A seeded orientation so blocks aren't all axis-aligned. Work in the grid's
  // rotated frame (u along streets, v across), then map nodes back to xy.
  const theta = (rng() * Math.PI) / 2; // 0..90°
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const toU = (x: number, y: number) => x * cos + y * sin;
  const toV = (x: number, y: number) => -x * sin + y * cos;
  const fromUV = (u: number, v: number): Point => ({ x: u * cos - v * sin, y: u * sin + v * cos });

  const box = bbox(polygon);
  const corners: Array<[number, number]> = [
    [box.minX, box.minY],
    [box.maxX, box.minY],
    [box.maxX, box.maxY],
    [box.minX, box.maxY],
  ];
  let uMin = Infinity,
    uMax = -Infinity,
    vMin = Infinity,
    vMax = -Infinity;
  for (const [x, y] of corners) {
    const u = toU(x, y);
    const v = toV(x, y);
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }

  const s = SPACING;
  // Offset the grid origin by a seeded phase so streets don't hug the bbox.
  const u0 = uMin + rng() * s;
  const v0 = vMin + rng() * s;

  // Streets: full grid lines across the bbox. The renderer clips them to the
  // polygon, so we never need line/polygon intersection math here.
  const roads: Segment[] = [];
  for (let u = u0; u <= uMax; u += s) {
    const a = fromUV(u, vMin);
    const b = fromUV(u, vMax);
    roads.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  for (let v = v0; v <= vMax; v += s) {
    const a = fromUV(uMin, v);
    const b = fromUV(uMax, v);
    roads.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  // Buildings: one candidate per cell, jittered off the node and kept only if
  // it lands inside the polygon. rng is consumed in a fixed order → determinism.
  const angleBase = (theta * 180) / Math.PI;
  const buildings: Building[] = [];
  for (let u = u0; u <= uMax; u += s) {
    for (let v = v0; v <= vMax; v += s) {
      const ju = u + s * 0.5 + (rng() - 0.5) * s * JITTER;
      const jv = v + s * 0.5 + (rng() - 0.5) * s * JITTER;
      const p = fromUV(ju, jv);
      if (!pointInPolygon(p, polygon)) continue;

      const big = rng() < COMPOUND_CHANCE;
      const scale = big ? lerp(1.1, 1.6, rng()) : lerp(0.4, 0.78, rng());
      const w = s * scale * lerp(0.8, 1.1, rng());
      const h = s * scale * lerp(0.8, 1.1, rng());
      // Big compounds skew to a low rank so they survive at low density.
      const rank = big ? rng() * 0.45 : rng();
      buildings.push({
        cx: p.x,
        cy: p.y,
        w,
        h,
        angle: angleBase + (rng() - 0.5) * ANGLE_JITTER,
        shade: rng(),
        rank,
      });
    }
  }

  // Cap by keeping the lowest-rank buildings — a stable subset, so the cap never
  // reshuffles which buildings appear.
  buildings.sort((a, b) => a.rank - b.rank);
  return { roads, buildings: buildings.slice(0, maxBuildings) };
}

/**
 * The buildings shown at a given urbanization level (0..1). Because ranks are
 * fixed, `visibleBuildings(city, d1)` ⊆ `visibleBuildings(city, d2)` whenever
 * d1 ≤ d2 — raising density only adds buildings, never moves them.
 */
export function visibleBuildings(city: Cityscape, density: number): Building[] {
  return city.buildings.filter((b) => b.rank < density);
}

/* --------------------------------------------------------------- density */

export interface AreaDensityInput {
  id: string;
  polygon?: Polygon;
  /** District population for this area (0 when the area has no district/pop). */
  population: number;
}

/**
 * Level-local urbanization per area: people-per-viewBox-unit, normalized
 * against the busiest area on the level and mapped into [0.3, 1] (0.6 when no
 * population data exists). Shared by the live renderer and the bake script so
 * a saved map matches what the app would have drawn.
 */
export function areaDensities(areas: AreaDensityInput[]): Map<string, number> {
  const ppa = new Map<string, number>();
  for (const a of areas) {
    const size = a.polygon ? polygonArea(a.polygon) : 0;
    ppa.set(a.id, size > 0 ? a.population / size : 0);
  }
  const maxPpa = Math.max(0, ...ppa.values());
  const out = new Map<string, number>();
  for (const a of areas) {
    const p = ppa.get(a.id) ?? 0;
    out.set(a.id, maxPpa > 0 && p > 0 ? 0.3 + 0.7 * (p / maxPpa) : 0.6);
  }
  return out;
}

/* ----------------------------------------------------- persistence (Phase 2) */

/** A building as stored/drawn — density already applied, so no `rank`. */
export type DrawBuilding = Omit<Building, "rank">;

/** Final, render-ready geometry for one area: roads + the visible buildings.
 *  This is the serialized ("blessed") form — see {@link toCityscapeRecord}. */
export interface CityscapeRecord {
  roads: Segment[];
  buildings: DrawBuilding[];
}

/**
 * Freeze a live cityscape at a chosen density into the render-ready record that
 * gets persisted. Coordinates are rounded to keep the JSON small (this feeds a
 * static bundle); `rank` is dropped since the density filter is already baked in.
 */
export function toCityscapeRecord(city: Cityscape, density: number): CityscapeRecord {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    roads: city.roads.map((s) => ({ x1: r1(s.x1), y1: r1(s.y1), x2: r1(s.x2), y2: r1(s.y2) })),
    buildings: visibleBuildings(city, density).map((b) => ({
      cx: r1(b.cx),
      cy: r1(b.cy),
      w: r1(b.w),
      h: r1(b.h),
      angle: r1(b.angle),
      shade: Math.round(b.shade * 100) / 100,
    })),
  };
}

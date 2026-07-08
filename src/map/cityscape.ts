import type { Population } from "@/domain/schema";
import { type Polygon, centroid, clamp01, lerp, pointInPolygon, polygonArea } from "./geometry";
import { buildStreets } from "./streets";

export { polygonArea };

/**
 * Procedural "city texture" for an area — an organic street network and a dense
 * carpet of small buildings that face the streets, drawn under the lens tint to
 * make a district read as a lived-in place rather than a flat blob.
 *
 * The layout is built in two independent passes:
 *
 * 1. **Streets** partition the polygon into *blocks*. Three strategies (see
 *    {@link StreetNetwork}) trade regularity for organic feel — a noise-warped
 *    grid, recursive quarter subdivision, or a Voronoi tiling. Each returns a
 *    set of block polygons; the block outlines *are* the streets.
 * 2. **Frontage packing** fills every block with rows of little houses that face
 *    outward toward the street, leaving a gutter between neighbouring blocks. A
 *    house's {@link Building.rank} grows with its depth into the block, so the
 *    density filter peels a district back to just its street-facing rows.
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
 * The superset is also the natural thing to *persist*: bake it into
 * `cityscapes.json` once, and the renderer prefers the saved geometry so a
 * future tweak to this algorithm can't reshape a map a GM has blessed.
 */

/** Off, or one of the two demographics-driven visualizations. */
export type TextureStyle = "off" | "ink" | "rooftops";

export const TEXTURE_STYLES: Array<{ key: TextureStyle; label: string }> = [
  { key: "off", label: "Nenhuma" },
  { key: "ink", label: "Traço (mapa)" },
  { key: "rooftops", label: "Telhados" },
];

/** How streets carve the polygon into blocks. Orthogonal to {@link TextureStyle}
 *  (which is only a paint treatment) — this decides the actual layout. */
export type StreetNetwork = "grid" | "subdivision" | "voronoi";

export const STREET_NETWORKS: Array<{ key: StreetNetwork; label: string }> = [
  { key: "grid", label: "Malha orgânica" },
  { key: "subdivision", label: "Quarteirões" },
  { key: "voronoi", label: "Voronoi" },
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
  /** Rotation in degrees; the building faces the street it fronts. */
  angle: number;
  /** Seeded 0..1 used only for rooftop shading variety. */
  shade: number;
  /** Seeded 0..1 threshold: shown when `rank < density`. Grows with a house's
   *  depth into its block, so a sparse district keeps only its street-facing
   *  rows and sheds its back-lot infill. */
  rank: number;
}

export interface Cityscape {
  roads: Segment[];
  buildings: Building[];
}

export interface CityscapeOptions {
  /** Stable identity — pass the area id. Layout changes only if this changes. */
  seed: string;
  /** Street strategy (default "grid"). */
  network?: StreetNetwork;
  /** Hard ceiling on buildings kept (lowest-rank first), to bound render cost. */
  maxBuildings?: number;
}

// Tuning knobs (viewBox units). Kept together so the look is easy to dial in.
// The map is read from far, so everything is small and tightly packed.
const STREET_W = 6; // gutter left clear between a block and the street line
const HOUSE_W = 4.6; // house frontage (along the street)
const HOUSE_D = 4.6; // house depth (into the block)
const ROW_GAP = 1.7; // alley between successive rows
const HOUSE_GAP = 1.4; // gap between neighbours in a row
const SIZE_JITTER = 0.4; // fraction a house's size may vary
const POS_JITTER = 0.28; // fraction of a cell a house may wander
const ANGLE_JITTER = 7; // degrees a house may rotate off its row
const BIG_CHANCE = 0.05; // odds a lot holds a larger building (hall/estate)
const DEFAULT_MAX_BUILDINGS = 1000;

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

/* ------------------------------------------------------- frontage packing */

/** Shrink a block toward its centroid to leave a street gutter around it. */
function shrink(poly: Polygon, amount: number): Polygon {
  const c = centroid(poly);
  // Approximate inset: pull every vertex a fixed distance toward the centroid.
  return poly.map((p) => {
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const t = Math.min(0.45, amount / d);
    return { x: p.x + dx * t, y: p.y + dy * t };
  });
}

/** Fill one block with rows of street-facing houses, appending to `out`. Rows
 *  run parallel to the block's longest edge so houses front its main street. */
function packBlock(block: Polygon, area: Polygon, rng: () => number, out: Building[]): void {
  const inner = shrink(block, STREET_W);
  if (inner.length < 3 || polygonArea(inner) < HOUSE_W * HOUSE_D) return;

  // Row direction = the block's longest edge; houses face across it.
  let dx = 1,
    dy = 0,
    best = -1;
  for (let i = 0, j = inner.length - 1; i < inner.length; j = i++) {
    const ex = inner[i]!.x - inner[j]!.x;
    const ey = inner[i]!.y - inner[j]!.y;
    const len = ex * ex + ey * ey;
    if (len > best) {
      best = len;
      dx = ex;
      dy = ey;
    }
  }
  const dlen = Math.hypot(dx, dy) || 1;
  dx /= dlen;
  dy /= dlen;
  const nx = -dy; // unit normal (across the rows)
  const ny = dx;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Bounds of the block in the (row, across) frame; {dir,nrm} are orthonormal,
  // so a point reconstructs as dir*p + nrm*q.
  let pMin = Infinity,
    pMax = -Infinity,
    qMin = Infinity,
    qMax = -Infinity;
  for (const v of inner) {
    const p = v.x * dx + v.y * dy;
    const q = v.x * nx + v.y * ny;
    if (p < pMin) pMin = p;
    if (p > pMax) pMax = p;
    if (q < qMin) qMin = q;
    if (q > qMax) qMax = q;
  }
  const rowStep = HOUSE_D + ROW_GAP;
  const colStep = HOUSE_W + HOUSE_GAP;
  const halfSpan = Math.max(rowStep, (qMax - qMin) / 2);

  for (let q = qMin + rowStep / 2; q <= qMax; q += rowStep) {
    // Depth into the block from the nearest street edge → drives rank so the
    // density filter peels back to street-facing rows first.
    const depth = Math.min(q - qMin, qMax - q);
    const depthNorm = clamp01(depth / halfSpan);
    for (let p = pMin + colStep / 2; p <= pMax; p += colStep) {
      const jp = p + (rng() - 0.5) * colStep * POS_JITTER;
      const jq = q + (rng() - 0.5) * rowStep * POS_JITTER;
      const cx = dx * jp + nx * jq;
      const cy = dy * jp + ny * jq;
      const c = { x: cx, y: cy };
      if (!pointInPolygon(c, inner) || !pointInPolygon(c, area)) continue;

      const big = rng() < BIG_CHANCE;
      const wScale = big ? lerp(1.6, 2.2, rng()) : 1 + (rng() - 0.5) * SIZE_JITTER;
      const hScale = big ? lerp(1.4, 1.9, rng()) : 1 + (rng() - 0.5) * SIZE_JITTER;
      // Big halls skew to a low rank so they survive at low density.
      const rank = big ? depthNorm * 0.3 : clamp01(depthNorm * 0.82 + rng() * 0.18);
      out.push({
        cx,
        cy,
        w: HOUSE_W * wScale,
        h: HOUSE_D * hScale,
        angle: angle + (rng() - 0.5) * ANGLE_JITTER,
        shade: rng(),
        rank: Math.min(rank, 0.999),
      });
    }
  }
}

/**
 * Generate the dense superset of streets + buildings for a polygon. Density is
 * NOT an input — see {@link visibleBuildings}. Returns empty geometry for a
 * degenerate polygon.
 */
export function buildCityscape(polygon: Polygon, opts: CityscapeOptions): Cityscape {
  if (polygon.length < 3) return { roads: [], buildings: [] };
  const maxBuildings = opts.maxBuildings ?? DEFAULT_MAX_BUILDINGS;
  const seed = hashSeed(opts.seed);
  const rng = mulberry32(seed);

  const { blocks, roads } = buildStreets(opts.network ?? "grid", polygon, rng, seed);

  const buildings: Building[] = [];
  for (const block of blocks) packBlock(block, polygon, rng, buildings);

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

/**
 * The headcount that drives how built-up an area reads: the larger of a
 * district's residents and its daytime workers, so a workplace zone (a market,
 * a barracks) still renders as dense even with few residents. 0 when neither is
 * known.
 */
export function effectivePopulation(pop: Population | undefined): number {
  return Math.max(pop?.residents ?? 0, pop?.workers ?? 0);
}

export interface AreaDensityInput {
  id: string;
  polygon?: Polygon;
  /** Effective headcount for this area (see {@link effectivePopulation}); 0
   *  when the area has no district or population. */
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

/* ----------------------------------------------------- persistence (bake) */

/** A building as stored/drawn — density already applied, so no `rank`. */
export type DrawBuilding = Omit<Building, "rank">;

/** Final, render-ready geometry for one area: roads + the visible buildings.
 *  This is the serialized ("blessed") form — see {@link toCityscapeRecord}. */
export interface CityscapeRecord {
  roads: Segment[];
  buildings: DrawBuilding[];
}

/** A default building for hand-placement in the annotate tool (mid-size,
 *  grid-aligned, medium shade); the GM then drags/edits it into place. */
export function newBuilding(cx: number, cy: number): DrawBuilding {
  return { cx, cy, w: HOUSE_W * 1.4, h: HOUSE_D * 1.4, angle: 0, shade: 0.5 };
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

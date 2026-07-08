import type { Atlas } from "@/domain/selectors";
import type { Area, District, Point, Polygon } from "@/domain/schema";
import type { DistrictId, FactionId, LevelId } from "@/domain/ids";
import { formatCount } from "./raceStyle";

/** The available map coloring modes. */
export type MapLens = "bairro" | "dominant" | "faction" | "contested" | "density" | "power";

export const LENSES: ReadonlyArray<{ key: MapLens; label: string }> = [
  { key: "bairro", label: "Bairro" },
  { key: "dominant", label: "Facção dominante" },
  { key: "faction", label: "Foco em facção" },
  { key: "contested", label: "Disputa" },
  { key: "density", label: "População" },
  { key: "power", label: "Poder" },
];

export interface LensState {
  lens: MapLens;
  focusFactionId: FactionId | null;
}

/** Global maxima needed to normalize the heat lenses. Computed once per world. */
export interface LensContext {
  maxPopulation: number;
  maxPower: number;
  /** Bairro-lens fill per district, graph-coloured so neighbours never clash. */
  districtColors: ReadonlyMap<DistrictId, string>;
}

export function lensContext(atlas: Atlas): LensContext {
  let maxPopulation = 1;
  let maxPower = 1;
  for (const d of atlas.world.districts)
    maxPopulation = Math.max(maxPopulation, d.population?.residents ?? 0);
  for (const a of atlas.world.areas) {
    const power = atlas.standings(a.id).reduce((s, r) => s + r.power, 0);
    maxPower = Math.max(maxPower, power);
  }
  return { maxPopulation, maxPower, districtColors: districtColors(atlas) };
}

/** How an area should be painted: a single tint, or proportional color bands. */
export type AreaFill =
  | { kind: "solid"; fill: string; opacity: number; caption: string }
  | { kind: "segments"; segments: { color: string; share: number }[]; caption: string };

const NEUTRAL = "#8b93a7";

/** Stable 32-bit FNV-1a hash of a string; used to pick a district's default hue. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * The color a district paints with in the "bairro" lens: its explicit accent if
 * set, else a hue derived purely from its id. Keying off the id (not level or
 * position) is what keeps a district the *same* color across every level slice.
 */
export function districtColor(district: District): string {
  if (district.color) return district.color;
  return hslToHex(hashString(district.id) % 360, 55, 55);
}

/**
 * A categorical palette for the bairro lens: hues spun by the golden angle so
 * that any small run of them (all a greedy colouring ever needs) is maximally
 * spread. Graph-colouring draws from this so two districts that share a border
 * never land on the same — or a look-alike — hue.
 */
const BAIRRO_PALETTE: readonly string[] = Array.from({ length: 12 }, (_, i) =>
  hslToHex((i * 137.508) % 360, 55, 55),
);

/**
 * How close two area boundaries must come (viewBox units) to count as sharing a
 * border. Shared frontiers are welded to identical coordinates (distance ≈ 0);
 * the slack only forgives traced-but-unwelded neighbours that gap by a few
 * pixels. Kept well under district size so separate districts aren't merged.
 */
const TOUCH_DIST = 22;

/** Squared distance from p to the segment a→b (clamped to the segment). */
function segDist2(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const cx = a.x + t * dx - p.x;
  const cy = a.y + t * dy - p.y;
  return cx * cx + cy * cy;
}

/** Do two polygon boundaries come within {@link TOUCH_DIST} of each other? A
 *  vertex of one landing on an edge of the other is enough to catch a shared
 *  border even when the two traces don't share vertices. */
function boundariesTouch(a: Polygon, b: Polygon): boolean {
  const t2 = TOUCH_DIST * TOUCH_DIST;
  const near = (verts: Polygon, edges: Polygon): boolean => {
    for (const v of verts)
      for (let i = 0; i < edges.length; i++)
        if (segDist2(v, edges[i]!, edges[(i + 1) % edges.length]!) <= t2) return true;
    return false;
  };
  return near(a, b) || near(b, a);
}

/**
 * The bairro-lens colour for every district, assigned by graph colouring so
 * neighbours are always visually distinct — the plain per-id hash lets adjacent
 * districts collide on similar hues. Districts that share a border (their area
 * slices touch on the same level) are linked, then coloured Welsh–Powell style:
 * highest-degree first, each taking the lowest palette hue none of its already
 * coloured neighbours use. Explicit district colours are honoured verbatim, and
 * an isolated district (touching nothing) keeps its stable per-id hue.
 * Deterministic — no dependence on iteration timing.
 */
export function districtColors(atlas: Atlas): ReadonlyMap<DistrictId, string> {
  // Adjacency: districts whose traced slices touch on a shared level.
  const adj = new Map<DistrictId, Set<DistrictId>>();
  const link = (x: DistrictId, y: DistrictId) => {
    (adj.get(x) ?? adj.set(x, new Set()).get(x)!).add(y);
    (adj.get(y) ?? adj.set(y, new Set()).get(y)!).add(x);
  };
  const byLevel = new Map<LevelId, { id: DistrictId; poly: Polygon }[]>();
  for (const area of atlas.world.areas) {
    if (!area.polygon || area.districtId === undefined) continue;
    const list = byLevel.get(area.levelId) ?? byLevel.set(area.levelId, []).get(area.levelId)!;
    list.push({ id: area.districtId, poly: area.polygon });
  }
  for (const slices of byLevel.values())
    for (let i = 0; i < slices.length; i++)
      for (let j = i + 1; j < slices.length; j++) {
        const a = slices[i]!;
        const b = slices[j]!;
        if (a.id !== b.id && boundariesTouch(a.poly, b.poly)) link(a.id, b.id);
      }

  const result = new Map<DistrictId, string>();
  // Explicit colours and isolated districts keep their stable per-id colour;
  // they impose no palette constraint on their (non-existent) neighbours.
  for (const d of atlas.world.districts)
    if (d.color || !adj.has(d.id)) result.set(d.id, districtColor(d));

  // Greedy-colour the connected, palette-eligible districts, high degree first.
  const order = atlas.world.districts
    .filter((d) => !d.color && adj.has(d.id))
    .sort(
      (a, b) =>
        adj.get(b.id)!.size - adj.get(a.id)!.size || String(a.id).localeCompare(String(b.id)),
    );
  for (const d of order) {
    const used = new Set<number>();
    for (const nb of adj.get(d.id)!) {
      const idx = BAIRRO_PALETTE.indexOf(result.get(nb) ?? "");
      if (idx >= 0) used.add(idx);
    }
    let idx = 0;
    while (used.has(idx)) idx++;
    result.set(d.id, BAIRRO_PALETTE[idx % BAIRRO_PALETTE.length]!);
  }
  return result;
}

/**
 * Gradient stops that keep each faction a **solid** color across its span and
 * blend only in a narrow window at each *contact* (boundary) — so a district
 * reads as proportional regions that softly bleed where they meet, not a smear.
 */
export function gradientStops(
  segments: { color: string; share: number }[],
): { offset: number; color: string }[] {
  const n = segments.length;
  if (n === 0) return [];
  if (n === 1) {
    return [
      { offset: 0, color: segments[0]!.color },
      { offset: 1, color: segments[0]!.color },
    ];
  }
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const stops = [{ offset: 0, color: segments[0]!.color }];
  let cum = 0;
  for (let k = 1; k < n; k++) {
    cum += segments[k - 1]!.share;
    const hl = Math.min(0.04, segments[k - 1]!.share * 0.45, segments[k]!.share * 0.45);
    stops.push({ offset: clamp(cum - hl), color: segments[k - 1]!.color });
    stops.push({ offset: clamp(cum + hl), color: segments[k]!.color });
  }
  stops.push({ offset: 1, color: segments[n - 1]!.color });
  return stops;
}

export function areaFill(atlas: Atlas, area: Area, state: LensState, ctx: LensContext): AreaFill {
  switch (state.lens) {
    case "bairro": {
      const district = area.districtId ? atlas.district(area.districtId) : undefined;
      if (!district) return { kind: "solid", fill: NEUTRAL, opacity: 0.1, caption: "" };
      const fill = ctx.districtColors.get(district.id) ?? districtColor(district);
      return { kind: "solid", fill, opacity: 0.5, caption: "" };
    }
    case "dominant": {
      const dom = atlas.dominant(area.id);
      if (!dom) return { kind: "solid", fill: NEUTRAL, opacity: 0.1, caption: "" };
      return {
        kind: "solid",
        fill: dom.faction.color,
        opacity: 0.2 + Math.min(1, dom.share) * 0.55,
        caption: `${dom.faction.shortName || dom.faction.name} · ${Math.round(dom.share * 100)}%`,
      };
    }
    case "faction": {
      const faction = state.focusFactionId ? atlas.faction(state.focusFactionId) : undefined;
      if (!faction) return { kind: "solid", fill: NEUTRAL, opacity: 0.06, caption: "" };
      const s = atlas.standings(area.id).find((r) => r.faction.id === faction.id);
      const share = s?.share ?? 0;
      return {
        kind: "solid",
        fill: faction.color,
        opacity: share > 0 ? 0.15 + share * 0.6 : 0.04,
        caption: share > 0 ? `${Math.round(share * 100)}%` : "—",
      };
    }
    case "contested": {
      const st = atlas.standings(area.id);
      if (st.length === 0) return { kind: "solid", fill: NEUTRAL, opacity: 0.1, caption: "" };
      return {
        kind: "segments",
        segments: st.map((s) => ({ color: s.faction.color, share: s.share })),
        caption: `${st.length} facç${st.length > 1 ? "ões" : "ão"}`,
      };
    }
    case "density": {
      const district = area.districtId ? atlas.district(area.districtId) : undefined;
      const pop = district?.population?.residents ?? 0;
      return {
        kind: "solid",
        fill: "#3fa6a0",
        opacity: 0.1 + (pop / ctx.maxPopulation) * 0.62,
        caption: pop ? `≈ ${formatCount(pop)}` : "",
      };
    }
    case "power": {
      const total = atlas.standings(area.id).reduce((s, r) => s + r.power, 0);
      return {
        kind: "solid",
        fill: "#c9552f",
        opacity: total ? 0.1 + (total / ctx.maxPower) * 0.62 : 0.06,
        caption: total ? `pot ${total}` : "",
      };
    }
  }
}

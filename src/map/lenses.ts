import type { Atlas } from "@/domain/selectors";
import type { Area, District } from "@/domain/schema";
import type { FactionId } from "@/domain/ids";
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
}

export function lensContext(atlas: Atlas): LensContext {
  let maxPopulation = 1;
  let maxPower = 1;
  for (const d of atlas.world.districts) maxPopulation = Math.max(maxPopulation, d.population ?? 0);
  for (const a of atlas.world.areas) {
    const power = atlas.standings(a.id).reduce((s, r) => s + r.power, 0);
    maxPower = Math.max(maxPower, power);
  }
  return { maxPopulation, maxPower };
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
      return { kind: "solid", fill: districtColor(district), opacity: 0.5, caption: "" };
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
      const pop = district?.population ?? 0;
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

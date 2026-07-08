import type {
  Area,
  District,
  Faction,
  Initiative,
  Landmark,
  Npc,
  Point,
  Polygon,
  Presence,
  Race,
  World,
} from "./schema";
import type { AreaId, DistrictId, FactionId, InitiativeId, LevelId } from "./ids";

/** One row of a population breakdown: a race, its headcount, and its share. */
export interface DemographicRow {
  race: Race;
  count: number;
  share: number;
}

/** A population total plus its per-race rows (human first), or undefined. */
export interface Demographics {
  total: number;
  rows: DemographicRow[];
}

function demographicsOf(total: number, races: readonly { race: Race; count: number }[]): Demographics {
  const minorities = races.reduce((s, r) => s + r.count, 0);
  const human = Math.max(0, total - minorities);
  const rows: DemographicRow[] = [
    { race: "human", count: human, share: total > 0 ? human / total : 0 },
    ...races.map((r) => ({ race: r.race, count: r.count, share: total > 0 ? r.count / total : 0 })),
  ];
  return { total, rows: rows.filter((r) => r.count > 0) };
}

/**
 * Derived views over a validated {@link World}. Nothing here is stored — these
 * compute from the raw influence/power integers on demand.
 */

/** One faction's standing in an area, with the derived control share. */
export interface AreaStanding {
  faction: Faction;
  influence: number;
  power: number;
  /** influence / (sum of influence in the area). In [0, 1]. */
  share: number;
  note: string;
}

/** An indexed, query-friendly wrapper built once from a World. */
export class Atlas {
  readonly world: World;
  private readonly factionById: ReadonlyMap<FactionId, Faction>;
  private readonly districtById: ReadonlyMap<DistrictId, District>;
  private readonly areaById: ReadonlyMap<AreaId, Area>;
  private readonly presenceByArea: ReadonlyMap<AreaId, Presence[]>;
  private readonly areasByDistrict: ReadonlyMap<DistrictId, Area[]>;
  private readonly initiativeById: ReadonlyMap<InitiativeId, Initiative>;

  constructor(world: World) {
    this.world = world;
    this.factionById = new Map(world.factions.map((f) => [f.id, f]));
    this.districtById = new Map(world.districts.map((d) => [d.id, d]));
    this.areaById = new Map(world.areas.map((a) => [a.id, a]));
    this.initiativeById = new Map(world.initiatives.map((i) => [i.id, i]));

    const byArea = new Map<AreaId, Presence[]>();
    for (const p of world.presence) {
      const list = byArea.get(p.areaId);
      if (list) list.push(p);
      else byArea.set(p.areaId, [p]);
    }
    this.presenceByArea = byArea;

    const byDistrict = new Map<DistrictId, Area[]>();
    for (const a of world.areas) {
      if (a.districtId === undefined) continue;
      const list = byDistrict.get(a.districtId);
      if (list) list.push(a);
      else byDistrict.set(a.districtId, [a]);
    }
    this.areasByDistrict = byDistrict;
  }

  faction(id: FactionId): Faction | undefined {
    return this.factionById.get(id);
  }

  district(id: DistrictId): District | undefined {
    return this.districtById.get(id);
  }

  area(id: AreaId): Area | undefined {
    return this.areaById.get(id);
  }

  /** The players' own organization — the guild that owns every initiative. */
  guild(): Faction | undefined {
    return this.world.factions.find((f) => f.isPlayerOrg);
  }

  initiative(id: InitiativeId): Initiative | undefined {
    return this.initiativeById.get(id);
  }

  /** Initiatives that list this area among the regions they affect. */
  initiativesAffectingArea(areaId: AreaId): Initiative[] {
    return this.world.initiatives.filter((i) => i.areaIds.includes(areaId));
  }

  /** Population + race breakdown for a district, or undefined if unrecorded. */
  demographics(id: DistrictId): Demographics | undefined {
    const d = this.districtById.get(id);
    if (!d || d.population === undefined) return undefined;
    return demographicsOf(d.population, d.races);
  }

  /** Sum of all recorded district populations. */
  cityPopulation(): number {
    return this.world.districts.reduce((sum, d) => sum + (d.population ?? 0), 0);
  }

  /** City-wide population + race breakdown, summed across districts. */
  cityDemographics(): Demographics {
    const byRace = new Map<Race, number>();
    let total = 0;
    for (const d of this.world.districts) {
      if (d.population === undefined) continue;
      total += d.population;
      for (const r of d.races) byRace.set(r.race, (byRace.get(r.race) ?? 0) + r.count);
    }
    return demographicsOf(
      total,
      [...byRace].map(([race, count]) => ({ race, count })),
    );
  }

  /** NPCs whose home district is this one. */
  npcsInDistrict(id: DistrictId): Npc[] {
    return this.world.npcs.filter((n) => n.districtId === id);
  }

  /** Landmarks tagged to this district, across all levels. */
  landmarksInDistrict(id: DistrictId): Landmark[] {
    return this.world.landmarks.filter((l) => l.districtId === id);
  }

  /** Every per-level slice of a district, in level-depth order. */
  areasInDistrict(id: DistrictId): Area[] {
    const areas = this.areasByDistrict.get(id) ?? [];
    const depthOf = new Map(this.world.levels.map((l) => [l.id, l.depth]));
    return [...areas].sort(
      (a, b) => (depthOf.get(a.levelId) ?? 0) - (depthOf.get(b.levelId) ?? 0),
    );
  }

  levels(): World["levels"] {
    return [...this.world.levels].sort((a, b) => a.depth - b.depth);
  }

  areasOnLevel(levelId: LevelId): Area[] {
    return this.world.areas.filter((a) => a.levelId === levelId);
  }

  /**
   * Standings in an area, sorted by control share descending. This is the core
   * datum behind the per-area influence bar.
   */
  standings(areaId: AreaId): AreaStanding[] {
    const presence = this.presenceByArea.get(areaId) ?? [];
    const totalInfluence = presence.reduce((sum, p) => sum + p.influence, 0);

    const rows: AreaStanding[] = [];
    for (const p of presence) {
      const faction = this.factionById.get(p.factionId);
      if (!faction) continue; // integrity guarantees this won't happen
      rows.push({
        faction,
        influence: p.influence,
        power: p.power,
        share: totalInfluence > 0 ? p.influence / totalInfluence : 0,
        note: p.note,
      });
    }
    return rows.sort((a, b) => b.share - a.share || b.power - a.power);
  }

  /** The faction with the largest control share, if any presence exists. */
  dominant(areaId: AreaId): AreaStanding | undefined {
    return this.standings(areaId)[0];
  }

  /**
   * District-wide standings: influence and power summed across every level-slice
   * of the district, with share recomputed against the district total. This is
   * the "who controls Ala Fungi overall" rollup across depths.
   */
  districtStandings(districtId: DistrictId): AreaStanding[] {
    const totals = new Map<FactionId, { influence: number; power: number }>();
    for (const area of this.areasByDistrict.get(districtId) ?? []) {
      for (const p of this.presenceByArea.get(area.id) ?? []) {
        const acc = totals.get(p.factionId) ?? { influence: 0, power: 0 };
        acc.influence += p.influence;
        acc.power += p.power;
        totals.set(p.factionId, acc);
      }
    }

    const totalInfluence = [...totals.values()].reduce((s, t) => s + t.influence, 0);
    const rows: AreaStanding[] = [];
    for (const [factionId, t] of totals) {
      const faction = this.factionById.get(factionId);
      if (!faction) continue;
      rows.push({
        faction,
        influence: t.influence,
        power: t.power,
        share: totalInfluence > 0 ? t.influence / totalInfluence : 0,
        note: "",
      });
    }
    return rows.sort((a, b) => b.share - a.share || b.power - a.power);
  }
}

/* -------------------------------------------------------------------- geometry */

/** Area-weighted centroid of a polygon; used to place labels. */
export function centroid(polygon: Polygon): Point {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (twiceArea === 0) {
    // Degenerate polygon: fall back to the mean of vertices.
    const mean = polygon.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 },
    );
    return { x: mean.x / polygon.length, y: mean.y / polygon.length };
  }
  const factor = 1 / (3 * twiceArea);
  return { x: cx * factor, y: cy * factor };
}

/** Serialize a polygon to an SVG points string. */
export function toSvgPoints(polygon: Polygon): string {
  return polygon.map((p) => `${p.x},${p.y}`).join(" ");
}

/**
 * Inset a polygon inward by `margin` (in viewBox units) so a filled region
 * doesn't cover the base map's district boundary lines — the gaps stay visible.
 * Each edge is offset toward the centroid and consecutive offset edges are
 * intersected; robust for the simple blob shapes districts use.
 */
export function insetPolygon(poly: Polygon, margin: number): Point[] {
  const n = poly.length;
  if (n < 3 || margin <= 0) return [...poly];
  const c = centroid(poly);

  // Offset each edge inward (toward centroid) by `margin`.
  const lines: { px: number; py: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (nx * (c.x - mx) + ny * (c.y - my) < 0) {
      nx = -nx;
      ny = -ny;
    }
    lines.push({ px: a.x + nx * margin, py: a.y + ny * margin, dx, dy });
  }

  // Each vertex is the intersection of its two adjacent offset edges.
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n]!;
    const l2 = lines[i]!;
    const denom = l1.dx * l2.dy - l1.dy * l2.dx;
    if (Math.abs(denom) < 1e-6) {
      out.push({ x: l2.px, y: l2.py }); // near-parallel edges
      continue;
    }
    const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / denom;
    out.push({ x: l1.px + t * l1.dx, y: l1.py + t * l1.dy });
  }
  return out;
}

/** Where to place an area's label/marker: explicit anchor, else polygon centroid. */
export function areaAnchor(area: Area): Point {
  if (area.labelAnchor) return area.labelAnchor;
  if (area.polygon) return centroid(area.polygon);
  return { x: 0, y: 0 };
}

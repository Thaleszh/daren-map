import type {
  Area,
  District,
  Faction,
  Grouping,
  Initiative,
  Landmark,
  Npc,
  Point,
  Polygon,
  Presence,
  Race,
  World,
} from "./schema";
import type { AreaId, DistrictId, FactionId, GroupingId, InitiativeId, LevelId } from "./ids";

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

function demographicsOf(
  total: number,
  races: readonly { race: Race; count: number }[],
): Demographics {
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
  /**
   * In a grouped view, the member factions behind a group row. Their shares are
   * against the same area total, so they add up to the group's share.
   */
  members?: AreaStanding[];
}

/** How a grouped Atlas relates back to the ungrouped one it was derived from. */
interface GroupedView {
  base: Atlas;
  grouping: Grouping;
  /** group id → its member faction ids */
  members: ReadonlyMap<FactionId, ReadonlySet<FactionId>>;
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
  private readonly view: GroupedView | undefined;
  private readonly groupedCache = new Map<GroupingId, Atlas>();

  constructor(world: World, view?: GroupedView) {
    this.world = world;
    this.view = view;
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

  /** The grouping this view rolls factions up by, or undefined when ungrouped. */
  grouping(): Grouping | undefined {
    return this.view?.grouping;
  }

  /**
   * The factions that carry presence in this view — every faction when
   * ungrouped; the groups plus any ungrouped factions otherwise.
   */
  displayFactions(): Faction[] {
    const view = this.view;
    if (!view) return this.world.factions;
    const grouped = new Set<FactionId>();
    for (const ids of view.members.values()) for (const id of ids) grouped.add(id);
    return this.world.factions.filter((f) => !grouped.has(f.id));
  }

  /**
   * The same city seen through a grouping: each group becomes one faction whose
   * influence and power are its members' sums (uncapped: a bloc's power may pass
   * 20). Built once per grouping and cached; asking a grouped view for another
   * grouping regroups from the ungrouped base.
   */
  grouped(id: GroupingId): Atlas | undefined {
    const root = this.view?.base ?? this;
    if (root !== this) return root.grouped(id);
    const cached = this.groupedCache.get(id);
    if (cached) return cached;
    const grouping = this.world.groupings.find((g) => g.id === id);
    if (!grouping) return undefined;
    const atlas = new Atlas(groupWorld(this.world, grouping), {
      base: this,
      grouping,
      members: new Map(grouping.groups.map((g) => [g.id, new Set(g.members)])),
    });
    this.groupedCache.set(id, atlas);
    return atlas;
  }

  /** Attach the ungrouped member rows behind each group row. */
  private withMembers(rows: AreaStanding[], baseRows: () => AreaStanding[]): AreaStanding[] {
    const view = this.view;
    if (!view) return rows;
    let base: AreaStanding[] | undefined;
    for (const row of rows) {
      const ids = view.members.get(row.faction.id);
      if (!ids) continue;
      base ??= baseRows();
      row.members = base.filter((b) => ids.has(b.faction.id));
    }
    return rows;
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

  /**
   * Resident population + race breakdown for a district, or undefined if the
   * resident count is unrecorded. (Race and social class describe residents.)
   */
  demographics(id: DistrictId): Demographics | undefined {
    const d = this.districtById.get(id);
    const residents = d?.population?.residents;
    if (residents === undefined) return undefined;
    return demographicsOf(residents, d!.races);
  }

  /** Sum of all recorded district resident counts — the city's population. */
  cityPopulation(): number {
    return this.world.districts.reduce((sum, d) => sum + (d.population?.residents ?? 0), 0);
  }

  /** Sum of all recorded district daytime-worker counts. Not comparable to
   *  cityPopulation: a worker is counted here *and* as a resident of their home
   *  district, so the two overlap. */
  cityWorkers(): number {
    return this.world.districts.reduce((sum, d) => sum + (d.population?.workers ?? 0), 0);
  }

  /** City-wide resident population + race breakdown, summed across districts. */
  cityDemographics(): Demographics {
    const byRace = new Map<Race, number>();
    let total = 0;
    for (const d of this.world.districts) {
      const residents = d.population?.residents;
      if (residents === undefined) continue;
      total += residents;
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
    return [...areas].sort((a, b) => (depthOf.get(a.levelId) ?? 0) - (depthOf.get(b.levelId) ?? 0));
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
    rows.sort((a, b) => b.share - a.share || b.power - a.power);
    return this.withMembers(rows, () => this.view!.base.standings(areaId));
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
    rows.sort((a, b) => b.share - a.share || b.power - a.power);
    return this.withMembers(rows, () => this.view!.base.districtStandings(districtId));
  }
}

/**
 * Roll a world's presence up by one grouping. Member factions stay in
 * `factions` so NPC/landmark lookups still resolve; only presence moves to the
 * groups. Total influence per area is unchanged, so shares stay comparable.
 */
function groupWorld(world: World, grouping: Grouping): World {
  const groupOf = new Map<FactionId, FactionId>();
  for (const g of grouping.groups) for (const m of g.members) groupOf.set(m, g.id);

  const rolled = new Map<string, World["presence"][number]>();
  for (const p of world.presence) {
    const factionId = groupOf.get(p.factionId) ?? p.factionId;
    const key = `${factionId}::${p.areaId}`;
    const acc = rolled.get(key);
    if (acc) {
      acc.influence += p.influence;
      acc.power += p.power;
    } else {
      // A group row's note would be one arbitrary member's; drop it.
      rolled.set(key, { ...p, factionId, note: groupOf.has(p.factionId) ? "" : p.note });
    }
  }

  const groupFactions: Faction[] = grouping.groups.map((g) => ({
    id: g.id,
    name: g.name,
    shortName: g.shortName,
    color: g.color,
    description: g.description,
    isPlayerOrg: false,
  }));
  return {
    ...world,
    factions: [...world.factions, ...groupFactions],
    presence: [...rolled.values()],
  };
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
    const mean = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
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

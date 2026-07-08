import { WorldSchema, type World, type WorldInput } from "./schema";

/**
 * Thrown when the data is structurally valid (passes Zod) but *referentially*
 * broken: a presence points at a faction that doesn't exist, an elevator lists
 * a level it has no position for, etc. Zod validates shapes; this validates the
 * graph.
 */
export class WorldIntegrityError extends Error {
  constructor(public readonly problems: string[]) {
    super(`World failed integrity checks:\n` + problems.map((p) => `  • ${p}`).join("\n"));
    this.name = "WorldIntegrityError";
  }
}

/**
 * Parse and fully validate raw world data.
 *
 * 1. Zod parse — shapes, ranges, brands.
 * 2. Referential integrity — every cross-reference resolves.
 *
 * Fails loud at load time rather than rendering a half-broken map. Returns the
 * branded {@link World} that the rest of the app consumes.
 */
export function loadWorld(raw: WorldInput): World {
  const world = WorldSchema.parse(raw);
  const problems: string[] = [];
  const ref: RefSets = {
    levels: new Set(world.levels.map((l) => l.id)),
    districts: new Set(world.districts.map((d) => d.id)),
    areas: new Set(world.areas.map((a) => a.id)),
    factions: new Set(world.factions.map((f) => f.id)),
    landmarks: new Set(world.landmarks.map((l) => l.id)),
    initiatives: new Set(world.initiatives.map((i) => i.id)),
  };

  // Unique ids per collection.
  requireUnique(
    world.levels.map((l) => l.id),
    "level",
    problems,
  );
  requireUnique(
    world.districts.map((d) => d.id),
    "district",
    problems,
  );
  requireUnique(
    world.areas.map((a) => a.id),
    "area",
    problems,
  );
  requireUnique(
    world.factions.map((f) => f.id),
    "faction",
    problems,
  );
  requireUnique(
    world.landmarks.map((l) => l.id),
    "landmark",
    problems,
  );
  requireUnique(
    world.npcs.map((n) => n.id),
    "npc",
    problems,
  );
  requireUnique(
    world.initiatives.map((i) => i.id),
    "initiative",
    problems,
  );

  // Cross-reference graph, one collection at a time.
  checkDistricts(world, problems);
  checkAreas(world, ref, problems);
  checkPresence(world, ref, problems);
  checkElevators(world, ref, problems);
  checkLandmarks(world, ref, problems);
  checkNpcs(world, ref, problems);
  checkInitiatives(world, ref, problems);
  checkChronicle(world, ref, problems);
  checkPlayerOrg(world, problems);

  if (problems.length > 0) {
    throw new WorldIntegrityError(problems);
  }
  return world;
}

/** The id sets every cross-reference check resolves against, built once. */
interface RefSets {
  levels: ReadonlySet<string>;
  districts: ReadonlySet<string>;
  areas: ReadonlySet<string>;
  factions: ReadonlySet<string>;
  landmarks: ReadonlySet<string>;
  initiatives: ReadonlySet<string>;
}

/** Districts: non-human headcount can't exceed the population. */
function checkDistricts(world: World, problems: string[]): void {
  for (const d of world.districts) {
    if (d.population === undefined) continue;
    const minorities = d.races.reduce((sum, r) => sum + r.count, 0);
    if (minorities > d.population) {
      problems.push(
        `district "${d.id}" lists ${minorities} non-humans but only ${d.population} inhabitants`,
      );
    }
  }
}

/** Areas → levels + districts, and every area must be placeable. */
function checkAreas(world: World, ref: RefSets, problems: string[]): void {
  for (const area of world.areas) {
    if (!ref.levels.has(area.levelId)) {
      problems.push(`area "${area.id}" references missing level "${area.levelId}"`);
    }
    if (area.districtId !== undefined && !ref.districts.has(area.districtId)) {
      problems.push(`area "${area.id}" references missing district "${area.districtId}"`);
    }
    if (area.polygon === undefined && area.labelAnchor === undefined) {
      problems.push(`area "${area.id}" has neither a polygon nor a labelAnchor`);
    }
  }
}

/** Presence → factions + areas, and no duplicate (faction, area) pair. */
function checkPresence(world: World, ref: RefSets, problems: string[]): void {
  const seen = new Set<string>();
  for (const p of world.presence) {
    if (!ref.factions.has(p.factionId)) {
      problems.push(`presence references missing faction "${p.factionId}"`);
    }
    if (!ref.areas.has(p.areaId)) {
      problems.push(`presence references missing area "${p.areaId}"`);
    }
    const key = `${p.factionId}::${p.areaId}`;
    if (seen.has(key)) {
      problems.push(`duplicate presence for faction "${p.factionId}" in area "${p.areaId}"`);
    }
    seen.add(key);
  }
}

/** Elevators → levels, with a position for each connected level. */
function checkElevators(world: World, ref: RefSets, problems: string[]): void {
  for (const e of world.elevators) {
    for (const lvl of e.levelIds) {
      if (!ref.levels.has(lvl)) {
        problems.push(`elevator "${e.id}" references missing level "${lvl}"`);
      }
      if (!(lvl in e.positions)) {
        problems.push(`elevator "${e.id}" has no position for level "${lvl}"`);
      }
    }
  }
}

/** Landmarks → levels, districts, factions. */
function checkLandmarks(world: World, ref: RefSets, problems: string[]): void {
  for (const lm of world.landmarks) {
    if (!ref.levels.has(lm.levelId)) {
      problems.push(`landmark "${lm.id}" references missing level "${lm.levelId}"`);
    }
    if (lm.districtId !== undefined && !ref.districts.has(lm.districtId)) {
      problems.push(`landmark "${lm.id}" references missing district "${lm.districtId}"`);
    }
    if (lm.factionId !== undefined && !ref.factions.has(lm.factionId)) {
      problems.push(`landmark "${lm.id}" references missing faction "${lm.factionId}"`);
    }
  }
}

/** NPCs → districts, factions. */
function checkNpcs(world: World, ref: RefSets, problems: string[]): void {
  for (const npc of world.npcs) {
    if (npc.districtId !== undefined && !ref.districts.has(npc.districtId)) {
      problems.push(`npc "${npc.id}" references missing district "${npc.districtId}"`);
    }
    if (npc.factionId !== undefined && !ref.factions.has(npc.factionId)) {
      problems.push(`npc "${npc.id}" references missing faction "${npc.factionId}"`);
    }
  }
}

/** Initiatives → areas, landmarks, and sibling initiatives (no self-reference). */
function checkInitiatives(world: World, ref: RefSets, problems: string[]): void {
  for (const init of world.initiatives) {
    for (const a of init.areaIds) {
      if (!ref.areas.has(a)) {
        problems.push(`initiative "${init.id}" references missing area "${a}"`);
      }
    }
    for (const l of init.landmarkIds) {
      if (!ref.landmarks.has(l)) {
        problems.push(`initiative "${init.id}" references missing landmark "${l}"`);
      }
    }
    for (const r of init.relatedInitiativeIds) {
      if (r === init.id) {
        problems.push(`initiative "${init.id}" lists itself as related`);
      } else if (!ref.initiatives.has(r)) {
        problems.push(`initiative "${init.id}" references missing initiative "${r}"`);
      }
    }
  }
}

/** Chronicle → factions + areas. */
function checkChronicle(world: World, ref: RefSets, problems: string[]): void {
  for (const ev of world.chronicle) {
    for (const f of ev.factionIds) {
      if (!ref.factions.has(f)) {
        problems.push(`event "${ev.id}" references missing faction "${f}"`);
      }
    }
    for (const a of ev.areaIds) {
      if (!ref.areas.has(a)) {
        problems.push(`event "${ev.id}" references missing area "${a}"`);
      }
    }
  }
}

/** Player org sanity: expect exactly one faction flagged isPlayerOrg. */
function checkPlayerOrg(world: World, problems: string[]): void {
  const playerOrgs = world.factions.filter((f) => f.isPlayerOrg);
  if (playerOrgs.length === 0) {
    problems.push(`no faction is flagged isPlayerOrg (expected "${world.meta.playerOrg}")`);
  } else if (playerOrgs.length > 1) {
    problems.push(
      `multiple factions flagged isPlayerOrg: ${playerOrgs.map((f) => f.id).join(", ")}`,
    );
  }
}

function requireUnique(ids: string[], kind: string, problems: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) problems.push(`duplicate ${kind} id "${id}"`);
    seen.add(id);
  }
}

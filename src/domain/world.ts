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
    npcs: new Set(world.npcs.map((n) => n.id)),
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
  requireUnique(
    world.expeditions.map((e) => e.id),
    "expedition",
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
  checkExpeditions(world, ref, problems);
  checkChronicle(world, ref, problems);
  checkGroupings(world, ref, problems);
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
  npcs: ReadonlySet<string>;
}

/** Districts: non-human residents can't exceed the resident population. */
function checkDistricts(world: World, problems: string[]): void {
  for (const d of world.districts) {
    const residents = d.population?.residents;
    if (residents === undefined) continue;
    const minorities = d.races.reduce((sum, r) => sum + r.count, 0);
    if (minorities > residents) {
      problems.push(
        `district "${d.id}" lists ${minorities} non-human residents but only ${residents} residents`,
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

/**
 * Groupings → factions. Group ids share the faction id space in a grouped view,
 * so they must not shadow a faction; and a faction may sit in only one group per
 * grouping, or its influence would be counted twice and shares pass 100%.
 */
function checkGroupings(world: World, ref: RefSets, problems: string[]): void {
  requireUnique(
    world.groupings.map((g) => g.id),
    "grouping",
    problems,
  );
  for (const grouping of world.groupings) {
    requireUnique(
      grouping.groups.map((g) => g.id),
      `group in grouping "${grouping.id}"`,
      problems,
    );
    const placed = new Map<string, string>();
    for (const group of grouping.groups) {
      if (ref.factions.has(group.id)) {
        problems.push(`group "${group.id}" in grouping "${grouping.id}" reuses a faction id`);
      }
      for (const m of group.members) {
        if (!ref.factions.has(m)) {
          problems.push(`group "${group.id}" references missing faction "${m}"`);
        }
        const prev = placed.get(m);
        if (prev !== undefined) {
          problems.push(
            `faction "${m}" is in both "${prev}" and "${group.id}" in grouping "${grouping.id}"`,
          );
        }
        placed.set(m, group.id);
      }
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

/** Expeditions → contractor faction + NPCs, and an arc can't end before it starts. */
function checkExpeditions(world: World, ref: RefSets, problems: string[]): void {
  for (const exp of world.expeditions) {
    if (exp.contractorFactionId !== undefined && !ref.factions.has(exp.contractorFactionId)) {
      problems.push(
        `expedition "${exp.id}" references missing faction "${exp.contractorFactionId}"`,
      );
    }
    for (const n of exp.npcIds) {
      if (!ref.npcs.has(n)) {
        problems.push(`expedition "${exp.id}" references missing npc "${n}"`);
      }
    }
    // ISO dates compare correctly as strings.
    if (exp.startDate && exp.endDate && exp.endDate < exp.startDate) {
      problems.push(
        `expedition "${exp.id}" ends (${exp.endDate}) before it starts (${exp.startDate})`,
      );
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

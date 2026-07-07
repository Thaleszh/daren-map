import { WorldSchema, type World, type WorldInput } from "./schema";

/**
 * Thrown when the data is structurally valid (passes Zod) but *referentially*
 * broken: a presence points at a faction that doesn't exist, an elevator lists
 * a level it has no position for, etc. Zod validates shapes; this validates the
 * graph.
 */
export class WorldIntegrityError extends Error {
  constructor(public readonly problems: string[]) {
    super(
      `World failed integrity checks:\n` +
        problems.map((p) => `  • ${p}`).join("\n"),
    );
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

  const levelIds = new Set(world.levels.map((l) => l.id));
  const districtIds = new Set(world.districts.map((d) => d.id));
  const areaIds = new Set(world.areas.map((a) => a.id));
  const factionIds = new Set(world.factions.map((f) => f.id));

  // Unique ids per collection.
  requireUnique(world.levels.map((l) => l.id), "level", problems);
  requireUnique(world.districts.map((d) => d.id), "district", problems);
  requireUnique(world.areas.map((a) => a.id), "area", problems);
  requireUnique(world.factions.map((f) => f.id), "faction", problems);

  // Districts: non-human headcount can't exceed the population.
  for (const d of world.districts) {
    if (d.population === undefined) continue;
    const minorities = d.races.reduce((sum, r) => sum + r.count, 0);
    if (minorities > d.population) {
      problems.push(
        `district "${d.id}" lists ${minorities} non-humans but only ${d.population} inhabitants`,
      );
    }
  }

  // Areas → levels + districts.
  for (const area of world.areas) {
    if (!levelIds.has(area.levelId)) {
      problems.push(`area "${area.id}" references missing level "${area.levelId}"`);
    }
    if (area.districtId !== undefined && !districtIds.has(area.districtId)) {
      problems.push(`area "${area.id}" references missing district "${area.districtId}"`);
    }
    if (area.polygon === undefined && area.labelAnchor === undefined) {
      problems.push(`area "${area.id}" has neither a polygon nor a labelAnchor`);
    }
  }

  // Presence → factions + areas, and no duplicate (faction, area) pair.
  const seenPresence = new Set<string>();
  for (const p of world.presence) {
    if (!factionIds.has(p.factionId)) {
      problems.push(`presence references missing faction "${p.factionId}"`);
    }
    if (!areaIds.has(p.areaId)) {
      problems.push(`presence references missing area "${p.areaId}"`);
    }
    const key = `${p.factionId}::${p.areaId}`;
    if (seenPresence.has(key)) {
      problems.push(`duplicate presence for faction "${p.factionId}" in area "${p.areaId}"`);
    }
    seenPresence.add(key);
  }

  // Elevators → levels, with a position for each connected level.
  for (const e of world.elevators) {
    for (const lvl of e.levelIds) {
      if (!levelIds.has(lvl)) {
        problems.push(`elevator "${e.id}" references missing level "${lvl}"`);
      }
      if (!(lvl in e.positions)) {
        problems.push(`elevator "${e.id}" has no position for level "${lvl}"`);
      }
    }
  }

  // Landmarks → levels, districts, factions.
  requireUnique(world.landmarks.map((l) => l.id), "landmark", problems);
  for (const lm of world.landmarks) {
    if (!levelIds.has(lm.levelId)) {
      problems.push(`landmark "${lm.id}" references missing level "${lm.levelId}"`);
    }
    if (lm.districtId !== undefined && !districtIds.has(lm.districtId)) {
      problems.push(`landmark "${lm.id}" references missing district "${lm.districtId}"`);
    }
    if (lm.factionId !== undefined && !factionIds.has(lm.factionId)) {
      problems.push(`landmark "${lm.id}" references missing faction "${lm.factionId}"`);
    }
  }

  // NPCs → districts, factions.
  requireUnique(world.npcs.map((n) => n.id), "npc", problems);
  for (const npc of world.npcs) {
    if (npc.districtId !== undefined && !districtIds.has(npc.districtId)) {
      problems.push(`npc "${npc.id}" references missing district "${npc.districtId}"`);
    }
    if (npc.factionId !== undefined && !factionIds.has(npc.factionId)) {
      problems.push(`npc "${npc.id}" references missing faction "${npc.factionId}"`);
    }
  }

  // Projects → factions + areas.
  for (const proj of world.projects) {
    if (!factionIds.has(proj.ownerFactionId)) {
      problems.push(`project "${proj.id}" references missing owner "${proj.ownerFactionId}"`);
    }
    for (const a of proj.areaIds) {
      if (!areaIds.has(a)) {
        problems.push(`project "${proj.id}" references missing area "${a}"`);
      }
    }
  }

  // Chronicle → factions + areas.
  for (const ev of world.chronicle) {
    for (const f of ev.factionIds) {
      if (!factionIds.has(f)) {
        problems.push(`event "${ev.id}" references missing faction "${f}"`);
      }
    }
    for (const a of ev.areaIds) {
      if (!areaIds.has(a)) {
        problems.push(`event "${ev.id}" references missing area "${a}"`);
      }
    }
  }

  // Player org sanity: expect exactly one.
  const playerOrgs = world.factions.filter((f) => f.isPlayerOrg);
  if (playerOrgs.length === 0) {
    problems.push(`no faction is flagged isPlayerOrg (expected "${world.meta.playerOrg}")`);
  } else if (playerOrgs.length > 1) {
    problems.push(`multiple factions flagged isPlayerOrg: ${playerOrgs.map((f) => f.id).join(", ")}`);
  }

  if (problems.length > 0) {
    throw new WorldIntegrityError(problems);
  }
  return world;
}

function requireUnique(ids: string[], kind: string, problems: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) problems.push(`duplicate ${kind} id "${id}"`);
    seen.add(id);
  }
}

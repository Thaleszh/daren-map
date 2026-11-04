// Generates src/data/world.generated.json from the PSD-extracted metadata,
// a district registry, a faction roster, and a lore-grounded influence seed.
//
// Re-run after extract-levels.mjs whenever the PSD changes:
//   node scripts/extract-levels.mjs && node scripts/generate-world.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkWorld } from "./lib/check-world.mjs";
import { LEVELS } from "./world-data/levels.mjs";
import { DISTRICT_OF, DISTRICT_META } from "./world-data/districts.mjs";
import { DISTRICT_DLC } from "./world-data/district-dlc.mjs";
import { districtPopulation } from "./world-data/population.mjs";
import { NPCS } from "./world-data/npcs.mjs";
import { ELEVATOR_NAME } from "./world-data/elevators.mjs";
import { FACTIONS, GROUPINGS } from "./world-data/factions.mjs";
import { PRESENCE } from "./world-data/presence.mjs";
import { MEMBERS, memberId } from "./world-data/members.mjs";
import { EXPEDITIONS } from "./world-data/expeditions.mjs";
import { RELATIONS } from "./world-data/relations.mjs";
import { INITIATIVES } from "./world-data/initiatives.mjs";
import { TIMELINE } from "./world-data/timeline.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(
  readFileSync(join(root, "src", "data", "psd-metadata.json"), "utf8"),
);

/* ------------------------------------------------------------- assemble ---- */
const clean = (n) => n.replace(/\s+/g, " ").trim();
const metaBySlug = new Map(meta.levels.map((l) => [l.slug, l]));

const districtsUsed = new Map(); // id → name
const areas = [];
const elevatorAcc = new Map(); // name → { levelIds:Set, positions:{} }

for (const lvl of LEVELS) {
  const m = metaBySlug.get(lvl.slug);
  if (!m) continue;

  for (const d of m.districts) {
    const entry = DISTRICT_OF[clean(d.name)];
    if (!entry) {
      console.warn(`! unmapped district label "${d.name}" on ${lvl.slug}`);
      continue;
    }
    const [districtId, districtName] = entry;
    districtsUsed.set(districtId, districtName);
    areas.push({
      id: `${districtId}@${lvl.slug}`,
      levelId: lvl.slug,
      districtId,
      name: districtName,
      labelAnchor: { x: d.x, y: d.y },
    });
  }

  for (const e of m.elevators) {
    const name = clean(e.name);
    const acc = elevatorAcc.get(name) ?? { levelIds: new Set(), positions: {} };
    acc.levelIds.add(lvl.slug);
    acc.positions[lvl.slug] = { x: e.x, y: e.y };
    elevatorAcc.set(name, acc);
  }
}

const districts = [...districtsUsed].map(([id, name]) => {
  const dlc = DISTRICT_DLC[id] ?? {};
  const pop = districtPopulation(id);
  return {
    id,
    name,
    description: dlc.description ?? DISTRICT_META[id] ?? "",
    ...(pop.population !== undefined ? { population: pop.population } : {}),
    races: pop.races,
    classes: pop.classes,
    occupations: pop.occupations,
    demographics: dlc.demographics ?? "",
    qualityOfLife: dlc.qualityOfLife ?? "",
    history: dlc.history ?? [],
    events: dlc.events ?? [],
    relations: dlc.relations ?? [],
    rumors: dlc.rumors ?? [],
  };
});

const elevators = [...elevatorAcc]
  .filter(([, v]) => v.levelIds.size >= 2)
  .map(([name, v]) => ({
    id: `elev-${name.toLowerCase()}`,
    name: ELEVATOR_NAME[name] ?? name,
    levelIds: [...v.levelIds],
    positions: v.positions,
  }));

const factions = FACTIONS.map(([id, name, shortName, color, isPlayerOrg, description, infoUrl]) => ({
  id,
  name,
  shortName,
  color,
  isPlayerOrg,
  description,
  ...(infoUrl ? { infoUrl } : {}),
}));

const resTotal = districts.reduce((s, d) => s + (d.population?.residents ?? 0), 0);
const workTotal = districts.reduce((s, d) => s + (d.population?.workers ?? 0), 0);
const occTotals = {};
for (const d of districts) {
  for (const o of d.occupations) occTotals[o.occupation] = Math.round((occTotals[o.occupation] ?? 0) + o.share * (d.population?.workers ?? 0));
}
console.log("occupations:", occTotals);
const raceTotals = {};
for (const d of districts) for (const r of d.races) raceTotals[r.race] = (raceTotals[r.race] ?? 0) + r.count;
console.log(
  `population: ~${resTotal.toLocaleString("en-US")} residents, ~${workTotal.toLocaleString("en-US")} daytime workers; minorities`,
  raceTotals,
);

const areaIds = new Set(areas.map((a) => a.id));
const presence = [];
for (const [key, rows] of Object.entries(PRESENCE)) {
  const [districtId, slug] = key.split("@");
  const areaId = `${districtId}@${slug}`;
  if (!areaIds.has(areaId)) {
    console.warn(`! presence for unknown area "${areaId}" — skipped`);
    continue;
  }
  for (const [factionId, influence, power] of rows) {
    presence.push({ factionId, areaId, influence, power });
  }
}

const world = {
  meta: { city: "Daren", playerOrg: "Sem Cores" },
  levels: LEVELS.map((l) => ({
    id: l.slug,
    name: l.name,
    depth: l.depth,
    image: `levels/${l.slug}.png`,
    viewBox: { width: meta.canvas.width, height: meta.canvas.height },
    blurb: l.blurb,
  })),
  districts,
  areas,
  factions,
  groupings: GROUPINGS.map(({ groups, ...g }) => ({
    ...g,
    groups: groups.map(([id, name, shortName, color, description, members]) => ({
      id,
      name,
      shortName,
      color,
      description,
      members,
    })),
  })),
  npcs: NPCS.map(([id, name, districtId, factionId, role, description]) => {
    const npc = { id, name, role, description };
    if (districtId) npc.districtId = districtId;
    if (factionId) npc.factionId = factionId;
    return npc;
  }),
  members: MEMBERS,
  presence,
  elevators,
  initiatives: INITIATIVES.map(
    ([
      id,
      name,
      summary,
      areaIds = [],
      landmarkIds = [],
      status = "planned",
      relatedInitiativeIds = [],
      progress = 0,
      outcome = "",
      events = [],
      members = [],
    ]) => ({
      id,
      name,
      status,
      progress,
      summary,
      outcome,
      areaIds,
      landmarkIds,
      relatedInitiativeIds,
      memberIds: members.map(memberId),
      events: events.map((e) => ({ date: "", description: "", ...e })),
    }),
  ),
  expeditions: EXPEDITIONS.map(({ members, ...e }) => ({ ...e, memberIds: members.map(memberId) })),
  relations: RELATIONS,
  timeline: TIMELINE.map(({ members, ...ev }) => ({
    ...ev,
    memberIds: [...new Set(members.map(memberId))],
  })),
  chronicle: [],
};

writeFileSync(
  join(root, "src", "data", "world.generated.json"),
  JSON.stringify(world, null, 2),
);
console.log(
  `world.generated.json: ${world.levels.length} levels, ${districts.length} districts, ` +
    `${areas.length} areas, ${factions.length} factions, ${world.npcs.length} npcs, ` +
    `${elevators.length} elevators, ${presence.length} presence rows`,
);

// Gate: validate the freshly-written file through the real schema + integrity
// pipeline, merged with annotations exactly as the app does — so schema drift
// fails here at generation time instead of only in the browser at runtime.
try {
  const stats = await checkWorld();
  console.log("✓ schema + integrity OK (merged with annotations):", JSON.stringify(stats));
} catch (err) {
  console.error(
    "✗ generated world FAILED validation:\n",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}
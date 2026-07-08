// Bakes ("blesses") procedural city geometry into src/data/cityscapes.json, so a
// map's streets/buildings are frozen against later changes to the generator or
// to district population. Uses the REAL buildCityscape + density code.
//
//   node scripts/seed-cityscape.mjs <slug|all> [network]   # default: all levels, grid
//
// Idempotent: baking the same level again writes byte-identical geometry. Only
// traced areas (those with a polygon) are baked; the store is sparse, so any
// area left out simply keeps generating live in the app.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] ?? "all";
const network = process.argv[3] ?? "grid";
const storePath = join(root, "src", "data", "cityscapes.json");
const tmp = join(root, "node_modules", ".cache-cityscape-seed.mjs");

await build({
  entryPoints: [join(root, "scripts", "_cityscape-entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tmp,
  alias: { "@": join(root, "src") },
  loader: { ".json": "json" },
  logLevel: "silent",
});
const { loadWorld, Atlas, worldData, buildCityscape, areaDensities, toCityscapeRecord } =
  await import(pathToFileURL(tmp).href);

const atlas = new Atlas(loadWorld(worldData));
const popByDistrict = new Map(atlas.world.districts.map((d) => [d.id, d.population ?? 0]));
const levels = atlas.world.levels
  .filter((l) => target === "all" || l.id === target)
  .map((l) => l.id);
if (levels.length === 0) {
  console.error(`no level matched "${target}"`);
  process.exit(1);
}

// Preserve records for areas outside the baked scope (sparse, additive store).
const store = JSON.parse(readFileSync(storePath, "utf8"));
store.areas ??= {};

let baked = 0;
for (const levelId of levels) {
  const areas = atlas.world.areas.filter((a) => a.levelId === levelId && a.polygon);
  // Density is level-local, so compute it per level over that level's areas.
  const densities = areaDensities(
    areas.map((a) => ({
      id: a.id,
      polygon: a.polygon,
      population: a.districtId ? (popByDistrict.get(a.districtId) ?? 0) : 0,
    })),
  );
  for (const a of areas) {
    const city = buildCityscape(a.polygon, { seed: a.id, network });
    store.areas[a.id] = toCityscapeRecord(city, densities.get(a.id) ?? 0.6);
    baked++;
  }
}

writeFileSync(storePath, JSON.stringify(store, null, 0) + "\n");
const bytes = readFileSync(storePath).length;
console.log(
  `baked ${baked} area(s) across ${levels.length} level(s) → ${storePath} (${(bytes / 1024).toFixed(0)} KB)`,
);

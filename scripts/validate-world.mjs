// Runs the real loadWorld() over the generated data + annotations, exactly as
// the app does at startup — so data problems surface here, not in the browser.
//   node scripts/validate-world.mjs
import { build } from "esbuild";
import { readFileSync, unlinkSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = join(root, "node_modules", ".cache-validate-world.mjs");

const entry = `
import { worldData } from "@/data/world.ts";
import { loadWorld } from "@/domain/world.ts";
import { Atlas } from "@/domain/selectors.ts";
const w = loadWorld(worldData);
const atlas = new Atlas(w);
// exercise a few selectors that the panel uses
for (const d of w.districts) { atlas.districtStandings(d.id); atlas.npcsInDistrict(d.id); }
console.log(JSON.stringify({
  levels: w.levels.length, districts: w.districts.length, areas: w.areas.length,
  tracedPolygons: w.areas.filter(a => a.polygon).length,
  factions: w.factions.length, npcs: w.npcs.length,
  landmarks: w.landmarks.length, elevators: w.elevators.length, presence: w.presence.length,
}));
`;

await build({
  stdin: { contents: entry, resolveDir: root, loader: "ts", sourcefile: "validate.ts" },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tmp,
  alias: { "@": join(root, "src") },
  loader: { ".json": "json" },
  logLevel: "silent",
});

try {
  const mod = await import(pathToFileURL(tmp).href);
  void mod;
  console.log("✓ loadWorld OK");
} catch (err) {
  console.error("✗ loadWorld FAILED:\n", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}

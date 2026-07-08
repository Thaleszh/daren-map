// Runs the real loadWorld() over the on-disk generated data + annotations,
// exactly as the app does at startup — so schema drift and referential-integrity
// problems surface at build time, not in the browser. Shared by
// validate-world.mjs (post-hoc check) and generate-world.mjs (post-write gate).
import { build } from "esbuild";
import { unlinkSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// worldData = world.generated.json merged with annotations, exactly as the app
// composes it; loadWorld runs Zod parse + integrity, Atlas exercises selectors.
const entry = `
import { worldData } from "@/data/world.ts";
import { loadWorld } from "@/domain/world.ts";
import { Atlas } from "@/domain/selectors.ts";
const w = loadWorld(worldData);
const atlas = new Atlas(w);
// exercise a few selectors that the panel uses
for (const d of w.districts) { atlas.districtStandings(d.id); atlas.npcsInDistrict(d.id); }
export const stats = {
  levels: w.levels.length, districts: w.districts.length, areas: w.areas.length,
  tracedPolygons: w.areas.filter(a => a.polygon).length,
  factions: w.factions.length, npcs: w.npcs.length,
  landmarks: w.landmarks.length, elevators: w.elevators.length, presence: w.presence.length,
};
`;

// Bundles + imports the entry so the real TS domain runs from a .mjs script.
// Returns the stats object on success; throws (the loadWorld error) on failure.
export async function checkWorld() {
  const tmp = join(root, "node_modules", ".cache-check-world.mjs");
  await build({
    stdin: { contents: entry, resolveDir: root, loader: "ts", sourcefile: "check-world.ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: tmp,
    alias: { "@": join(root, "src") },
    loader: { ".json": "json" },
    logLevel: "silent",
  });
  try {
    // cache-bust so a second call in the same process re-reads the fresh bundle
    const mod = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`);
    return mod.stats;
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

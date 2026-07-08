// Weld near-coincident polygon vertices across each level so shared district
// frontiers land on one coordinate — repairs hand-traced overlaps/gaps in
// src/data/annotations.json in place. Vertex counts are preserved; only
// coordinates move. Re-run scripts/validate-world.mjs afterwards.
//   node scripts/weld-polygons.mjs [tolerance]
import { build } from "esbuild";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const annPath = join(root, "src", "data", "annotations.json");
const tmp = join(root, "node_modules", ".cache-weld.mjs");

// Bundle the shared snap module so the script welds with the exact same logic
// the tracer snaps with — one source of truth for the geometry.
await build({
  entryPoints: [join(root, "src", "domain", "snap.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tmp,
  logLevel: "silent",
});
const { weldPolygons, WELD_TOLERANCE } = await import(pathToFileURL(tmp).href);
const tolerance = process.argv[2] ? Number(process.argv[2]) : WELD_TOLERANCE;

const ann = JSON.parse(readFileSync(annPath, "utf8"));
const polygons = ann.polygons ?? {};

// Area ids are `<slug>@<levelId>`; weld each level's polygons together so only
// shapes that actually share a map surface can snap to one another.
const byLevel = new Map();
for (const id of Object.keys(polygons)) {
  const level = id.split("@")[1] ?? id;
  if (!byLevel.has(level)) byLevel.set(level, []);
  byLevel.get(level).push(id);
}

let moved = 0;
let total = 0;
for (const ids of byLevel.values()) {
  const welded = weldPolygons(
    ids.map((id) => polygons[id]),
    tolerance,
  );
  ids.forEach((id, i) => {
    const before = polygons[id];
    const after = welded[i];
    for (let v = 0; v < after.length; v++) {
      total++;
      if (before[v].x !== after[v].x || before[v].y !== after[v].y) moved++;
    }
    polygons[id] = after;
  });
}

writeFileSync(annPath, JSON.stringify(ann, null, 2) + "\n");
unlinkSync(tmp);
console.log(
  `✓ welded ${moved}/${total} vertices across ${byLevel.size} level(s) (tolerance ${tolerance})`,
);

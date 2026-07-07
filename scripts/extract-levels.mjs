// Extracts, from the full Daren PSD:
//   1. A clean base PNG per level (no text labels, no elevator dots) → public/levels/
//   2. psd-metadata.json with elevator marker centers + district label anchors,
//      per level, in the shared 1709×1600 coordinate space.
//
// Run: node scripts/extract-levels.mjs
import { readPsd, initializeCanvas } from "ag-psd";
import { createCanvas } from "@napi-rs/canvas";
import { PNG } from "pngjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ag-psd needs a canvas backend to decode layer pixels.
initializeCanvas((w, h) => createCanvas(w, h));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "photoshop", "Danren city.psd");
const OUT_IMG = join(root, "public", "levels");
const OUT_META = join(root, "src", "data", "psd-metadata.json");

const psd = readPsd(readFileSync(SRC), {
  useImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
});
const W = psd.width;
const H = psd.height;

mkdirSync(OUT_IMG, { recursive: true });

// The level groups, in depth order, mapped to output slugs.
const LEVELS = [
  { group: "Superficie", slug: "level-0", depth: 0 },
  { group: "-1", slug: "level-1", depth: 1 },
  { group: "-2", slug: "level-2", depth: 2 },
  { group: "-3", slug: "level-3", depth: 3 },
  { group: "-4", slug: "level-4", depth: 4 },
  { group: "-5", slug: "level-5", depth: 5 },
  { group: "-6", slug: "level-6", depth: 6 },
];

const darencity = psd.children.find((c) => c.name === "Darencity");
if (!darencity) throw new Error('top group "Darencity" not found');

const isElevatorGroup = (n) => /^Elevadores/i.test(n ?? "");
const isBairrosGroup = (n) => /^Bairros/i.test(n ?? "");
const center = (l) => ({
  x: Math.round((l.left + l.right) / 2),
  y: Math.round((l.top + l.bottom) / 2),
});
const cleanName = (n) => (n ?? "").replace(/\s+/g, " ").trim();

/** Alpha source-over of a layer's imageData onto the RGBA accumulator. */
function drawLayer(acc, layer) {
  const img = layer.imageData;
  if (!img) return;
  const op = layer.opacity ?? 1;
  const lw = img.width;
  const lh = img.height;
  const ox = layer.left ?? 0;
  const oy = layer.top ?? 0;
  for (let y = 0; y < lh; y++) {
    const cy = oy + y;
    if (cy < 0 || cy >= H) continue;
    for (let x = 0; x < lw; x++) {
      const cx = ox + x;
      if (cx < 0 || cx >= W) continue;
      const si = (y * lw + x) * 4;
      const sa = (img.data[si + 3] / 255) * op;
      if (sa === 0) continue;
      const di = (cy * W + cx) * 4;
      const da = acc[di + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA === 0) continue;
      for (let c = 0; c < 3; c++) {
        const sc = img.data[si + c];
        const dc = acc[di + c];
        acc[di + c] = Math.round((sc * sa + dc * da * (1 - sa)) / outA);
      }
      acc[di + 3] = Math.round(outA * 255);
    }
  }
}

/** Recursively draw a group's layers into acc, honoring the clean-base rules. */
function drawGroup(acc, node, ctx) {
  for (const child of node.children ?? []) {
    if (child.hidden) continue;
    if (child.children) {
      if (isElevatorGroup(child.name)) continue; // never bake elevator dots
      drawGroup(acc, child, { inBairros: ctx.inBairros || isBairrosGroup(child.name) });
    } else {
      // Inside a Bairros group, keep only the outline drawing named "Bairros";
      // skip the per-district text label layers.
      if (ctx.inBairros && cleanName(child.name) !== "Bairros") continue;
      drawLayer(acc, child);
    }
  }
}

/** Collect elevator markers and district label anchors from a level group. */
function collectMeta(node, out) {
  for (const child of node.children ?? []) {
    if (child.children) {
      if (isElevatorGroup(child.name)) {
        for (const l of child.children ?? []) {
          if (l.left === undefined) continue;
          out.elevators.push({ name: cleanName(l.name), ...center(l) });
        }
      } else if (isBairrosGroup(child.name)) {
        for (const l of child.children ?? []) {
          if (l.children || l.left === undefined) continue;
          if (cleanName(l.name) === "Bairros") continue;
          out.districts.push({ name: cleanName(l.name), ...center(l) });
        }
      } else {
        collectMeta(child, out);
      }
    }
  }
}

const meta = { canvas: { width: W, height: H }, levels: [] };

for (const lvl of LEVELS) {
  const group = darencity.children.find((c) => cleanName(c.name) === lvl.group);
  if (!group) {
    console.warn(`! level group "${lvl.group}" not found — skipping`);
    continue;
  }

  const acc = new Uint8ClampedArray(W * H * 4); // transparent
  drawGroup(acc, group, { inBairros: false });

  const png = new PNG({ width: W, height: H });
  png.data = Buffer.from(acc.buffer);
  writeFileSync(join(OUT_IMG, `${lvl.slug}.png`), PNG.sync.write(png));

  const out = { elevators: [], districts: [] };
  collectMeta(group, out);
  meta.levels.push({ slug: lvl.slug, depth: lvl.depth, ...out });
  console.log(
    `${lvl.slug}: ${out.elevators.length} elevators, ${out.districts.length} district labels`,
  );
}

writeFileSync(OUT_META, JSON.stringify(meta, null, 2));
console.log(`\nwrote ${LEVELS.length} PNGs → public/levels/`);
console.log(`wrote metadata → src/data/psd-metadata.json`);

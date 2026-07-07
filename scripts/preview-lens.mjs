// Renders a level with a chosen lens, using the REAL insetPolygon/areaFill code
// and synthetic hexagon polygons (since none are traced yet), so the polygon
// fill + inset + contested bands can be eyeballed without a browser.
//   node scripts/preview-lens.mjs <lens> <slug> <out>
import { build } from "esbuild";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lens = process.argv[2] ?? "contested";
const slug = process.argv[3] ?? "level-0";
const out = process.argv[4] ?? join(root, `preview-lens.png`);
const tmp = join(root, "node_modules", ".cache-lens-entry.mjs");

await build({
  entryPoints: [join(root, "scripts", "_lens-entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tmp,
  alias: { "@": join(root, "src") },
  loader: { ".json": "json" },
  logLevel: "silent",
});
const { loadWorld, Atlas, insetPolygon, centroid, areaFill, lensContext, gradientStops, worldData } =
  await import(pathToFileURL(tmp).href);

const atlas = new Atlas(loadWorld(worldData));
const ctx = lensContext(atlas);
const level = atlas.world.levels.find((l) => l.id === slug);
const img = await loadImage(join(root, "public", "levels", `${slug}.png`));
const canvas = createCanvas(level.viewBox.width, level.viewBox.height);
const c = canvas.getContext("2d");
c.drawImage(img, 0, 0);

const anchorOf = (a) => a.labelAnchor ?? centroid(a.polygon ?? [{ x: 0, y: 0 }]);
const hex = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => ({
    x: cx + r * Math.cos((i / 6) * 2 * Math.PI - Math.PI / 2),
    y: cy + r * Math.sin((i / 6) * 2 * Math.PI - Math.PI / 2),
  }));
const trace = (c2, poly) => {
  c2.beginPath();
  poly.forEach((p, i) => (i ? c2.lineTo(p.x, p.y) : c2.moveTo(p.x, p.y)));
  c2.closePath();
};

for (const a of atlas.world.areas.filter((a) => a.levelId === slug)) {
  const anchor = anchorOf(a);
  const poly = a.polygon ?? hex(anchor.x, anchor.y, 85);
  const inset = insetPolygon(poly, 6);
  const fill = areaFill(atlas, a, { lens, focusFactionId: "sem-cores" }, ctx);

  if (fill.kind === "solid") {
    trace(c, inset);
    c.globalAlpha = fill.opacity;
    c.fillStyle = fill.fill;
    c.fill();
    c.globalAlpha = 1;
  } else {
    // contested: fill with a horizontal gradient that blends only at contacts
    const xs = inset.map((p) => p.x);
    const ys = inset.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const grad = c.createLinearGradient(minX, 0, maxX, 0);
    for (const s of gradientStops(fill.segments)) grad.addColorStop(s.offset, s.color);
    c.save();
    trace(c, inset);
    c.clip();
    c.globalAlpha = 0.62;
    c.fillStyle = grad;
    c.fillRect(minX, minY, maxX - minX, maxY - minY);
    c.restore();
    c.globalAlpha = 1;
  }
  // faint outline + label
  trace(c, inset);
  c.strokeStyle = "rgba(12,15,22,0.4)";
  c.lineWidth = 1;
  c.stroke();
  c.font = "bold 18px sans-serif";
  c.textAlign = "center";
  c.lineWidth = 4;
  c.strokeStyle = "#0c0f16";
  c.strokeText(a.name, anchor.x, anchor.y + 4);
  c.fillStyle = "#fff";
  c.fillText(a.name, anchor.x, anchor.y + 4);
}

writeFileSync(out, canvas.toBuffer("image/png"));
try {
  unlinkSync(tmp);
} catch {
  /* ignore */
}
console.log(`wrote ${out} (lens=${lens})`);

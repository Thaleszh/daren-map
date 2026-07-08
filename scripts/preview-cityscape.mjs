// Renders a level with the procedural city texture, using the REAL buildCityscape
// code and synthetic hexagon polygons where none are traced yet, so both styles
// ("ink" | "rooftops") can be eyeballed without a browser.
//   node scripts/preview-cityscape.mjs <style> <slug> <out>
import { build } from "esbuild";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const style = process.argv[2] ?? "ink";
const slug = process.argv[3] ?? "level-0";
const out = process.argv[4] ?? join(root, `preview-cityscape-${style}.png`);
const tmp = join(root, "node_modules", ".cache-cityscape-entry.mjs");

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
const { loadWorld, Atlas, centroid, worldData, buildCityscape, visibleBuildings, polygonArea } =
  await import(pathToFileURL(tmp).href);

const atlas = new Atlas(loadWorld(worldData));
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
const trace = (poly) => {
  c.beginPath();
  poly.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
};

// Same level-local density normalization the component uses.
const popByDistrict = new Map(atlas.world.districts.map((d) => [d.id, d.population ?? 0]));
const areasOnLevel = atlas.world.areas.filter((a) => a.levelId === slug);
const rows = areasOnLevel.map((a) => {
  const anchor = anchorOf(a);
  const poly = a.polygon ?? hex(anchor.x, anchor.y, 85);
  const pop = a.districtId ? (popByDistrict.get(a.districtId) ?? 0) : 0;
  const size = polygonArea(poly);
  return { area: a, poly, ppa: size > 0 ? pop / size : 0 };
});
const maxPpa = rows.reduce((m, r) => Math.max(m, r.ppa), 0);

for (const { area, poly, ppa } of rows) {
  const density = maxPpa > 0 && ppa > 0 ? 0.3 + 0.7 * (ppa / maxPpa) : 0.6;
  const city = buildCityscape(poly, { seed: area.id });
  const buildings = visibleBuildings(city, density);

  c.save();
  trace(poly);
  c.clip();

  if (style === "ink") {
    c.strokeStyle = "rgba(42,33,20,0.35)";
    c.lineWidth = 0.8;
    for (const r of city.roads) {
      c.beginPath();
      c.moveTo(r.x1, r.y1);
      c.lineTo(r.x2, r.y2);
      c.stroke();
    }
    c.strokeStyle = "rgba(36,27,15,0.55)";
    for (const b of buildings) drawRect(b, () => c.stroke());
  } else {
    c.strokeStyle = "rgba(28,21,12,0.28)";
    c.lineWidth = 1.4;
    for (const r of city.roads) {
      c.beginPath();
      c.moveTo(r.x1, r.y1);
      c.lineTo(r.x2, r.y2);
      c.stroke();
    }
    c.lineWidth = 0.5;
    c.strokeStyle = "rgba(23,15,7,0.4)";
    for (const b of buildings) {
      const l = Math.round(34 + b.shade * 24); // matches the CSS lightness ramp
      c.fillStyle = `hsla(28,24%,${l}%,0.5)`;
      drawRect(b, () => {
        c.fill();
        c.stroke();
      });
    }
  }
  c.restore();
}

function drawRect(b, paint) {
  c.save();
  c.translate(b.cx, b.cy);
  c.rotate((b.angle * Math.PI) / 180);
  c.beginPath();
  c.rect(-b.w / 2, -b.h / 2, b.w, b.h);
  paint();
  c.restore();
}

writeFileSync(out, canvas.toBuffer("image/png"));
try {
  unlinkSync(tmp);
} catch {
  /* ignore */
}
console.log(`wrote ${out} (style=${style}, slug=${slug})`);

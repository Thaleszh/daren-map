// Renders a static preview of one level the way the app's MapView will:
// clean base image + elevator markers + area markers/labels at their anchors.
// Verifies the generated coordinates line up with the artwork.
//   node scripts/preview-level.mjs level-0 <outPath>
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2] ?? "level-0";
const out = process.argv[3] ?? join(root, "preview.png");

const world = JSON.parse(
  readFileSync(join(root, "src", "data", "world.generated.json"), "utf8"),
);
const annotations = JSON.parse(
  readFileSync(join(root, "src", "data", "annotations.json"), "utf8"),
);
const level = world.levels.find((l) => l.id === slug);
const img = await loadImage(join(root, "public", "levels", `${slug}.png`));

const canvas = createCanvas(level.viewBox.width, level.viewBox.height);
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0);

// crude dominant-faction lookup for coloring markers
const factionColor = new Map(world.factions.map((f) => [f.id, f.color]));
const byArea = new Map();
for (const p of world.presence) {
  const list = byArea.get(p.areaId) ?? [];
  list.push(p);
  byArea.set(p.areaId, list);
}
const dominantColor = (areaId) => {
  const rows = (byArea.get(areaId) ?? []).slice().sort((a, b) => b.influence - a.influence);
  return rows[0] ? factionColor.get(rows[0].factionId) : "#8b93a7";
};

// elevators
for (const e of world.elevators) {
  const pos = e.positions[slug];
  if (!pos) continue;
  ctx.strokeStyle = "#e4c65b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  ctx.stroke();
}

// traced polygons (from annotations)
for (const a of world.areas.filter((a) => a.levelId === slug)) {
  const poly = annotations.polygons?.[a.id];
  if (!poly || poly.length < 3) continue;
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = dominantColor(a.id) + "44";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = dominantColor(a.id);
  ctx.stroke();
}

// landmarks (diamonds)
for (const lm of (annotations.landmarks ?? []).filter((l) => l.levelId === slug)) {
  const { x, y } = lm.position;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#3f7fb0";
  ctx.fillRect(-11, -11, 22, 22);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#0c0f16";
  ctx.strokeRect(-11, -11, 22, 22);
  ctx.restore();
  ctx.font = "bold 20px sans-serif";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#0c0f16";
  ctx.textAlign = "center";
  ctx.strokeText(lm.name, x, y - 22);
  ctx.fillStyle = "#fff";
  ctx.fillText(lm.name, x, y - 22);
}

// area markers + labels
ctx.textAlign = "center";
for (const a of world.areas.filter((a) => a.levelId === slug)) {
  const { x, y } = a.labelAnchor;
  ctx.fillStyle = dominantColor(a.id);
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#0c0f16";
  ctx.stroke();

  ctx.font = "bold 20px sans-serif";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#0c0f16";
  ctx.strokeText(a.name, x, y - 18);
  ctx.fillStyle = "#fff";
  ctx.fillText(a.name, x, y - 18);
}

writeFileSync(out, canvas.toBuffer("image/png"));
console.log(`wrote ${out}`);

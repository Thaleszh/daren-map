// Renders the regional map PSD (the lands around Daren) to a single PNG.
//
// Run: node scripts/extract-region.mjs
import { readPsd, initializeCanvas } from "ag-psd";
import { createCanvas } from "@napi-rs/canvas";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

initializeCanvas((w, h) => createCanvas(w, h));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "photoshop", "daren map.psd");
const OUT = join(root, "public", "region.png");

// The PSD's own flattened composite is the whole map, text and all.
const psd = readPsd(readFileSync(SRC), { skipThumbnail: true });
if (!psd.canvas) throw new Error("PSD has no composite image");
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, psd.canvas.toBuffer("image/png"));
console.log(`wrote ${OUT} (${psd.width}x${psd.height})`);

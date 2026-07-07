import { readPsd } from "ag-psd";
import { readFileSync } from "node:fs";

const file = process.argv[2];
const buf = readFileSync(file);
const psd = readPsd(buf, {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
});

console.log(`# ${file}`);
console.log(`canvas: ${psd.width} x ${psd.height}`);

function walk(layers, depth) {
  if (!layers) return;
  for (const l of layers) {
    const kind = l.children ? "[group]" : "layer";
    const vis = l.hidden ? " (hidden)" : "";
    const bounds =
      l.left !== undefined
        ? ` @(${l.left},${l.top})-(${l.right},${l.bottom})`
        : "";
    console.log(`${"  ".repeat(depth)}${kind} "${l.name ?? "?"}"${vis}${bounds}`);
    walk(l.children, depth + 1);
  }
}
walk(psd.children, 0);

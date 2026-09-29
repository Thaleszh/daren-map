import type { Area, Point, Polygon } from "./schema";

/* -------------------------------------------------------------------- geometry */

/** Area-weighted centroid of a polygon; used to place labels. */
export function centroid(polygon: Polygon): Point {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (twiceArea === 0) {
    // Degenerate polygon: fall back to the mean of vertices.
    const mean = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: mean.x / polygon.length, y: mean.y / polygon.length };
  }
  const factor = 1 / (3 * twiceArea);
  return { x: cx * factor, y: cy * factor };
}

/** Serialize a polygon to an SVG points string. */
export function toSvgPoints(polygon: Polygon): string {
  return polygon.map((p) => `${p.x},${p.y}`).join(" ");
}

/**
 * Inset a polygon inward by `margin` (in viewBox units) so a filled region
 * doesn't cover the base map's district boundary lines — the gaps stay visible.
 * Each edge is offset toward the centroid and consecutive offset edges are
 * intersected; robust for the simple blob shapes districts use.
 */
export function insetPolygon(poly: Polygon, margin: number): Point[] {
  const n = poly.length;
  if (n < 3 || margin <= 0) return [...poly];
  const c = centroid(poly);

  // Offset each edge inward (toward centroid) by `margin`.
  const lines: { px: number; py: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (nx * (c.x - mx) + ny * (c.y - my) < 0) {
      nx = -nx;
      ny = -ny;
    }
    lines.push({ px: a.x + nx * margin, py: a.y + ny * margin, dx, dy });
  }

  // Each vertex is the intersection of its two adjacent offset edges.
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n]!;
    const l2 = lines[i]!;
    const denom = l1.dx * l2.dy - l1.dy * l2.dx;
    if (Math.abs(denom) < 1e-6) {
      out.push({ x: l2.px, y: l2.py }); // near-parallel edges
      continue;
    }
    const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / denom;
    out.push({ x: l1.px + t * l1.dx, y: l1.py + t * l1.dy });
  }
  return out;
}

/** Where to place an area's label/marker: explicit anchor, else polygon centroid. */
export function areaAnchor(area: Area): Point {
  if (area.labelAnchor) return area.labelAnchor;
  if (area.polygon) return centroid(area.polygon);
  return { x: 0, y: 0 };
}

import type { Point } from "@/domain/schema";

/** Small framework-free polygon helpers shared by the cityscape generator and
 *  its street-network builders. Kept in their own module so neither file grows
 *  unwieldy and there's no import cycle between them. */

export type Polygon = Point[];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Ray-cast point-in-polygon (odd crossings = inside). */
export function pointInPolygon(p: Point, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const intersects =
      a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Shoelace area (absolute), in viewBox units². */
export function polygonArea(poly: Polygon): number {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += (poly[j]!.x + poly[i]!.x) * (poly[j]!.y - poly[i]!.y);
  }
  return Math.abs(sum) / 2;
}

export function centroid(poly: Polygon): Point {
  let x = 0,
    y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  return { x: x / poly.length, y: y / poly.length };
}

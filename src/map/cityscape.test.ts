import { describe, expect, it } from "vitest";
import type { Point } from "@/domain/schema";
import { buildCityscape, polygonArea, visibleBuildings } from "./cityscape";

// A plain square is enough to exercise every property; the algorithm doesn't
// care about shape beyond point-in-polygon.
const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 300, y: 0 },
  { x: 300, y: 300 },
  { x: 0, y: 300 },
];

function inside(p: { cx: number; cy: number }, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.cy !== b.y > p.cy && p.cx < ((b.x - a.x) * (p.cy - a.y)) / (b.y - a.y) + a.x) {
      hit = !hit;
    }
  }
  return hit;
}

describe("buildCityscape", () => {
  it("is deterministic for a given seed", () => {
    const a = buildCityscape(SQUARE, { seed: "area-42" });
    const b = buildCityscape(SQUARE, { seed: "area-42" });
    expect(b).toEqual(a);
  });

  it("produces different layouts for different seeds", () => {
    const a = buildCityscape(SQUARE, { seed: "area-1" });
    const b = buildCityscape(SQUARE, { seed: "area-2" });
    expect(b.buildings).not.toEqual(a.buildings);
  });

  it("keeps every building centre inside the polygon", () => {
    const city = buildCityscape(SQUARE, { seed: "inside" });
    expect(city.buildings.length).toBeGreaterThan(0);
    expect(city.buildings.every((bld) => inside(bld, SQUARE))).toBe(true);
  });

  it("returns empty geometry for a degenerate polygon", () => {
    expect(
      buildCityscape(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        { seed: "x" },
      ),
    ).toEqual({
      roads: [],
      buildings: [],
    });
  });

  it("respects the building cap by keeping the lowest-rank subset", () => {
    const city = buildCityscape(SQUARE, { seed: "cap", maxBuildings: 5 });
    expect(city.buildings.length).toBeLessThanOrEqual(5);
    // The cap keeps the lowest ranks, so results stay sorted and stable.
    const ranks = city.buildings.map((b) => b.rank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

describe("visibleBuildings", () => {
  // The core stability guarantee: raising density only *adds* buildings — it
  // never moves or removes one — so a small demographics change can't
  // restructure the map.
  it("yields nested subsets as density rises", () => {
    const city = buildCityscape(SQUARE, { seed: "nested" });
    const low = visibleBuildings(city, 0.3);
    const mid = visibleBuildings(city, 0.6);
    const high = visibleBuildings(city, 1);
    expect(low.length).toBeLessThanOrEqual(mid.length);
    expect(mid.length).toBeLessThanOrEqual(high.length);
    // Every lower-density building is present, unchanged, at higher density.
    for (const b of low) expect(mid).toContainEqual(b);
    for (const b of mid) expect(high).toContainEqual(b);
  });

  it("shows everything at full density and nothing at zero", () => {
    const city = buildCityscape(SQUARE, { seed: "bounds" });
    expect(visibleBuildings(city, 1)).toHaveLength(city.buildings.length);
    expect(visibleBuildings(city, 0)).toHaveLength(0);
  });
});

describe("polygonArea", () => {
  it("computes the shoelace area regardless of winding", () => {
    expect(polygonArea(SQUARE)).toBe(90000);
    expect(polygonArea([...SQUARE].reverse())).toBe(90000);
  });
});

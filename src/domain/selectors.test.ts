import { describe, it, expect } from "vitest";
import { loadWorld } from "./world";
import { makeWorld } from "./world.fixture";
import {
  Atlas,
  centroid,
  toSvgPoints,
  insetPolygon,
  areaAnchor,
} from "./selectors";
import type { AreaId, DistrictId, FactionId, LevelId } from "./ids";
import type { Area, Polygon } from "./schema";

const atlas = () => new Atlas(loadWorld(makeWorld()));

describe("Atlas.standings", () => {
  it("computes control share from relative influence, sorted descending", () => {
    const rows = atlas().standings("centro-s" as AreaId);
    expect(rows.map((r) => r.faction.id)).toEqual(["coroa", "guilda"]);
    expect(rows[0]!.share).toBeCloseTo(0.75);
    expect(rows[1]!.share).toBeCloseTo(0.25);
  });

  it("returns [] for an area with no presence", () => {
    expect(atlas().standings("porto-s" as AreaId)).toEqual([]);
  });

  it("dominant() is the highest-share faction", () => {
    expect(atlas().dominant("centro-s" as AreaId)?.faction.id).toBe("coroa");
    expect(atlas().dominant("porto-s" as AreaId)).toBeUndefined();
  });
});

describe("Atlas.districtStandings", () => {
  it("rolls influence up across every level-slice of the district", () => {
    // centro spans centro-s (coroa 6, guilda 2) + centro-l1 (guilda 4).
    const rows = atlas().districtStandings("centro" as DistrictId);
    const guilda = rows.find((r) => r.faction.id === ("guilda" as FactionId))!;
    const coroa = rows.find((r) => r.faction.id === ("coroa" as FactionId))!;
    expect(coroa.influence).toBe(6);
    expect(guilda.influence).toBe(6); // 2 + 4
    expect(guilda.power).toBe(7); // 4 + 3
    expect(coroa.share).toBeCloseTo(0.5);
    expect(guilda.share).toBeCloseTo(0.5);
  });
});

describe("Atlas demographics", () => {
  it("derives humans as the remainder and drops empty rows", () => {
    const demo = atlas().demographics("centro" as DistrictId)!;
    expect(demo.total).toBe(1000);
    const human = demo.rows.find((r) => r.race === "human")!;
    expect(human.count).toBe(850); // 1000 - 100 - 50
    expect(human.share).toBeCloseTo(0.85);
    // "other" has no headcount, so it never appears.
    expect(demo.rows.some((r) => r.race === "other")).toBe(false);
  });

  it("returns undefined for a district with no population", () => {
    const w = makeWorld();
    delete w.districts![1]!.population;
    const a = new Atlas(loadWorld(w));
    expect(a.demographics("porto" as DistrictId)).toBeUndefined();
  });

  it("cityPopulation sums recorded district populations", () => {
    expect(atlas().cityPopulation()).toBe(1200);
  });

  it("cityDemographics aggregates minorities across districts", () => {
    const demo = atlas().cityDemographics();
    expect(demo.total).toBe(1200);
    const human = demo.rows.find((r) => r.race === "human")!;
    expect(human.count).toBe(1050); // 1200 - 100 dwarf - 50 elf
  });
});

describe("Atlas lookups", () => {
  it("areasInDistrict returns slices ordered by level depth", () => {
    const areas = atlas().areasInDistrict("centro" as DistrictId);
    expect(areas.map((a) => a.id)).toEqual(["centro-s", "centro-l1"]);
  });

  it("levels() are sorted by depth", () => {
    expect(atlas().levels().map((l) => l.depth)).toEqual([0, 1]);
  });

  it("areasOnLevel filters by level", () => {
    const ids = atlas().areasOnLevel("surface" as LevelId).map((a) => a.id);
    expect(ids).toContain("centro-s");
    expect(ids).toContain("porto-s");
    expect(ids).not.toContain("centro-l1");
  });

  it("npcsInDistrict returns only that district's people", () => {
    const npcs = atlas().npcsInDistrict("centro" as DistrictId);
    expect(npcs.map((n) => n.id)).toEqual(["npc-1"]);
  });
});

/* -------------------------------------------------------------------- geometry */

describe("centroid", () => {
  it("finds the center of a unit square", () => {
    const c = centroid([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(1);
  });

  it("falls back to the vertex mean for a degenerate (zero-area) polygon", () => {
    const c = centroid([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 4 },
    ]);
    expect(c.x).toBeCloseTo(2);
    expect(c.y).toBeCloseTo(2);
  });
});

describe("toSvgPoints", () => {
  it("serializes vertices to an SVG points string", () => {
    expect(
      toSvgPoints([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    ).toBe("1,2 3,4");
  });
});

describe("insetPolygon", () => {
  const square: Polygon = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it("moves every edge inward by the margin", () => {
    const inset = insetPolygon(square, 1);
    expect(inset).toEqual([
      { x: 1, y: 1 },
      { x: 9, y: 1 },
      { x: 9, y: 9 },
      { x: 1, y: 9 },
    ]);
  });

  it("returns the polygon unchanged for margin <= 0", () => {
    expect(insetPolygon(square, 0)).toEqual(square);
  });

  it("returns a copy, not the same reference", () => {
    expect(insetPolygon(square, 0)).not.toBe(square);
  });
});

describe("areaAnchor", () => {
  it("prefers an explicit labelAnchor", () => {
    const area = { labelAnchor: { x: 7, y: 8 } } as Area;
    expect(areaAnchor(area)).toEqual({ x: 7, y: 8 });
  });

  it("falls back to the polygon centroid", () => {
    const area = {
      polygon: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 4 },
        { x: 0, y: 4 },
      ],
    } as Area;
    const a = areaAnchor(area);
    expect(a.x).toBeCloseTo(2);
    expect(a.y).toBeCloseTo(2);
  });

  it("defaults to the origin when neither is present", () => {
    expect(areaAnchor({} as Area)).toEqual({ x: 0, y: 0 });
  });
});

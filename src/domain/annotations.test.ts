import { describe, it, expect } from "vitest";
import {
  mergeAnnotations,
  normalizeAnnotations,
  EMPTY_ANNOTATIONS,
  type Annotations,
} from "./annotations";
import { loadWorld } from "./world";
import { makeWorld } from "./world.fixture";

const noAnnotations: Annotations = {};

describe("mergeAnnotations — polygons", () => {
  it("attaches a traced polygon to its area by id", () => {
    const merged = mergeAnnotations(makeWorld(), {
      polygons: {
        "centro-l1": [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      },
    });
    const area = merged.areas.find((a) => a.id === "centro-l1")!;
    expect(area.polygon).toHaveLength(3);
  });

  it("ignores a polygon with fewer than 3 vertices", () => {
    const merged = mergeAnnotations(makeWorld(), {
      polygons: {
        "centro-l1": [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    });
    const area = merged.areas.find((a) => a.id === "centro-l1")!;
    expect(area.polygon).toBeUndefined();
  });

  it("leaves areas untouched when there are no annotations", () => {
    const merged = mergeAnnotations(makeWorld(), noAnnotations);
    expect(merged.areas.map((a) => a.id)).toEqual(["centro-s", "centro-l1", "porto-s"]);
  });
});

describe("mergeAnnotations — overrides by id", () => {
  it("overrides a generated faction in place (no duplicate)", () => {
    const merged = mergeAnnotations(makeWorld(), {
      factions: [{ id: "coroa", name: "Coroa Renovada", color: "#123456", isPlayerOrg: false }],
    });
    const coroas = merged.factions.filter((f) => f.id === "coroa");
    expect(coroas).toHaveLength(1);
    expect(coroas[0]!.name).toBe("Coroa Renovada");
    expect(merged.factions).toHaveLength(3); // unchanged count
  });

  it("appends a brand-new faction", () => {
    const merged = mergeAnnotations(makeWorld(), {
      factions: [{ id: "novos", name: "Os Novos", color: "#abcdef", isPlayerOrg: false }],
    });
    expect(merged.factions).toHaveLength(4);
    expect(merged.factions.some((f) => f.id === "novos")).toBe(true);
  });

  it("overrides an npc by id", () => {
    const merged = mergeAnnotations(makeWorld(), {
      npcs: [{ id: "npc-1", name: "Regente Deposto" }],
    });
    const npc = merged.npcs!.find((n) => n.id === "npc-1")!;
    expect(npc.name).toBe("Regente Deposto");
    expect(merged.npcs).toHaveLength(2);
  });
});

describe("mergeAnnotations — presence by (area, faction)", () => {
  it("overrides an existing footing for the same area+faction pair", () => {
    const merged = mergeAnnotations(makeWorld(), {
      presence: [{ factionId: "coroa", areaId: "centro-s", influence: 20, power: 20 }],
    });
    const rows = merged.presence.filter((p) => p.areaId === "centro-s" && p.factionId === "coroa");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.influence).toBe(20);
  });

  it("adds a new footing for a new area+faction pair", () => {
    const before = makeWorld().presence.length;
    const merged = mergeAnnotations(makeWorld(), {
      presence: [{ factionId: "coroa", areaId: "porto-s", influence: 3, power: 3 }],
    });
    expect(merged.presence).toHaveLength(before + 1);
  });

  it("keeps the same faction in a different area distinct", () => {
    const merged = mergeAnnotations(makeWorld(), {
      presence: [{ factionId: "guilda", areaId: "porto-s", influence: 1, power: 1 }],
    });
    const guildaAreas = merged.presence
      .filter((p) => p.factionId === "guilda")
      .map((p) => p.areaId)
      .sort();
    expect(guildaAreas).toEqual(["centro-l1", "centro-s", "porto-s"]);
  });
});

describe("mergeAnnotations — landmarks", () => {
  it("appends landmarks", () => {
    const merged = mergeAnnotations(makeWorld(), {
      landmarks: [
        {
          id: "lm-1",
          levelId: "surface",
          name: "Forte",
          category: "military",
          position: { x: 1, y: 1 },
        },
      ],
    });
    expect(merged.landmarks).toHaveLength(1);
  });
});

describe("mergeAnnotations — validity", () => {
  it("produces a world that still passes loadWorld", () => {
    const merged = mergeAnnotations(makeWorld(), {
      presence: [{ factionId: "coroa", areaId: "porto-s", influence: 5, power: 5 }],
      factions: [{ id: "coroa", name: "Coroa", color: "#ff0000", isPlayerOrg: false }],
    });
    expect(() => loadWorld(merged)).not.toThrow();
  });
});

describe("normalizeAnnotations", () => {
  it("fills every missing collection", () => {
    expect(normalizeAnnotations({})).toEqual(EMPTY_ANNOTATIONS);
  });

  it("preserves provided collections", () => {
    const polygons = { a: [{ x: 0, y: 0 }] };
    const result = normalizeAnnotations({ polygons });
    expect(result.polygons).toBe(polygons);
    expect(result.landmarks).toEqual([]);
  });
});

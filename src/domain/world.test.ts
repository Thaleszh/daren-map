import { describe, it, expect } from "vitest";
import { loadWorld, WorldIntegrityError } from "./world";
import { makeWorld } from "./world.fixture";

/** Run loadWorld and return the integrity problems it throws, or [] if it passes. */
function problemsOf(mutate: (w: ReturnType<typeof makeWorld>) => void): string[] {
  const w = makeWorld();
  mutate(w);
  try {
    loadWorld(w);
    return [];
  } catch (err) {
    if (err instanceof WorldIntegrityError) return err.problems;
    throw err;
  }
}

describe("loadWorld", () => {
  it("accepts the valid fixture and returns the parsed world", () => {
    const world = loadWorld(makeWorld());
    expect(world.areas).toHaveLength(3);
    expect(world.factions).toHaveLength(3);
  });

  it("applies schema defaults for omitted optional collections", () => {
    const world = loadWorld(makeWorld());
    // note defaults to "" on presence; description defaults on areas.
    expect(world.presence[0]!.note).toBe("");
    expect(world.areas[0]!.description).toBe("");
  });

  describe("referential integrity", () => {
    it("flags an area pointing at a missing level", () => {
      const problems = problemsOf((w) => {
        w.areas[0]!.levelId = "nowhere";
      });
      expect(problems).toContainEqual(expect.stringContaining('missing level "nowhere"'));
    });

    it("flags an area pointing at a missing district", () => {
      const problems = problemsOf((w) => {
        w.areas[0]!.districtId = "ghost";
      });
      expect(problems).toContainEqual(expect.stringContaining('missing district "ghost"'));
    });

    it("flags an area with neither polygon nor labelAnchor", () => {
      const problems = problemsOf((w) => {
        delete w.areas[1]!.labelAnchor;
        delete w.areas[1]!.polygon;
      });
      expect(problems).toContainEqual(
        expect.stringContaining("neither a polygon nor a labelAnchor"),
      );
    });

    it("flags presence referencing a missing faction and a missing area", () => {
      const problems = problemsOf((w) => {
        w.presence.push({ factionId: "phantom", areaId: "void", influence: 1, power: 1 });
      });
      expect(problems).toContainEqual(expect.stringContaining('missing faction "phantom"'));
      expect(problems).toContainEqual(expect.stringContaining('missing area "void"'));
    });

    it("flags a duplicate (faction, area) presence pair", () => {
      const problems = problemsOf((w) => {
        w.presence.push({ factionId: "coroa", areaId: "centro-s", influence: 3, power: 3 });
      });
      expect(problems).toContainEqual(expect.stringContaining("duplicate presence"));
    });

    it("flags an elevator missing a position for a connected level", () => {
      const problems = problemsOf((w) => {
        delete w.elevators![0]!.positions.l1;
      });
      expect(problems).toContainEqual(expect.stringContaining('no position for level "l1"'));
    });

    it("flags a landmark referencing a missing faction", () => {
      const problems = problemsOf((w) => {
        w.landmarks!.push({
          id: "lm-1",
          levelId: "surface",
          name: "Torre",
          position: { x: 1, y: 1 },
          factionId: "missing",
        });
      });
      expect(problems).toContainEqual(expect.stringContaining('missing faction "missing"'));
    });

    it("flags an npc referencing a missing district", () => {
      const problems = problemsOf((w) => {
        w.npcs![0]!.districtId = "gone";
      });
      expect(problems).toContainEqual(expect.stringContaining('missing district "gone"'));
    });

    it("flags an initiative referencing a missing area, landmark and sibling", () => {
      const problems = problemsOf((w) => {
        w.initiatives!.push({
          id: "init-1",
          name: "Escavação",
          status: "active",
          areaIds: ["noarea"],
          landmarkIds: ["nolandmark"],
          relatedInitiativeIds: ["noinit"],
        });
      });
      expect(problems).toContainEqual(expect.stringContaining('missing area "noarea"'));
      expect(problems).toContainEqual(expect.stringContaining('missing landmark "nolandmark"'));
      expect(problems).toContainEqual(expect.stringContaining('missing initiative "noinit"'));
    });

    it("flags a chronicle event referencing missing factions/areas", () => {
      const problems = problemsOf((w) => {
        w.chronicle!.push({
          id: "ev-1",
          sortKey: 1,
          title: "Cerco",
          factionIds: ["nope"],
          areaIds: ["alsonope"],
        });
      });
      expect(problems).toContainEqual(expect.stringContaining('missing faction "nope"'));
      expect(problems).toContainEqual(expect.stringContaining('missing area "alsonope"'));
    });
  });

  describe("uniqueness", () => {
    it("flags a duplicate area id", () => {
      const problems = problemsOf((w) => {
        w.areas[1]!.id = w.areas[0]!.id;
      });
      expect(problems).toContainEqual(expect.stringContaining("duplicate area id"));
    });

    it("flags a duplicate faction id", () => {
      const problems = problemsOf((w) => {
        w.factions[1]!.id = w.factions[0]!.id;
      });
      expect(problems).toContainEqual(expect.stringContaining("duplicate faction id"));
    });
  });

  describe("district demographics", () => {
    it("flags more minorities than total population", () => {
      const problems = problemsOf((w) => {
        w.districts![0]!.population = 100;
        w.districts![0]!.races = [{ race: "dwarf", count: 150 }];
      });
      expect(problems).toContainEqual(expect.stringContaining("non-humans but only"));
    });

    it("allows a district without a recorded population", () => {
      const problems = problemsOf((w) => {
        delete w.districts![0]!.population;
        w.districts![0]!.races = [{ race: "dwarf", count: 999 }];
      });
      expect(problems).toEqual([]);
    });
  });

  describe("player org", () => {
    it("flags when no faction is the player org", () => {
      const problems = problemsOf((w) => {
        w.factions[2]!.isPlayerOrg = false;
      });
      expect(problems).toContainEqual(expect.stringContaining("no faction is flagged isPlayerOrg"));
    });

    it("flags when more than one faction is the player org", () => {
      const problems = problemsOf((w) => {
        w.factions[0]!.isPlayerOrg = true;
      });
      expect(problems).toContainEqual(
        expect.stringContaining("multiple factions flagged isPlayerOrg"),
      );
    });
  });

  it("collects several problems in a single throw", () => {
    const problems = problemsOf((w) => {
      w.areas[0]!.levelId = "nowhere";
      w.factions[2]!.isPlayerOrg = false;
    });
    expect(problems.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects a shape-invalid world at the Zod stage (influence out of range)", () => {
    const w = makeWorld();
    w.presence[0]!.influence = 99; // max is 20
    expect(() => loadWorld(w)).toThrow();
  });
});

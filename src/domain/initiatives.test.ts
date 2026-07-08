import { describe, it, expect } from "vitest";
import { loadWorld, WorldIntegrityError } from "./world";
import { Atlas } from "./selectors";
import { makeWorld } from "./world.fixture";
import type { WorldInput } from "./schema";
import type { AreaId, InitiativeId } from "./ids";

/** A fixture world with two initiatives + a landmark wired to it. */
function worldWithInitiatives(): WorldInput {
  const w = makeWorld();
  w.landmarks = [
    {
      id: "lm-1",
      levelId: "surface",
      districtId: "centro",
      name: "Teatro",
      category: "culture",
      position: { x: 20, y: 20 },
    },
  ];
  w.initiatives = [
    {
      id: "init-a",
      name: "Reforma do Porto",
      status: "active",
      progress: 40,
      areaIds: ["porto-s"],
      landmarkIds: ["lm-1"],
      relatedInitiativeIds: ["init-b"],
    },
    {
      id: "init-b",
      name: "Escavação",
      status: "planned",
      areaIds: ["centro-s", "porto-s"],
    },
  ];
  return w;
}

/** Run loadWorld and return the integrity problems it throws, or [] if it passes. */
function problemsOf(mutate: (w: WorldInput) => void): string[] {
  const w = worldWithInitiatives();
  mutate(w);
  try {
    loadWorld(w);
    return [];
  } catch (err) {
    if (err instanceof WorldIntegrityError) return err.problems;
    throw err;
  }
}

describe("initiative integrity", () => {
  it("accepts a valid initiative graph", () => {
    const world = loadWorld(worldWithInitiatives());
    expect(world.initiatives).toHaveLength(2);
  });

  it("flags an initiative referencing a missing area", () => {
    const problems = problemsOf((w) => {
      w.initiatives![0]!.areaIds = ["ghost-area"];
    });
    expect(problems).toContainEqual(expect.stringContaining('missing area "ghost-area"'));
  });

  it("flags an initiative referencing a missing landmark", () => {
    const problems = problemsOf((w) => {
      w.initiatives![0]!.landmarkIds = ["ghost-lm"];
    });
    expect(problems).toContainEqual(expect.stringContaining('missing landmark "ghost-lm"'));
  });

  it("flags an initiative referencing a missing sibling initiative", () => {
    const problems = problemsOf((w) => {
      w.initiatives![0]!.relatedInitiativeIds = ["init-nowhere"];
    });
    expect(problems).toContainEqual(
      expect.stringContaining('missing initiative "init-nowhere"'),
    );
  });

  it("flags an initiative that lists itself as related", () => {
    const problems = problemsOf((w) => {
      w.initiatives![0]!.relatedInitiativeIds = ["init-a"];
    });
    expect(problems).toContainEqual(expect.stringContaining("lists itself as related"));
  });

  it("flags duplicate initiative ids", () => {
    const problems = problemsOf((w) => {
      w.initiatives![1]!.id = "init-a";
    });
    expect(problems).toContainEqual(expect.stringContaining('duplicate initiative id "init-a"'));
  });
});

describe("Atlas initiative selectors", () => {
  const atlas = new Atlas(loadWorld(worldWithInitiatives()));

  it("guild() returns the single player-org faction", () => {
    expect(atlas.guild()?.id).toBe("semcores");
  });

  it("initiative(id) resolves a known initiative and misses gracefully", () => {
    expect(atlas.initiative("init-a" as InitiativeId)?.name).toBe("Reforma do Porto");
    expect(atlas.initiative("nope" as InitiativeId)).toBeUndefined();
  });

  it("initiativesAffectingArea returns every initiative listing that area", () => {
    const porto = atlas
      .initiativesAffectingArea("porto-s" as AreaId)
      .map((i) => i.id)
      .sort();
    expect(porto).toEqual(["init-a", "init-b"]);

    const centro = atlas.initiativesAffectingArea("centro-s" as AreaId).map((i) => i.id);
    expect(centro).toEqual(["init-b"]);
  });

  it("initiativesAffectingArea is empty for an unaffected area", () => {
    expect(atlas.initiativesAffectingArea("centro-l1" as AreaId)).toEqual([]);
  });
});

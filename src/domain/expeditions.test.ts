import { describe, it, expect } from "vitest";
import { loadWorld, WorldIntegrityError } from "./world";
import { Atlas } from "./selectors";
import { makeWorld } from "./world.fixture";
import type { WorldInput } from "./schema";
import type { ExpeditionId } from "./ids";

/** A fixture world with three expeditions: one ongoing, two finished. */
function worldWithExpeditions(): WorldInput {
  const w = makeWorld();
  w.expeditions = [
    {
      id: "exp-old",
      name: "Forte",
      contractor: "Guarda",
      contractorFactionId: "coroa",
      members: ["Âncora", "Nosk"],
      npcIds: ["npc-1"],
      result: "success",
      startDate: "2022-01-24",
      endDate: "2023-01-11",
      sessions: 17,
    },
    {
      id: "exp-new",
      name: "Irvantir",
      result: "failure",
      startDate: "2025-09-16",
      endDate: "2025-12-16",
    },
    {
      id: "exp-now",
      name: "Escolinha",
      result: "ongoing",
      startDate: "2020-01-01",
    },
  ];
  return w;
}

/** Run loadWorld and return the integrity problems it throws, or [] if it passes. */
function problemsOf(mutate: (w: WorldInput) => void): string[] {
  const w = worldWithExpeditions();
  mutate(w);
  try {
    loadWorld(w);
    return [];
  } catch (err) {
    if (err instanceof WorldIntegrityError) return err.problems;
    throw err;
  }
}

describe("expedition integrity", () => {
  it("accepts a valid expedition list, filling defaults", () => {
    const world = loadWorld(worldWithExpeditions());
    const now = world.expeditions.find((e) => e.id === "exp-now")!;
    expect(now.members).toEqual([]);
    expect(now.endDate).toBe("");
  });

  it("flags a missing contractor faction", () => {
    const problems = problemsOf((w) => {
      w.expeditions![0]!.contractorFactionId = "ghost";
    });
    expect(problems).toContainEqual(expect.stringContaining('missing faction "ghost"'));
  });

  it("flags a missing npc", () => {
    const problems = problemsOf((w) => {
      w.expeditions![0]!.npcIds = ["npc-ghost"];
    });
    expect(problems).toContainEqual(expect.stringContaining('missing npc "npc-ghost"'));
  });

  it("flags an arc that ends before it starts", () => {
    const problems = problemsOf((w) => {
      w.expeditions![1]!.endDate = "2025-01-01";
    });
    expect(problems).toContainEqual(expect.stringContaining("before it starts"));
  });

  it("flags duplicate expedition ids", () => {
    const problems = problemsOf((w) => {
      w.expeditions![1]!.id = "exp-old";
    });
    expect(problems).toContainEqual(expect.stringContaining('duplicate expedition id "exp-old"'));
  });

  it("rejects a malformed date at parse time", () => {
    const w = worldWithExpeditions();
    w.expeditions![0]!.startDate = "24/01/2022";
    expect(() => loadWorld(w)).toThrow();
  });
});

describe("Atlas expedition selectors", () => {
  const atlas = new Atlas(loadWorld(worldWithExpeditions()));

  it("lists ongoing arcs first, then newest start date", () => {
    expect(atlas.expeditions().map((e) => e.id)).toEqual(["exp-now", "exp-new", "exp-old"]);
  });

  it("expedition(id) resolves a known expedition and misses gracefully", () => {
    expect(atlas.expedition("exp-new" as ExpeditionId)?.name).toBe("Irvantir");
    expect(atlas.expedition("nope" as ExpeditionId)).toBeUndefined();
  });
});

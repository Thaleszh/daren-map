import { describe, it, expect } from "vitest";
import { loadWorld, WorldIntegrityError } from "./world";
import { Atlas } from "./selectors";
import {
  RELATION_APART_GROUP_ID,
  RELATION_GROUPING_ID,
  relationRows,
  relationSteps,
  relationTier,
  relationTimeline,
} from "./relations";
import { mergeAnnotations } from "./annotations";
import { makeWorld } from "./world.fixture";
import type { WorldInput } from "./schema";
import type { FactionId } from "./ids";

/**
 * A fixture world with a stance grouping (Coroa allied, Guilda unplaced), one
 * expedition, and a history with the Coroa recorded out of date order.
 */
function worldWithRelations(): WorldInput {
  const w = makeWorld();
  w.groupings = [
    {
      id: RELATION_GROUPING_ID,
      name: "Relação com os Sem Cores",
      groups: [
        { id: "g-aliadas", name: "Aliadas", color: "#00ff00", members: ["coroa"] },
        { id: "g-hostis", name: "Hostis", color: "#ff0000", members: [] },
      ],
    },
  ];
  w.expeditions = [{ id: "exp-forte", name: "Forte", contractorFactionId: "coroa" }];
  w.relations = [
    {
      factionId: "coroa",
      summary: "Patrões antigos.",
      events: [
        { date: "2024-05-01", title: "Briga", effect: -1 },
        { title: "Sem data", effect: 1 },
        { date: "2023-01-11", title: "Forte cai", effect: 3, expeditionId: "exp-forte" },
      ],
    },
  ];
  return w;
}

/** Run loadWorld and return the integrity problems it throws, or [] if it passes. */
function problemsOf(mutate: (w: WorldInput) => void): string[] {
  const w = worldWithRelations();
  mutate(w);
  try {
    loadWorld(w);
    return [];
  } catch (err) {
    if (err instanceof WorldIntegrityError) return err.problems;
    throw err;
  }
}

describe("relation integrity", () => {
  it("accepts a valid relation list, filling defaults", () => {
    const world = loadWorld(worldWithRelations());
    expect(world.relations[0]!.events[1]!.date).toBe("");
    expect(world.relations[0]!.events[1]!.description).toBe("");
  });

  it("flags a missing faction", () => {
    const problems = problemsOf((w) => {
      w.relations![0]!.factionId = "ghost";
    });
    expect(problems).toContainEqual(expect.stringContaining('missing faction "ghost"'));
  });

  it("flags a relation with the player org itself", () => {
    const problems = problemsOf((w) => {
      w.relations![0]!.factionId = "semcores";
    });
    expect(problems).toContainEqual(expect.stringContaining("player org"));
  });

  it("flags two records for the same faction", () => {
    const problems = problemsOf((w) => {
      w.relations!.push({ factionId: "coroa" });
    });
    expect(problems).toContainEqual(expect.stringContaining('"coroa"'));
  });

  it("flags a missing expedition", () => {
    const problems = problemsOf((w) => {
      w.relations![0]!.events![0]!.expeditionId = "exp-ghost";
    });
    expect(problems).toContainEqual(expect.stringContaining('missing expedition "exp-ghost"'));
  });

  it("rejects an effect outside −5..+5 at parse time", () => {
    const w = worldWithRelations();
    w.relations![0]!.events![0]!.effect = 9;
    expect(() => loadWorld(w)).toThrow();
  });
});

describe("Atlas relation selectors", () => {
  const atlas = new Atlas(loadWorld(worldWithRelations()));
  const coroa = "coroa" as FactionId;

  it("lists only factions in the relation grouping, skipping the guild and the unplaced", () => {
    const rows = relationRows(atlas);
    expect(rows.map((r) => r.faction.id)).toEqual(["coroa"]);
    expect(rows[0]!.balance).toBe(3);
    expect(rows[0]!.tier.label).toBe("Em boa imagem");
  });

  it("still lists an unplaced faction that has a history, warmest first", () => {
    const w = worldWithRelations();
    w.relations!.push({ factionId: "guilda", events: [{ title: "Encontro", effect: 5 }] });
    const rows = relationRows(new Atlas(loadWorld(w)));
    expect(rows.map((r) => r.faction.id)).toEqual(["guilda", "coroa"]);
  });

  it("lists the apart group (the inquisitors) last, however warm", () => {
    const w = worldWithRelations();
    w.groupings![0]!.groups.push({
      id: RELATION_APART_GROUP_ID,
      name: "Inquisidores",
      color: "#9aa3b8",
      members: ["guilda"],
    });
    w.relations!.push({ factionId: "guilda", events: [{ title: "Favor", effect: 5 }] });
    const rows = relationRows(new Atlas(loadWorld(w)));
    expect(rows.map((r) => r.faction.id)).toEqual(["coroa", "guilda"]);
    expect(rows[0]!.apart).toBeUndefined();
    expect(rows[1]!.apart?.name).toBe("Inquisidores");
  });

  it("orders the timeline by date, undated last, with a running balance", () => {
    const steps = relationTimeline(atlas, coroa);
    expect(steps.map((s) => s.event.title)).toEqual(["Forte cai", "Briga", "Sem data"]);
    expect(steps.map((s) => s.balance)).toEqual([3, 2, 3]);
    expect(steps.map((s) => s.tier.label)).toEqual(["Em boa imagem", "Neutro", "Em boa imagem"]);
  });

  it("saturates the balance at the ends of the scale", () => {
    const steps = relationSteps([
      { date: "", title: "a", description: "", effect: 5 },
      { date: "", title: "b", description: "", effect: 5 },
      { date: "", title: "c", description: "", effect: 5 },
      { date: "", title: "d", description: "", effect: -2 },
    ]);
    expect(steps.map((s) => s.balance)).toEqual([5, 10, 10, 8]);
  });

  it("finds the faction's contracts and people", () => {
    expect(atlas.expeditionsForFaction(coroa).map((e) => e.id)).toEqual(["exp-forte"]);
    expect(atlas.npcsInFaction(coroa).map((n) => n.id)).toEqual(["npc-1"]);
  });
});

describe("relation tiers", () => {
  it("splits each half of the scale in quarters", () => {
    const at = (n: number) => relationTier(n).label;
    expect([0, 2, 3, 4, 5, 7, 8, 10].map(at)).toEqual([
      "Neutro",
      "Neutro",
      "Em boa imagem",
      "Em boa imagem",
      "Simpatizante",
      "Simpatizante",
      "Aliado",
      "Aliado",
    ]);
    expect([-2, -3, -4, -5, -7, -8, -10].map(at)).toEqual([
      "Neutro",
      "Mal visto",
      "Mal visto",
      "Hostil",
      "Hostil",
      "Inimigo",
      "Inimigo",
    ]);
  });
});

describe("relation annotations", () => {
  it("replace the generated record for the same faction whole", () => {
    const merged = mergeAnnotations(worldWithRelations(), {
      relations: [{ factionId: "coroa", summary: "Rompidos.", events: [] }],
    });
    expect(merged.relations).toEqual([{ factionId: "coroa", summary: "Rompidos.", events: [] }]);
  });
});

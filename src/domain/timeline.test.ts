import { describe, expect, it } from "vitest";
import { loadWorld, WorldIntegrityError } from "./world";
import { Atlas } from "./selectors";
import { makeWorld } from "./world.fixture";
import type { WorldInput } from "./schema";

function worldWithTimeline(): WorldInput {
  const w = makeWorld();
  w.members = [{ id: "nosk", name: "Nosk" }];
  w.expeditions = [{ id: "exp-1", name: "Forte", startDate: "2021-01-01", endDate: "2021-01-02" }];
  w.timeline = [
    { id: "t-late", kind: "meeting", title: "Reunião", start: "0560-03-06" },
    {
      id: "t-early",
      kind: "mission",
      title: "Missão",
      start: "0560-02-04",
      end: "0560-02-08",
      memberIds: ["nosk"],
      expeditionId: "exp-1",
    },
  ];
  return w;
}

function problemsOf(mutate: (w: WorldInput) => void): string[] {
  const w = worldWithTimeline();
  mutate(w);
  try {
    loadWorld(w);
    return [];
  } catch (err) {
    if (err instanceof WorldIntegrityError) return err.problems;
    throw err;
  }
}

describe("timeline", () => {
  it("accepts a valid timeline and orders it oldest first", () => {
    const atlas = new Atlas(loadWorld(worldWithTimeline()));
    expect(atlas.timeline().map((e) => e.id)).toEqual(["t-early", "t-late"]);
    expect(atlas.timelineForExpedition("exp-1" as never).map((e) => e.id)).toEqual(["t-early"]);
  });

  it("flags a missing member and a missing expedition", () => {
    const problems = problemsOf((w) => {
      w.timeline![0]!.memberIds = ["ghost"];
      w.timeline![0]!.expeditionId = "exp-ghost";
    });
    expect(problems).toContainEqual(expect.stringContaining('missing member "ghost"'));
    expect(problems).toContainEqual(expect.stringContaining('missing expedition "exp-ghost"'));
  });

  it("flags an event that ends before it starts", () => {
    const problems = problemsOf((w) => {
      w.timeline![1]!.end = "0560-02-01";
    });
    expect(problems).toContainEqual(expect.stringContaining("before it starts"));
  });

  it("flags duplicate ids", () => {
    const problems = problemsOf((w) => {
      w.timeline![1]!.id = "t-late";
    });
    expect(problems).toContainEqual(expect.stringContaining("t-late"));
  });

  it("rejects a day that isn't on the calendar", () => {
    expect(() =>
      loadWorld({
        ...worldWithTimeline(),
        timeline: [{ id: "t", kind: "season", title: "x", start: "0560-02-29" }],
      }),
    ).toThrow();
  });
});

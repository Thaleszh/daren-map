import { describe, expect, it } from "vitest";
import type { TimelineEvent } from "./schema";
import { parseWorldDate, prevDay } from "./calendar";
import { seasonName, seasonSpans } from "./seasons";

const ev = (id: string, kind: TimelineEvent["kind"], title: string, start: string) =>
  ({
    id,
    kind,
    title,
    start,
    memberIds: [],
    companions: [],
    places: [],
    foes: [],
  }) as unknown as TimelineEvent;

describe("prevDay", () => {
  it("rolls back over month and year", () => {
    expect(prevDay(parseWorldDate("0560-02-01")!)).toEqual({ year: 560, month: 1, day: 28 });
    expect(prevDay(parseWorldDate("0560-00-01")!)).toEqual({ year: 559, month: 12, day: 29 });
  });
});

describe("seasonSpans", () => {
  const events = [
    ev("pre", "mission", "Antes", "0559-10-01"),
    ev("s1", "season", "Início do verão", "0559-11-11"),
    ev("m1", "mission", "Missão", "0560-01-02"),
    ev("s2", "season", "Início do outono", "0560-01-18"),
    ev("m2", "meeting", "Reunião", "0560-02-04"),
  ];

  it("runs each season until the day before the next starts", () => {
    const [verao, outono] = seasonSpans(events);
    expect(verao).toMatchObject({ name: "Verão", end: "0560-01-17", days: 92 });
    expect(verao!.events.map((e) => e.id)).toEqual(["m1"]);
    expect(outono).toMatchObject({ name: "Outono", end: undefined, days: undefined });
    expect(outono!.events.map((e) => e.id)).toEqual(["m2"]);
  });

  it("drops events before the first season and handles no seasons", () => {
    expect(
      seasonSpans(events)
        .flatMap((s) => s.events)
        .map((e) => e.id),
    ).not.toContain("pre");
    expect(seasonSpans([ev("a", "mission", "x", "0560-01-01")])).toEqual([]);
  });

  it("keeps unfamiliar titles", () => {
    expect(seasonName("Grande seca")).toBe("Grande seca");
  });
});

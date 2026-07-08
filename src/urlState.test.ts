import { describe, it, expect } from "vitest";
import { parseHash, serializeHash, type ViewState } from "./urlState";
import type { AreaId, LevelId } from "@/domain/ids";

describe("serializeHash", () => {
  it("serializes the default state to an empty hash", () => {
    expect(serializeHash({ mode: "view", levelId: null, selection: null })).toBe("");
  });

  it("omits the mode when it is the default 'view'", () => {
    expect(serializeHash({ mode: "view", levelId: "l1" as LevelId, selection: null })).toBe(
      "#level=l1",
    );
  });

  it("encodes mode, level and selection", () => {
    const hash = serializeHash({
      mode: "initiatives",
      levelId: "l1" as LevelId,
      selection: { type: "area", id: "centro-s" as AreaId },
    });
    expect(hash).toBe("#view=initiatives&level=l1&sel=area%3Acentro-s");
  });
});

describe("parseHash", () => {
  it("defaults an empty hash to the atlas view", () => {
    expect(parseHash("")).toEqual({ mode: "view", levelId: null, selection: null });
  });

  it("parses a full hash", () => {
    expect(parseHash("#view=initiatives&level=l1&sel=area:centro-s")).toEqual({
      mode: "initiatives",
      levelId: "l1",
      selection: { type: "area", id: "centro-s" },
    });
  });

  it("falls back to 'view' for an unknown mode", () => {
    expect(parseHash("#view=bogus").mode).toBe("view");
  });

  it("parses an initiative selection (initiatives view)", () => {
    expect(parseHash("#view=initiatives&sel=initiative:reforma-porto").selection).toEqual({
      type: "initiative",
      id: "reforma-porto",
    });
  });

  it("ignores a selection with an unknown type", () => {
    expect(parseHash("#sel=planet:mars").selection).toBeNull();
  });

  it("ignores a selection missing its id", () => {
    expect(parseHash("#sel=area").selection).toBeNull();
    expect(parseHash("#sel=area:").selection).toBeNull();
  });

  it("tolerates a leading '#/' router-style prefix", () => {
    expect(parseHash("#/level=l1").levelId).toBe("l1");
  });
});

describe("round-trip", () => {
  const states: ViewState[] = [
    { mode: "view", levelId: null, selection: null },
    { mode: "initiatives", levelId: null, selection: null },
    {
      mode: "view",
      levelId: "surface" as LevelId,
      selection: { type: "landmark", id: "lm-1" as never },
    },
    {
      mode: "view",
      levelId: "l1" as LevelId,
      selection: { type: "elevator", id: "elev-1" as never },
    },
    {
      mode: "initiatives",
      levelId: null,
      selection: { type: "initiative", id: "reforma-porto" as never },
    },
  ];

  it("parseHash(serializeHash(x)) === x", () => {
    for (const s of states) {
      expect(parseHash(serializeHash(s))).toEqual(s);
    }
  });
});

import { describe, expect, it } from "vitest";
import { getSavedCityscape } from "./cityscapeStore";

// Guards the JSON import + store shape. The shipped store is empty (maps are
// baked on demand via scripts/seed-cityscape.mjs), so every lookup misses and
// the area falls back to live generation.
describe("getSavedCityscape", () => {
  it("returns undefined for an area that has not been baked", () => {
    expect(getSavedCityscape("no-such-area")).toBeUndefined();
  });
});

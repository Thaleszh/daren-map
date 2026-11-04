import { describe, expect, it } from "vitest";
import { parseRegionData } from "./region";

describe("parseRegionData", () => {
  it("fills defaults", () => {
    const d = parseRegionData({ markers: [{ id: "a", name: "A", position: { x: 1, y: 2 } }] });
    expect(d.markers[0]).toMatchObject({ category: "other", description: "" });
  });
  it("falls back to empty on garbage", () => {
    expect(parseRegionData({ markers: [{ id: "" }] })).toEqual({ markers: [] });
    expect(parseRegionData(null)).toEqual({ markers: [] });
  });
});

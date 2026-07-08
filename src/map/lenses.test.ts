import { describe, expect, it } from "vitest";
import { Atlas } from "@/domain/selectors";
import { loadWorld } from "@/domain/world";
import { makeWorld } from "@/domain/world.fixture";
import type { AreaId, FactionId } from "@/domain/ids";
import { areaFill, gradientStops, lensContext, type LensState } from "./lenses";

function setup() {
  const atlas = new Atlas(loadWorld(makeWorld()));
  const ctx = lensContext(atlas);
  const centro = atlas.area("centro-s" as AreaId)!; // Coroa 6 / Guilda 2 → 75% / 25%
  const porto = atlas.area("porto-s" as AreaId)!; // no presence
  return { atlas, ctx, centro, porto };
}

const coroa = "coroa" as FactionId;

const withLens = (
  lens: LensState["lens"],
  focus: LensState["focusFactionId"] = null,
): LensState => ({
  lens,
  focusFactionId: focus,
});

describe("lensContext", () => {
  it("takes the maxima across districts and per-area power", () => {
    const { ctx } = setup();
    // centro population 1000 > porto 200; centro-s power 14 (10+4) is the max.
    expect(ctx.maxPopulation).toBe(1000);
    expect(ctx.maxPower).toBe(14);
  });
});

describe("areaFill", () => {
  it("dominant: solid tint of the leading faction with its share caption", () => {
    const { atlas, ctx, centro } = setup();
    const fill = areaFill(atlas, centro, withLens("dominant"), ctx);
    expect(fill.kind).toBe("solid");
    if (fill.kind !== "solid") throw new Error("expected solid");
    expect(fill.fill).toBe("#ff0000"); // Coroa
    expect(fill.caption).toBe("Coroa · 75%");
    expect(fill.opacity).toBeCloseTo(0.2 + 0.75 * 0.55);
  });

  it("dominant: neutral fill and empty caption where no faction is present", () => {
    const { atlas, ctx, porto } = setup();
    const fill = areaFill(atlas, porto, withLens("dominant"), ctx);
    expect(fill).toEqual({ kind: "solid", fill: "#8b93a7", opacity: 0.1, caption: "" });
  });

  it("faction: highlights the focused faction's share", () => {
    const { atlas, ctx, centro } = setup();
    const fill = areaFill(atlas, centro, withLens("faction", coroa), ctx);
    if (fill.kind !== "solid") throw new Error("expected solid");
    expect(fill.fill).toBe("#ff0000");
    expect(fill.caption).toBe("75%");
    expect(fill.opacity).toBeCloseTo(0.15 + 0.75 * 0.6);
  });

  it("faction: em-dash caption where the focused faction is absent", () => {
    const { atlas, ctx, porto } = setup();
    const fill = areaFill(atlas, porto, withLens("faction", coroa), ctx);
    if (fill.kind !== "solid") throw new Error("expected solid");
    expect(fill.caption).toBe("—");
    expect(fill.opacity).toBeCloseTo(0.04);
  });

  it("faction: neutral fill when no faction is focused", () => {
    const { atlas, ctx, centro } = setup();
    const fill = areaFill(atlas, centro, withLens("faction", null), ctx);
    expect(fill).toEqual({ kind: "solid", fill: "#8b93a7", opacity: 0.06, caption: "" });
  });

  it("contested: proportional segments, one per faction present", () => {
    const { atlas, ctx, centro } = setup();
    const fill = areaFill(atlas, centro, withLens("contested"), ctx);
    expect(fill.kind).toBe("segments");
    if (fill.kind !== "segments") throw new Error("expected segments");
    expect(fill.caption).toBe("2 facções");
    expect(fill.segments).toEqual([
      { color: "#ff0000", share: 0.75 },
      { color: "#00ff00", share: 0.25 },
    ]);
  });

  it("contested: neutral solid where there is no presence", () => {
    const { atlas, ctx, porto } = setup();
    const fill = areaFill(atlas, porto, withLens("contested"), ctx);
    expect(fill).toEqual({ kind: "solid", fill: "#8b93a7", opacity: 0.1, caption: "" });
  });

  it("density: opacity scales with district population, caption shows the count", () => {
    const { atlas, ctx, centro } = setup();
    const fill = areaFill(atlas, centro, withLens("density"), ctx);
    if (fill.kind !== "solid") throw new Error("expected solid");
    expect(fill.fill).toBe("#3fa6a0");
    expect(fill.opacity).toBeCloseTo(0.1 + (1000 / 1000) * 0.62);
    expect(fill.caption).toBe("≈ 1k");
  });

  it("power: opacity scales with total power, caption shows it", () => {
    const { atlas, ctx, centro } = setup();
    const fill = areaFill(atlas, centro, withLens("power"), ctx);
    if (fill.kind !== "solid") throw new Error("expected solid");
    expect(fill.fill).toBe("#c9552f");
    expect(fill.opacity).toBeCloseTo(0.1 + (14 / 14) * 0.62);
    expect(fill.caption).toBe("pot 14");
  });

  it("power: faded, captionless where no faction has power", () => {
    const { atlas, ctx, porto } = setup();
    const fill = areaFill(atlas, porto, withLens("power"), ctx);
    if (fill.kind !== "solid") throw new Error("expected solid");
    expect(fill.opacity).toBeCloseTo(0.06);
    expect(fill.caption).toBe("");
  });
});

describe("gradientStops", () => {
  it("returns nothing for no segments", () => {
    expect(gradientStops([])).toEqual([]);
  });

  it("holds a single color flat across the whole span", () => {
    expect(gradientStops([{ color: "#abc123", share: 1 }])).toEqual([
      { offset: 0, color: "#abc123" },
      { offset: 1, color: "#abc123" },
    ]);
  });

  it("blends only in a narrow window at the contact between two colors", () => {
    const stops = gradientStops([
      { color: "#ff0000", share: 0.75 },
      { color: "#00ff00", share: 0.25 },
    ]);
    // First and last stops pin the two colors; the middle pair straddles 0.75.
    expect(stops[0]).toEqual({ offset: 0, color: "#ff0000" });
    expect(stops[stops.length - 1]).toEqual({ offset: 1, color: "#00ff00" });
    const hl = Math.min(0.04, 0.75 * 0.45, 0.25 * 0.45); // 0.04
    expect(stops[1]).toEqual({ offset: 0.75 - hl, color: "#ff0000" });
    expect(stops[2]).toEqual({ offset: 0.75 + hl, color: "#00ff00" });
  });
});

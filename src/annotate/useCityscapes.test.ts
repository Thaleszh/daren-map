// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Point } from "@/domain/schema";
import type { CityscapeStoreFile } from "@/map/cityscapeStore";
import { useCityscapes } from "./useCityscapes";

const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 200, y: 200 },
  { x: 0, y: 200 },
];
const empty = (): CityscapeStoreFile => ({ version: 1, areas: {} });

describe("useCityscapes", () => {
  it("generates an editable record for an area", () => {
    const { result } = renderHook(() => useCityscapes(empty()));
    act(() => result.current.generateArea("a", SQUARE, 1));
    const rec = result.current.getArea("a");
    expect(rec).toBeDefined();
    expect(rec!.buildings.length).toBeGreaterThan(0);
    expect(rec!.roads.length).toBeGreaterThan(0);
  });

  it("adds, moves and removes individual buildings", () => {
    const { result } = renderHook(() => useCityscapes(empty()));
    act(() => result.current.generateArea("a", SQUARE, 0.5));
    const before = result.current.getArea("a")!.buildings.length;

    act(() => result.current.addBuilding("a", { x: 50, y: 60 }));
    expect(result.current.getArea("a")!.buildings.length).toBe(before + 1);
    const added = result.current.getArea("a")!.buildings.length - 1;
    expect(result.current.getArea("a")!.buildings[added]).toMatchObject({ cx: 50, cy: 60 });

    act(() => result.current.moveBuilding("a", added, { x: 111, y: 122 }));
    expect(result.current.getArea("a")!.buildings[added]).toMatchObject({ cx: 111, cy: 122 });

    act(() => result.current.removeBuilding("a", added));
    expect(result.current.getArea("a")!.buildings.length).toBe(before);
  });

  it("clears an area's record so it falls back to live generation", () => {
    const { result } = renderHook(() => useCityscapes(empty()));
    act(() => result.current.generateArea("a", SQUARE, 1));
    act(() => result.current.clearArea("a"));
    expect(result.current.getArea("a")).toBeUndefined();
  });

  it("edits mark the working copy dirty", () => {
    const { result } = renderHook(() => useCityscapes(empty()));
    expect(result.current.saveState).toBe("idle");
    act(() => result.current.generateArea("a", SQUARE, 1));
    expect(result.current.saveState).toBe("idle");
  });
});

import { describe, it, expect } from "vitest";
import { snapPoint, weldPolygons, SNAP_RADIUS } from "./snap";
import type { Point } from "./schema";

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe("snapPoint", () => {
  it("locks onto a neighbour vertex within the radius", () => {
    const res = snapPoint({ x: 3, y: 2 }, [square]);
    expect(res.kind).toBe("vertex");
    expect(res.point).toEqual({ x: 0, y: 0 });
    expect(res.target).toEqual({ x: 0, y: 0 });
  });

  it("prefers a vertex over an edge when both are in range", () => {
    // Near the (100,0) corner: the corner vertex should win over the two edges.
    const res = snapPoint({ x: 96, y: 3 }, [square]);
    expect(res.kind).toBe("vertex");
    expect(res.point).toEqual({ x: 100, y: 0 });
  });

  it("projects onto an edge when no vertex is close enough", () => {
    // Mid top-edge, a few units above it: too far from any corner, on the edge.
    const res = snapPoint({ x: 50, y: 4 }, [square]);
    expect(res.kind).toBe("edge");
    expect(res.point).toEqual({ x: 50, y: 0 });
  });

  it("returns the (rounded) input unchanged when nothing is in range", () => {
    const res = snapPoint({ x: 50.4, y: 50.6 }, [square]);
    expect(res.kind).toBeNull();
    expect(res.target).toBeNull();
    expect(res.point).toEqual({ x: 50, y: 51 });
  });

  it("considers the closing last→first edge of a neighbour", () => {
    // Left edge runs (0,100)→(0,0); a point just left of it should snap onto it.
    const res = snapPoint({ x: 4, y: 50 }, [square]);
    expect(res.kind).toBe("edge");
    expect(res.point).toEqual({ x: 0, y: 50 });
  });

  it("respects a custom radius", () => {
    // 10 units diagonally outside the (0,0) corner: nearest geometry is that
    // vertex, at distance 10 — out of a radius-5 pull, inside the default 14.
    const far = { x: 0, y: -10 };
    expect(snapPoint(far, [square], 5).kind).toBeNull();
    expect(snapPoint(far, [square], SNAP_RADIUS).kind).toBe("vertex");
  });
});

describe("weldPolygons", () => {
  it("collapses near-coincident vertices of two shapes onto one coordinate", () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    // b shares the (10,0)/(10,10) frontier but was eyeballed a couple units off.
    const b: Point[] = [
      { x: 11, y: 1 },
      { x: 20, y: 0 },
      { x: 11, y: 9 },
    ];
    const [wa, wb] = weldPolygons([a, b], 4);
    // The shared corners now match exactly across the two polygons.
    expect(wa![1]).toEqual(wb![0]);
    expect(wa![2]).toEqual(wb![2]);
  });

  it("preserves each polygon's vertex count and order", () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
    ];
    const [wa] = weldPolygons([a], 3);
    expect(wa).toHaveLength(4);
  });

  it("leaves distant vertices untouched (only near-misses cluster)", () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ];
    const [wa] = weldPolygons([a], 4);
    expect(wa).toEqual(a);
  });

  it("is idempotent — welding an already-welded set changes nothing", () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const b: Point[] = [
      { x: 11, y: 1 },
      { x: 20, y: 0 },
      { x: 11, y: 9 },
    ];
    const once = weldPolygons([a, b], 4);
    const twice = weldPolygons(once, 4);
    expect(twice).toEqual(once);
  });

  it("returns integer-rounded coordinates", () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const b: Point[] = [{ x: 2, y: 1 }];
    const [wa] = weldPolygons([a, b], 5);
    for (const p of wa!) {
      expect(Number.isInteger(p.x)).toBe(true);
      expect(Number.isInteger(p.y)).toBe(true);
    }
  });
});

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { Point } from "@/domain/schema";
import { snapPoint } from "@/domain/snap";

function toUserPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

interface VertexEditingParams {
  drawing: boolean;
  editingPolygon: boolean;
  workingPolygon: Point[];
  neighbourPolys: Point[][];
  onMapClick: (p: Point) => void;
  onMoveVertex: (i: number, p: Point) => void;
}

/**
 * Pointer plumbing for the tracer, split off so the SVG render stays
 * declarative: screen→user coordinate conversion, frontier snapping, and the
 * vertex drag / rubber-band hover state.
 */
export function useVertexEditing(params: VertexEditingParams) {
  const { drawing, editingPolygon, workingPolygon, neighbourPolys, onMapClick, onMoveVertex } =
    params;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // A vertex drag ends with a synthetic `click`; this flag lets us swallow it so
  // it doesn't fall through to the map and append a stray vertex at the drop point.
  const draggedRef = useRef(false);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [snapTarget, setSnapTarget] = useState<Point | null>(null);

  /** Snap a raw user point to a neighbouring frontier (only while editing). */
  function snap(p: Point) {
    return editingPolygon ? snapPoint(p, neighbourPolys) : { point: p, target: null };
  }

  function handleClick(e: MouseEvent) {
    if (!drawing || !svgRef.current) return;
    // Swallow the click that trails a vertex drag so we don't add a phantom vertex.
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const raw = toUserPoint(svgRef.current, e.clientX, e.clientY);
    onMapClick(snap(raw).point);
  }

  function startDrag(e: PointerEvent, i: number) {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    draggedRef.current = false;
    setDragIndex(i);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!svgRef.current) return;
    const raw = toUserPoint(svgRef.current, e.clientX, e.clientY);
    if (dragIndex !== null) {
      draggedRef.current = true; // a real drag happened; the next click is its tail
      const s = snap(raw);
      onMoveVertex(dragIndex, s.point);
      setSnapTarget(s.target);
    } else if (editingPolygon && workingPolygon.length > 0) {
      const s = snap(raw);
      setCursor(s.point); // rubber-band previews where the next click will land
      setSnapTarget(s.target);
    }
  }

  function endDrag(e: PointerEvent) {
    if (dragIndex === null) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    setDragIndex(null);
    setSnapTarget(null);
  }

  function clearHover() {
    setCursor(null);
    setSnapTarget(null);
  }

  /** The vertex click landed (drag ended on it) — clear the swallow flag. */
  function clearDragTail() {
    draggedRef.current = false;
  }

  return {
    svgRef,
    dragIndex,
    cursor,
    snapTarget,
    handleClick,
    startDrag,
    handlePointerMove,
    endDrag,
    clearHover,
    clearDragTail,
  };
}

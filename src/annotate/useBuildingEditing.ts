import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { Point } from "@/domain/schema";
import { toUserPoint } from "./svgCoords";

interface BuildingEditingParams {
  /** True only in the cityscape tool with an area picked that has a record. */
  active: boolean;
  onAddBuilding: (p: Point) => void;
  onMoveBuilding: (i: number, p: Point) => void;
}

/**
 * Pointer plumbing for the cityscape editor — the building analogue of
 * {@link useVertexEditing}: drag a building to nudge it, click empty map to add
 * one. (Deletion is an Alt+click on the building rect itself.) Owns its own svg
 * ref; AnnotateView points both this and the tracer at the same `<svg>`.
 */
export function useBuildingEditing({
  active,
  onAddBuilding,
  onMoveBuilding,
}: BuildingEditingParams) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // A building drag trails a synthetic click; swallow it so the drop point
  // doesn't also spawn a new building.
  const draggedRef = useRef(false);

  function handleClick(e: MouseEvent) {
    if (!active || !svgRef.current) return;
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onAddBuilding(toUserPoint(svgRef.current, e.clientX, e.clientY));
  }

  function startDrag(e: PointerEvent, i: number) {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    draggedRef.current = false;
    setDragIndex(i);
  }

  function handlePointerMove(e: PointerEvent) {
    if (dragIndex === null || !svgRef.current) return;
    draggedRef.current = true; // a real drag happened; its trailing click is swallowed
    onMoveBuilding(dragIndex, toUserPoint(svgRef.current, e.clientX, e.clientY));
  }

  function endDrag(e: PointerEvent) {
    if (dragIndex === null) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    setDragIndex(null);
  }

  return { svgRef, dragIndex, handleClick, startDrag, handlePointerMove, endDrag };
}

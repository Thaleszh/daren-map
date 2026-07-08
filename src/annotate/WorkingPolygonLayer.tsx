import type { Point } from "@/domain/schema";
import { toSvgPoints } from "@/domain/selectors";

function midpoint(a: Point, b: Point): Point {
  return { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
}

interface WorkingPolygonLayerProps {
  workingPolygon: Point[];
  editingPolygon: boolean;
  dragIndex: number | null;
  cursor: Point | null;
  onInsertVertex: (i: number, p: Point) => void;
  onDeleteVertex: (i: number) => void;
  onStartDrag: (e: React.PointerEvent, i: number) => void;
  onVertexClick: () => void;
}

/** The in-progress / editable polygon: outline, rubber-band, insert + drag handles. */
export function WorkingPolygonLayer(props: WorkingPolygonLayerProps) {
  const { workingPolygon, editingPolygon, dragIndex, cursor } = props;
  if (workingPolygon.length === 0) return null;

  return (
    <>
      <polyline
        points={toSvgPoints(
          workingPolygon.length >= 2 ? workingPolygon : [...workingPolygon, workingPolygon[0]!],
        )}
        fill="#e4c65b"
        fillOpacity={0.15}
        stroke="#e4c65b"
        strokeWidth={2}
        strokeDasharray="6 4"
      />

      {/* rubber-band from the last vertex to the cursor while tracing */}
      {editingPolygon && dragIndex === null && cursor && (
        <line
          x1={workingPolygon[workingPolygon.length - 1]!.x}
          y1={workingPolygon[workingPolygon.length - 1]!.y}
          x2={cursor.x}
          y2={cursor.y}
          stroke="#e4c65b"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          pointerEvents="none"
        />
      )}

      {/* edge-midpoint handles: click to insert a vertex there */}
      {editingPolygon &&
        workingPolygon.map((p, i) => {
          // closing edge (last→first) only once the shape has area
          const isClosing = i === workingPolygon.length - 1;
          if (isClosing && workingPolygon.length < 3) return null;
          const next = workingPolygon[(i + 1) % workingPolygon.length]!;
          const m = midpoint(p, next);
          return (
            <circle
              key={`ins-${i}`}
              className="annot-vertex-add"
              cx={m.x}
              cy={m.y}
              r={3.5}
              onClick={(e) => {
                e.stopPropagation();
                props.onInsertVertex(i, m);
              }}
            />
          );
        })}

      {/* vertices: drag to move, alt-click to delete */}
      {editingPolygon &&
        workingPolygon.map((p, i) => (
          <circle
            key={i}
            className="annot-vertex"
            cx={p.x}
            cy={p.y}
            r={dragIndex === i ? 6 : 4.5}
            onPointerDown={(e) => props.onStartDrag(e, i)}
            onClick={(e) => {
              e.stopPropagation();
              if (e.altKey) props.onDeleteVertex(i);
              props.onVertexClick(); // drag ended on the vertex; clear the tail flag
            }}
          />
        ))}

      {/* while not yet area-selected, show plain markers (no editing) */}
      {!editingPolygon &&
        workingPolygon.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#e4c65b" stroke="#0c0f16" strokeWidth={1} />
        ))}
    </>
  );
}

import { memo } from "react";
import type { Elevator, Point } from "@/domain/schema";

interface ElevatorMarkerProps {
  elevator: Elevator;
  pos: Point;
  selected?: boolean | undefined;
  onSelect?: ((elevator: Elevator) => void) | undefined;
}

/** An elevator shaft: the up/down glyph itself, filled cyan and outlined with a
 *  dark contour so it reads over the map — no chip behind it. */
export const ElevatorMarker = memo(function ElevatorMarker({
  elevator,
  pos,
  selected,
  onSelect,
}: ElevatorMarkerProps) {
  const size = selected ? 18 : 15;

  return (
    <g
      className={"elevator" + (selected ? " elevator--selected" : "")}
      transform={`translate(${pos.x} ${pos.y})`}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation(); // don't also trigger the map's click handler
              onSelect(elevator);
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={`Elevador ${elevator.name}`}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(elevator);
              }
            }
          : undefined
      }
    >
      {/* transparent hit target — a bare glyph is too thin to click reliably */}
      <circle className="elevator__hit" r={size * 0.75} />
      <text
        className="elevator__glyph"
        textAnchor="middle"
        dy={size * 0.34}
        style={{ fontSize: size }}
      >
        ⇅
      </text>
      {selected && (
        <text className="elevator__label" textAnchor="middle" y={-size}>
          {elevator.name}
        </text>
      )}
    </g>
  );
});

import { memo } from "react";
import type { Landmark } from "@/domain/schema";
import { landmarkStyle } from "./landmarkStyle";

interface LandmarkMarkerProps {
  landmark: Landmark;
  selected?: boolean | undefined;
  onSelect?: ((landmark: Landmark) => void) | undefined;
}

/** A named point of interest: the category glyph itself, filled with the
 *  category color and outlined with a dark contour so it reads over the map —
 *  no disc behind it. */
export const LandmarkMarker = memo(function LandmarkMarker({
  landmark,
  selected,
  onSelect,
}: LandmarkMarkerProps) {
  const style = landmarkStyle(landmark.category);
  const { x, y } = landmark.position;
  const size = selected ? 20 : 17;

  return (
    <g
      className={"landmark" + (selected ? " landmark--selected" : "")}
      transform={`translate(${x} ${y})`}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation(); // don't also trigger the map's click handler
              onSelect(landmark);
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={landmark.name}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(landmark);
              }
            }
          : undefined
      }
    >
      {/* transparent hit target — a bare glyph is too thin to click reliably */}
      <circle className="landmark__hit" r={size * 0.75} />
      <text
        className="landmark__glyph"
        textAnchor="middle"
        dy={size * 0.34}
        style={{ fontSize: size, fill: style.color }}
      >
        {style.glyph}
      </text>
      {selected && (
        <text className="landmark__label" textAnchor="middle" y={-size}>
          {landmark.name}
        </text>
      )}
    </g>
  );
});

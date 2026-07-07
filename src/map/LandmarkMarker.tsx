import type { Landmark } from "@/domain/schema";
import { landmarkStyle } from "./landmarkStyle";

interface LandmarkMarkerProps {
  landmark: Landmark;
  selected?: boolean | undefined;
  onSelect?: ((landmark: Landmark) => void) | undefined;
}

/** A named point of interest: a category-colored diamond with a glyph. */
export function LandmarkMarker({ landmark, selected, onSelect }: LandmarkMarkerProps) {
  const style = landmarkStyle(landmark.category);
  const { x, y } = landmark.position;
  const r = selected ? 13 : 10;

  return (
    <g
      className={"landmark" + (selected ? " landmark--selected" : "")}
      transform={`translate(${x} ${y})`}
      onClick={onSelect ? () => onSelect(landmark) : undefined}
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
      <rect
        className="landmark__diamond"
        x={-r}
        y={-r}
        width={r * 2}
        height={r * 2}
        rx={2}
        transform="rotate(45)"
        fill={style.color}
      />
      <text className="landmark__glyph" textAnchor="middle" dy={4}>
        {style.glyph}
      </text>
      {selected && (
        <text className="landmark__label" textAnchor="middle" y={-r - 8}>
          {landmark.name}
        </text>
      )}
    </g>
  );
}

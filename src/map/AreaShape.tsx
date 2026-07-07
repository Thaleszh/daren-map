import { areaAnchor, insetPolygon, toSvgPoints } from "@/domain/selectors";
import type { Area } from "@/domain/schema";
import { gradientStops, type AreaFill } from "./lenses";

const INSET = 6; // viewBox units kept clear so base boundary lines show through

interface AreaShapeProps {
  area: Area;
  fill: AreaFill;
  selected: boolean;
  onSelect: (area: Area) => void;
}

/**
 * One interactive region, painted per the active lens. A traced polygon is
 * filled (inset, so the map's district borders stay visible). The contested lens
 * paints a smooth left-to-right gradient that *blends* the factions' colors in
 * proportion (not hard bands). Until a polygon is traced, the area shows as a
 * marker (with a gradient mini-bar for the contested lens).
 */
export function AreaShape({ area, fill, selected, onSelect }: AreaShapeProps) {
  const anchor = areaAnchor(area);
  const inset = area.polygon ? insetPolygon(area.polygon, INSET) : null;
  const gradId = `grad-${area.id.replace(/[^a-z0-9]/gi, "-")}`;
  const stops = fill.kind === "segments" ? gradientStops(fill.segments) : null;
  const markerColor = fill.kind === "solid" ? fill.fill : (fill.segments[0]?.color ?? "#8b93a7");

  return (
    <g
      className={"area" + (selected ? " area--selected" : "")}
      onClick={() => onSelect(area)}
      role="button"
      aria-label={area.name}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(area);
        }
      }}
    >
      {stops && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            {stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
      )}

      {inset ? (
        <>
          <polygon
            className="area__shape"
            points={toSvgPoints(inset)}
            fill={fill.kind === "solid" ? fill.fill : `url(#${gradId})`}
            fillOpacity={fill.kind === "solid" ? fill.opacity : 0.62}
          />
          {fill.kind === "segments" && (
            <polygon className="area__shape area__shape--outline" points={toSvgPoints(inset)} />
          )}
        </>
      ) : (
        <circle cx={anchor.x} cy={anchor.y} r={46} fill="transparent" />
      )}

      {!inset && fill.kind === "segments" ? (
        <rect
          x={anchor.x - 33}
          y={anchor.y - 4.5}
          width={66}
          height={9}
          rx={2}
          fill={`url(#${gradId})`}
          stroke="#0c0f16"
          strokeWidth={0.75}
        />
      ) : (
        <circle className="area__marker" cx={anchor.x} cy={anchor.y} r={selected ? 11 : 8} fill={markerColor} />
      )}

      <text className="area__label" x={anchor.x} y={anchor.y - 16} textAnchor="middle">
        {area.name}
      </text>
      {fill.caption && (
        <text className="area__dominant" x={anchor.x} y={anchor.y + 24} textAnchor="middle">
          {fill.caption}
        </text>
      )}
    </g>
  );
}

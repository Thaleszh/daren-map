import { memo } from "react";
import { toSvgPoints } from "@/domain/selectors";
import type { Area } from "@/domain/schema";
import type { DrawBuilding, Segment, TextureStyle } from "./cityscape";

interface CityTextureProps {
  area: Area;
  /** Final, render-ready geometry: streets + already-density-filtered buildings.
   *  MapView resolves live-generated vs. saved geometry before handing it here. */
  roads: ReadonlyArray<Segment>;
  buildings: ReadonlyArray<DrawBuilding>;
  style: Exclude<TextureStyle, "off">;
}

/**
 * The procedural city for one area, clipped to its polygon so buildings stop
 * exactly at the traced border. A pure renderer: it draws whatever geometry it
 * is given (live or saved), and both styles paint the *same* geometry — only
 * the treatment differs — so switching style never regenerates the city.
 *
 * "ink" reads like an old cartographer's plan (thin strokes under the tint);
 * "rooftops" fills the buildings as shaded blocks for a bolder city-map look.
 * The group is non-interactive so clicks fall through to the area shape below.
 */
export const CityTexture = memo(function CityTexture({
  area,
  roads,
  buildings,
  style,
}: CityTextureProps) {
  const clipId = `city-clip-${area.id.replace(/[^a-z0-9]/gi, "-")}`;
  if (!area.polygon) return null;

  return (
    <g className={`city city--${style}`} aria-hidden="true">
      <clipPath id={clipId}>
        <polygon points={toSvgPoints(area.polygon)} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {roads.map((r, i) => (
          <line key={i} className="city__road" x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
        {buildings.map((b, i) => (
          <rect
            key={i}
            className="city__building"
            x={b.cx - b.w / 2}
            y={b.cy - b.h / 2}
            width={b.w}
            height={b.h}
            transform={`rotate(${b.angle} ${b.cx} ${b.cy})`}
            // Rooftop shading rides a CSS var; ink ignores it (fill: none).
            style={{ ["--shade" as string]: b.shade.toFixed(3) }}
          />
        ))}
      </g>
    </g>
  );
});

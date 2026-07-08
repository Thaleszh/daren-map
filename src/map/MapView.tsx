import { useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { Atlas } from "@/domain/selectors";
import type { Area, Elevator, Landmark, Level } from "@/domain/schema";
import type { AreaId, ElevatorId, FactionId, LandmarkId } from "@/domain/ids";
import { AreaShape, AreaLabel } from "./AreaShape";
import { LandmarkMarker } from "./LandmarkMarker";
import { ElevatorMarker } from "./ElevatorMarker";
import { areaFill, lensContext, LENSES, type MapLens } from "./lenses";

interface MapViewProps {
  atlas: Atlas;
  level: Level;
  selectedAreaId: AreaId | null;
  selectedLandmarkId: LandmarkId | null;
  selectedElevatorId: ElevatorId | null;
  onSelectArea: (area: Area) => void;
  onSelectLandmark: (landmark: Landmark) => void;
  onSelectElevator: (elevator: Elevator) => void;
}

/** Resolve an asset path against the configured site base (for subpath hosts). */
function asset(path: string): string {
  return import.meta.env.BASE_URL + path;
}

/** Pan/zoom SVG stage for one level: background image + lens-colored areas. */
export function MapView({
  atlas,
  level,
  selectedAreaId,
  selectedLandmarkId,
  selectedElevatorId,
  onSelectArea,
  onSelectLandmark,
  onSelectElevator,
}: MapViewProps) {
  const { width, height } = level.viewBox;
  const areas = atlas.areasOnLevel(level.id);
  const elevators = atlas.world.elevators.filter((e) => e.levelIds.includes(level.id));
  const landmarks = atlas.world.landmarks.filter((l) => l.levelId === level.id);

  const [lens, setLens] = useState<MapLens>("dominant");
  const [focusFactionId, setFocusFactionId] = useState<FactionId | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const ctx = useMemo(() => lensContext(atlas), [atlas]);
  const lensState = { lens, focusFactionId };

  // Fill drives both the shape and its label caption — compute once, share both.
  const painted = areas.map((area) => ({ area, fill: areaFill(atlas, area, lensState, ctx) }));

  return (
    <div className="map">
      <TransformWrapper
        minScale={0.5}
        maxScale={6}
        limitToBounds={false}
        doubleClick={{ disabled: false, mode: "zoomIn" }}
        wheel={{ step: 0.12 }}
      >
        <TransformComponent wrapperClass="map__stage" contentClass="map__stage">
          <svg
            className="map__svg"
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <image
              className={"map__base" + (level.depth === 0 ? " map__base--surface" : "")}
              href={asset(level.image)}
              x={0}
              y={0}
              width={width}
              height={height}
            />
            {painted.map(({ area, fill }) => (
              <AreaShape
                key={area.id}
                area={area}
                fill={fill}
                selected={area.id === selectedAreaId}
                onSelect={onSelectArea}
              />
            ))}
            {showMarkers &&
              elevators.map((e) => {
                const pos = e.positions[level.id];
                if (!pos) return null;
                return (
                  <ElevatorMarker
                    key={e.id}
                    elevator={e}
                    pos={pos}
                    selected={e.id === selectedElevatorId}
                    onSelect={onSelectElevator}
                  />
                );
              })}
            {showMarkers &&
              landmarks.map((lm) => (
                <LandmarkMarker
                  key={lm.id}
                  landmark={lm}
                  selected={lm.id === selectedLandmarkId}
                  onSelect={onSelectLandmark}
                />
              ))}
            {/* Titles ride above the markers so a glyph never buries a name. */}
            <g className="map__labels">
              {painted.map(({ area, fill }) => (
                <AreaLabel key={area.id} area={area} caption={fill.caption} />
              ))}
            </g>
          </svg>
        </TransformComponent>
      </TransformWrapper>

      <div className="map__controls">
        <label className="map__control">
          <span>Colorir por</span>
          <select value={lens} onChange={(e) => setLens(e.target.value as MapLens)}>
            {LENSES.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        {lens === "faction" && (
          <label className="map__control">
            <span>Facção</span>
            <select
              value={focusFactionId ?? ""}
              onChange={(e) => setFocusFactionId((e.target.value || null) as FactionId | null)}
            >
              <option value="">— escolha —</option>
              {atlas.world.factions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="map__control map__control--check">
          <span>Marcadores</span>
          <input
            type="checkbox"
            checked={showMarkers}
            onChange={(e) => setShowMarkers(e.target.checked)}
          />
        </label>
      </div>

      <div className="map__hint">Role para dar zoom · arraste para mover · clique numa área</div>
    </div>
  );
}

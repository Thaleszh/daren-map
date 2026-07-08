import { useCallback, useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { Atlas } from "@/domain/selectors";
import type { Area, Elevator, Landmark, Level } from "@/domain/schema";
import type { AreaId, ElevatorId, LandmarkId } from "@/domain/ids";
import { AreaShape, AreaLabel } from "./AreaShape";
import { LandmarkMarker } from "./LandmarkMarker";
import { ElevatorMarker } from "./ElevatorMarker";
import { areaFill, lensContext } from "./lenses";
import { CityTexture } from "./CityTexture";
import { areaDensities, buildCityscape, visibleBuildings } from "./cityscape";
import { getSavedCityscape } from "./cityscapeStore";
import { usePersistentState } from "@/prefs";
import { MapSettings } from "./MapSettings";
import { DEFAULT_MAP_PREFS, isMapPrefs, type MapPrefs } from "./mapPrefs";

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
  const areas = useMemo(() => atlas.areasOnLevel(level.id), [atlas, level.id]);
  const elevators = useMemo(
    () => atlas.world.elevators.filter((e) => e.levelIds.includes(level.id)),
    [atlas, level.id],
  );
  const landmarks = useMemo(
    () => atlas.world.landmarks.filter((l) => l.levelId === level.id),
    [atlas, level.id],
  );

  // Display options persist as a client preference so the map opens the way the
  // GM left it. Marker visibility stays out of this — it's a live quick-toggle.
  const [prefs, setPrefs] = usePersistentState<MapPrefs>(
    "daren-map-prefs",
    DEFAULT_MAP_PREFS,
    isMapPrefs,
  );
  const patchPrefs = useCallback(
    (patch: Partial<MapPrefs>) => setPrefs((prev) => ({ ...prev, ...patch })),
    [setPrefs],
  );
  const { lens, focusFactionId, texture, network, showElevators, parchment } = prefs;
  const [showMarkers, setShowMarkers] = useState(true);
  const ctx = useMemo(() => lensContext(atlas), [atlas]);

  // Final city geometry per area, ready to draw. Depends only on the level's
  // areas + world data — never on lens/selection — so a redraw never rebuilds a
  // city. A "blessed" area uses its saved (frozen) geometry verbatim; otherwise
  // it's generated live and filtered by a level-local density derived from how
  // crowded its district is.
  const cityscapes = useMemo(() => {
    const popByDistrict = new Map(atlas.world.districts.map((d) => [d.id, d.population ?? 0]));
    const withPolygon = areas.filter((a) => a.polygon);
    const densities = areaDensities(
      withPolygon.map((a) => ({
        id: a.id,
        polygon: a.polygon!,
        population: a.districtId ? (popByDistrict.get(a.districtId) ?? 0) : 0,
      })),
    );
    return withPolygon.map((area) => {
      const saved = getSavedCityscape(area.id);
      if (saved) return { area, roads: saved.roads, buildings: saved.buildings };
      const city = buildCityscape(area.polygon!, { seed: area.id, network });
      return {
        area,
        roads: city.roads,
        buildings: visibleBuildings(city, densities.get(area.id) ?? 0.6),
      };
    });
  }, [areas, atlas, network]);

  // Fill drives both the shape and its label caption — compute once, share both.
  // Recomputed only when the lens actually changes, not on marker/selection
  // toggles, so a redraw never re-runs areaFill for the whole level needlessly.
  const painted = useMemo(() => {
    const lensState = { lens, focusFactionId };
    return areas.map((area) => ({ area, fill: areaFill(atlas, area, lensState, ctx) }));
  }, [atlas, areas, lens, focusFactionId, ctx]);

  return (
    <div className={"map" + (parchment ? " map--parchment" : "")}>
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
            role="group"
            aria-label={`Mapa de ${level.name} — áreas, marcos e elevadores (Tab para navegar)`}
          >
            <image
              className={"map__base" + (level.depth === 0 ? " map__base--surface" : "")}
              href={asset(level.image)}
              x={0}
              y={0}
              width={width}
              height={height}
            />
            {/* City texture rides under the lens tint: the base is the "paper",
                the tint the highlighter. Off by default. */}
            {texture !== "off" &&
              cityscapes.map(({ area, roads, buildings }) => (
                <CityTexture
                  key={area.id}
                  area={area}
                  roads={roads}
                  buildings={buildings}
                  style={texture}
                />
              ))}
            {painted.map(({ area, fill }) => (
              <AreaShape
                key={area.id}
                area={area}
                fill={fill}
                selected={area.id === selectedAreaId}
                onSelect={onSelectArea}
              />
            ))}
            {showElevators &&
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
        <label className="map__control map__control--check">
          <span>Marcadores</span>
          <input
            type="checkbox"
            checked={showMarkers}
            onChange={(e) => setShowMarkers(e.target.checked)}
          />
        </label>
        <MapSettings atlas={atlas} prefs={prefs} onChange={patchPrefs} />
      </div>

      <div className="map__hint">Role para dar zoom · arraste para mover · clique numa área</div>
    </div>
  );
}

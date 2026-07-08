import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { Atlas } from "@/domain/selectors";
import type { WorkingAnnotations } from "@/domain/annotations";
import type { Landmark, Level, Point } from "@/domain/schema";
import { areaAnchor, toSvgPoints } from "@/domain/selectors";
import { LandmarkMarker } from "@/map/LandmarkMarker";
import type { CityscapeRecord } from "@/map/cityscape";
import type { AnnotateTool } from "./AnnotateMode";
import { useVertexEditing } from "./useVertexEditing";
import { useBuildingEditing } from "./useBuildingEditing";
import { WorkingPolygonLayer } from "./WorkingPolygonLayer";

interface AnnotateViewProps {
  atlas: Atlas;
  level: Level;
  annotations: WorkingAnnotations;
  tool: AnnotateTool;
  moving: boolean;
  selectedAreaId: string | null;
  workingPolygon: Point[];
  pending: Point | null;
  selectedLandmarkId: string | null;
  onMapClick: (p: Point) => void;
  onSelectArea: (areaId: string) => void;
  onSelectLandmark: (lm: Landmark) => void;
  onMoveVertex: (i: number, p: Point) => void;
  onInsertVertex: (i: number, p: Point) => void;
  onDeleteVertex: (i: number) => void;
  cityscapeRecord: CityscapeRecord | undefined;
  onAddBuilding: (p: Point) => void;
  onMoveBuilding: (i: number, p: Point) => void;
  onRemoveBuilding: (i: number) => void;
}

function asset(path: string): string {
  return import.meta.env.BASE_URL + path;
}

export function AnnotateView(props: AnnotateViewProps) {
  const { atlas, level, annotations, tool, selectedAreaId, workingPolygon, pending } = props;
  const { width, height } = level.viewBox;
  const areas = atlas.areasOnLevel(level.id);
  const landmarks = annotations.landmarks?.filter((l) => l.levelId === level.id) ?? [];
  // Only tracing/placing draws (crosshair + map-click handling); presence/npc/faction
  // just browse the map.
  const drawing = tool === "polygon" || tool === "landmark" || props.moving;
  // Panning stays on while tracing a polygon so the map can be dragged around
  // mid-trace — clicks still add vertices, drags pan (react-zoom-pan-pinch tells
  // them apart), and vertex drags stop propagation so they never pan. Only the
  // single-click placements (landmark / reposition) block panning, so the click
  // lands exactly where intended.
  const panDisabled = tool === "landmark" || props.moving;
  const canPickArea = tool === "polygon" || tool === "presence" || tool === "cityscape";
  // Editing the traced shape (drag/insert/delete vertices) is live whenever an
  // area is picked in the polygon tool.
  const editingPolygon = tool === "polygon" && selectedAreaId !== null;

  // Frontier snapping: the other traced areas on this level. A new/dragged
  // vertex near one of their vertices or edges locks onto it, so districts that
  // share a border share the exact coordinate instead of overlapping/gapping.
  const neighbourPolys: Point[][] = [];
  if (tool === "polygon") {
    const polys = annotations.polygons ?? {};
    for (const a of areas) {
      if ((a.id as string) === selectedAreaId) continue;
      const p = polys[a.id as string];
      if (p && p.length >= 2) neighbourPolys.push(p);
    }
  }
  const edit = useVertexEditing({
    drawing,
    editingPolygon,
    workingPolygon,
    neighbourPolys,
    onMapClick: props.onMapClick,
    onMoveVertex: props.onMoveVertex,
  });

  // Cityscape editor: active once an area with a baked record is picked. Its
  // pointer handlers replace the tracer's while this tool is on; both point at
  // the same <svg> via the ref callback below.
  const cityscape = tool === "cityscape" ? props.cityscapeRecord : undefined;
  const cityscapeActive =
    tool === "cityscape" && selectedAreaId !== null && cityscape !== undefined;
  const building = useBuildingEditing({
    active: cityscapeActive,
    onAddBuilding: props.onAddBuilding,
    onMoveBuilding: props.onMoveBuilding,
  });

  const isCity = tool === "cityscape";
  const setSvgRef = (el: SVGSVGElement | null) => {
    edit.svgRef.current = el;
    building.svgRef.current = el;
  };

  return (
    <div className="map">
      <TransformWrapper
        minScale={0.5}
        maxScale={8}
        limitToBounds={false}
        panning={{ disabled: panDisabled }}
        wheel={{ step: 0.12 }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent wrapperClass="map__stage" contentClass="map__stage">
          <svg
            ref={setSvgRef}
            className={"map__svg" + (drawing || cityscapeActive ? " map__svg--drawing" : "")}
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            onClick={isCity ? building.handleClick : edit.handleClick}
            onPointerMove={isCity ? building.handlePointerMove : edit.handlePointerMove}
            onPointerUp={isCity ? building.endDrag : edit.endDrag}
            onPointerLeave={edit.clearHover}
          >
            <image
              className={"map__base" + (level.depth === 0 ? " map__base--surface" : "")}
              href={asset(level.image)}
              x={0}
              y={0}
              width={width}
              height={height}
            />

            {/* committed polygons for this level */}
            {areas.map((a) => {
              const poly = annotations.polygons?.[a.id as string];
              if (!poly || poly.length < 3) return null;
              const isSel = (a.id as string) === selectedAreaId;
              return (
                <polygon
                  key={a.id}
                  points={toSvgPoints(poly)}
                  fill={isSel ? "#e4c65b" : "#6d7fd6"}
                  fillOpacity={isSel ? 0.28 : 0.16}
                  stroke={isSel ? "#e4c65b" : "#9aa3b8"}
                  strokeWidth={2}
                />
              );
            })}

            {/* cityscape editor: draggable buildings + faint streets for the
                picked area (Alt+click a building to remove it) */}
            {isCity && cityscape && (
              <g className="cityedit">
                {cityscape.roads.map((r, i) => (
                  <line
                    key={`road-${i}`}
                    className="cityedit__road"
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                  />
                ))}
                {cityscape.buildings.map((b, i) => (
                  <rect
                    key={`bld-${i}`}
                    className="cityedit__building"
                    x={b.cx - b.w / 2}
                    y={b.cy - b.h / 2}
                    width={b.w}
                    height={b.h}
                    transform={`rotate(${b.angle} ${b.cx} ${b.cy})`}
                    onPointerDown={(e) => building.startDrag(e, i)}
                    onClick={(e) => {
                      // Never fall through to the map's add-on-click.
                      e.stopPropagation();
                      if (e.altKey) props.onRemoveBuilding(i);
                    }}
                  />
                ))}
              </g>
            )}

            {/* area anchors — click to pick which area to trace */}
            {areas.map((a) => {
              const anchor = areaAnchor(a);
              const isSel = (a.id as string) === selectedAreaId;
              return (
                <g
                  key={`anchor-${a.id}`}
                  className="annot-anchor"
                  onClick={(e) => {
                    if (canPickArea) {
                      e.stopPropagation();
                      props.onSelectArea(a.id as string);
                    }
                  }}
                >
                  <circle
                    cx={anchor.x}
                    cy={anchor.y}
                    r={isSel ? 9 : 6}
                    fill={isSel ? "#e4c65b" : "#20263a"}
                    stroke="#e6e9f0"
                    strokeWidth={1.5}
                  />
                  <text
                    className="annot-anchor__label"
                    x={anchor.x}
                    y={anchor.y - 14}
                    textAnchor="middle"
                  >
                    {a.name}
                  </text>
                </g>
              );
            })}

            {/* in-progress / editable polygon */}
            <WorkingPolygonLayer
              workingPolygon={workingPolygon}
              editingPolygon={editingPolygon}
              dragIndex={edit.dragIndex}
              cursor={edit.cursor}
              onInsertVertex={props.onInsertVertex}
              onDeleteVertex={props.onDeleteVertex}
              onStartDrag={edit.startDrag}
              onVertexClick={edit.clearDragTail}
            />

            {/* frontier snap indicator — the neighbour vertex/edge point being locked onto */}
            {editingPolygon && edit.snapTarget && (
              <circle
                cx={edit.snapTarget.x}
                cy={edit.snapTarget.y}
                r={7}
                fill="none"
                stroke="#38e0b0"
                strokeWidth={2}
                pointerEvents="none"
              />
            )}

            {/* landmarks */}
            {landmarks.map((lm) => (
              <LandmarkMarker
                key={lm.id}
                landmark={lm}
                selected={lm.id === props.selectedLandmarkId}
                // While repositioning, the marker must not steal the click — it
                // has to fall through to the map so onMapClick drops it there and
                // keeps it selected. Only wire selection in plain select mode.
                onSelect={tool === "select" && !props.moving ? props.onSelectLandmark : undefined}
              />
            ))}

            {/* pending landmark position */}
            {pending && (
              <circle
                cx={pending.x}
                cy={pending.y}
                r={8}
                fill="#e4c65b"
                stroke="#0c0f16"
                strokeWidth={2}
              />
            )}
          </svg>
        </TransformComponent>
      </TransformWrapper>
      <div className="map__hint">
        {props.moving && "Clique no novo local para reposicionar o marco"}
        {!props.moving &&
          tool === "polygon" &&
          (selectedAreaId
            ? "Clique adiciona vértice · arraste p/ mover · clique na aresta insere · Alt+clique remove · Enter fecha · ⌫ desfaz · Esc cancela"
            : "Selecione uma área (clique num ponto) para traçar")}
        {!props.moving && tool === "landmark" && "Clique no mapa para posicionar um marco"}
        {!props.moving &&
          tool === "presence" &&
          (selectedAreaId
            ? "Edite influência e poder no painel · clique em outra área para trocar"
            : "Clique numa área para editar as facções presentes")}
        {!props.moving &&
          (tool === "npc" || tool === "faction") &&
          "Edite no painel à direita · arraste/role para navegar no mapa"}
        {!props.moving &&
          tool === "cityscape" &&
          (cityscapeActive
            ? "Arraste uma casa p/ mover · clique no mapa adiciona · Alt+clique remove"
            : "Escolha uma área e clique Gerar no painel para começar")}
        {!props.moving &&
          tool === "select" &&
          "Arraste para mover · role para zoom · clique num marco para editar"}
      </div>
    </div>
  );
}

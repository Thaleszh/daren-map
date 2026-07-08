import { useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { Atlas } from "@/domain/selectors";
import type { WorkingAnnotations } from "@/domain/annotations";
import type { Landmark, Level, Point } from "@/domain/schema";
import { areaAnchor, toSvgPoints } from "@/domain/selectors";
import { snapPoint } from "@/domain/snap";
import { LandmarkMarker } from "@/map/LandmarkMarker";
import type { AnnotateTool } from "./AnnotateMode";

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
}

function midpoint(a: Point, b: Point): Point {
  return { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
}

function asset(path: string): string {
  return import.meta.env.BASE_URL + path;
}

function toUserPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

export function AnnotateView(props: AnnotateViewProps) {
  const { atlas, level, annotations, tool, selectedAreaId, workingPolygon, pending } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // A vertex drag ends with a synthetic `click`; this flag lets us swallow it so
  // it doesn't fall through to the map and append a stray vertex at the drop point.
  const draggedRef = useRef(false);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [snapTarget, setSnapTarget] = useState<Point | null>(null);
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
  const canPickArea = tool === "polygon" || tool === "presence";
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
  /** Snap a raw user point to a neighbouring frontier (only while editing). */
  function snap(p: Point) {
    return editingPolygon ? snapPoint(p, neighbourPolys) : { point: p, target: null };
  }

  function handleClick(e: React.MouseEvent) {
    if (!drawing || !svgRef.current) return;
    // Swallow the click that trails a vertex drag so we don't add a phantom vertex.
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const raw = toUserPoint(svgRef.current, e.clientX, e.clientY);
    props.onMapClick(snap(raw).point);
  }

  function startDrag(e: React.PointerEvent, i: number) {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    draggedRef.current = false;
    setDragIndex(i);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!svgRef.current) return;
    const raw = toUserPoint(svgRef.current, e.clientX, e.clientY);
    if (dragIndex !== null) {
      draggedRef.current = true; // a real drag happened; the next click is its tail
      const s = snap(raw);
      props.onMoveVertex(dragIndex, s.point);
      setSnapTarget(s.target);
    } else if (editingPolygon && workingPolygon.length > 0) {
      const s = snap(raw);
      setCursor(s.point); // rubber-band previews where the next click will land
      setSnapTarget(s.target);
    }
  }

  function endDrag(e: React.PointerEvent) {
    if (dragIndex === null) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    setDragIndex(null);
    setSnapTarget(null);
  }

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
            ref={svgRef}
            className={"map__svg" + (drawing ? " map__svg--drawing" : "")}
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            onClick={handleClick}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerLeave={() => {
              setCursor(null);
              setSnapTarget(null);
            }}
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
            {workingPolygon.length > 0 && (
              <>
                <polyline
                  points={toSvgPoints(
                    workingPolygon.length >= 2
                      ? workingPolygon
                      : [...workingPolygon, workingPolygon[0]!],
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
                      onPointerDown={(e) => startDrag(e, i)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.altKey) props.onDeleteVertex(i);
                        draggedRef.current = false; // drag ended on the vertex; clear the tail flag
                      }}
                    />
                  ))}

                {/* while not yet area-selected, show plain markers (no editing) */}
                {!editingPolygon &&
                  workingPolygon.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={4}
                      fill="#e4c65b"
                      stroke="#0c0f16"
                      strokeWidth={1}
                    />
                  ))}
              </>
            )}

            {/* frontier snap indicator — the neighbour vertex/edge point being locked onto */}
            {editingPolygon && snapTarget && (
              <circle
                cx={snapTarget.x}
                cy={snapTarget.y}
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
          tool === "select" &&
          "Arraste para mover · role para zoom · clique num marco para editar"}
      </div>
    </div>
  );
}

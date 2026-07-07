import { useRef } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { Atlas } from "@/domain/selectors";
import type { WorkingAnnotations } from "@/domain/annotations";
import type { Landmark, Level, Point } from "@/domain/schema";
import { areaAnchor, toSvgPoints } from "@/domain/selectors";
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
  const { width, height } = level.viewBox;
  const areas = atlas.areasOnLevel(level.id);
  const landmarks = annotations.landmarks?.filter((l) => l.levelId === level.id) ?? [];
  const drawing = tool !== "select" || props.moving;

  function handleClick(e: React.MouseEvent) {
    if (!drawing || !svgRef.current) return;
    props.onMapClick(toUserPoint(svgRef.current, e.clientX, e.clientY));
  }

  return (
    <div className="map">
      <TransformWrapper
        minScale={0.5}
        maxScale={8}
        limitToBounds={false}
        panning={{ disabled: drawing }}
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
          >
            <image href={asset(level.image)} x={0} y={0} width={width} height={height} />

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
                    if (tool === "polygon") {
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

            {/* in-progress polygon */}
            {workingPolygon.length > 0 && (
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
                {workingPolygon.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4} fill="#e4c65b" stroke="#0c0f16" strokeWidth={1} />
                ))}
              </>
            )}

            {/* landmarks */}
            {landmarks.map((lm) => (
              <LandmarkMarker
                key={lm.id}
                landmark={lm}
                selected={lm.id === props.selectedLandmarkId}
                onSelect={tool === "select" ? props.onSelectLandmark : undefined}
              />
            ))}

            {/* pending landmark position */}
            {pending && (
              <circle cx={pending.x} cy={pending.y} r={8} fill="#e4c65b" stroke="#0c0f16" strokeWidth={2} />
            )}
          </svg>
        </TransformComponent>
      </TransformWrapper>
      <div className="map__hint">
        {props.moving && "Clique no novo local para reposicionar o marco"}
        {!props.moving && tool === "polygon" &&
          (selectedAreaId
            ? "Clique para adicionar vértices · Enter fecha · Backspace desfaz · Esc cancela"
            : "Selecione uma área (clique num ponto) para traçar")}
        {!props.moving && tool === "landmark" && "Clique no mapa para posicionar um marco"}
        {!props.moving &&
          tool === "select" &&
          "Arraste para mover · role para zoom · clique num marco para editar"}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { REGION_IMAGE, REGION_VIEWBOX, type RegionMarker } from "@/domain/region";
import type { LandmarkCategory } from "@/domain/schema";
import { toUserPoint } from "@/annotate/svgCoords";
import { LANDMARK_CATEGORIES, landmarkStyle } from "./landmarkStyle";
import type { RegionSaveState } from "./useRegionMarkers";

interface RegionViewProps {
  markers: RegionMarker[];
  onChange: (next: RegionMarker[]) => void;
  saveState: RegionSaveState;
}

// Markers are authored in the dev server only (the save endpoint doesn't exist
// in a static build), same as the annotate tool.
const CAN_EDIT = import.meta.env.DEV;
const CLICK_SLOP = 5; // px: a pointer that moved further than this was a pan, not a click

const SAVE_LABEL: Record<RegionSaveState, string> = {
  idle: "",
  saving: "Salvando…",
  saved: "Salvo",
  error: "Erro ao salvar",
};

/**
 * The regional map: the PSD render with pan/zoom and placeable markers.
 * Renders the map + panel cells of App's body grid (the level switcher is the
 * first cell, supplied by App), so it returns a fragment.
 */
export function RegionView({ markers, onChange, saveState }: RegionViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const selected = markers.find((m) => m.id === selectedId);

  function patch(id: string, p: Partial<RegionMarker>) {
    onChange(markers.map((m) => (m.id === id ? { ...m, ...p } : m)));
  }

  function place(e: React.PointerEvent<SVGSVGElement>) {
    const start = downAt.current;
    downAt.current = null;
    if (!adding || !start || !svgRef.current) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP) return;
    const position = toUserPoint(svgRef.current, e.clientX, e.clientY);
    const id = `r${Date.now().toString(36)}`;
    onChange([
      ...markers,
      { id, name: "Novo marcador", category: "other", position, description: "" },
    ]);
    setSelectedId(id);
    setAdding(false);
  }

  function startDrag(e: React.PointerEvent<SVGGElement>, m: RegionMarker) {
    if (!CAN_EDIT || adding) return;
    const svg = svgRef.current;
    if (!svg) return;
    e.stopPropagation(); // keep the stage from also starting a pan
    setSelectedId(m.id);
    setDragging(true);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    let latest = m.position;
    const move = (ev: PointerEvent) => {
      latest = toUserPoint(svg, ev.clientX, ev.clientY);
      target.setAttribute("transform", `translate(${latest.x} ${latest.y})`);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      setDragging(false);
      if (latest !== m.position) {
        onChange(markers.map((x) => (x.id === m.id ? { ...x, position: latest } : x)));
      }
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  }

  return (
    <>
      <div className={"map region" + (adding ? " region--adding" : "")}>
        <TransformWrapper
          minScale={0.4}
          maxScale={6}
          limitToBounds={false}
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.12 }}
          panning={{ disabled: dragging, excluded: ["region__marker"] }}
        >
          <TransformComponent wrapperClass="map__stage" contentClass="map__stage">
            <svg
              ref={svgRef}
              className="map__svg"
              viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
              xmlns="http://www.w3.org/2000/svg"
              role="group"
              aria-label="Mapa da região de Daren"
              onPointerDown={(e) => (downAt.current = { x: e.clientX, y: e.clientY })}
              onPointerUp={place}
            >
              <image
                href={import.meta.env.BASE_URL + REGION_IMAGE}
                x={0}
                y={0}
                width={REGION_VIEWBOX.width}
                height={REGION_VIEWBOX.height}
              />
              {markers.map((m) => {
                const style = landmarkStyle(m.category);
                const isSel = m.id === selectedId;
                const size = isSel ? 24 : 20;
                return (
                  <g
                    key={m.id}
                    className={"landmark region__marker" + (isSel ? " landmark--selected" : "")}
                    transform={`translate(${m.position.x} ${m.position.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={m.name}
                    onPointerDown={(e) => startDrag(e, m)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!adding) setSelectedId(m.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(m.id);
                      }
                    }}
                  >
                    <circle className="landmark__hit" r={size * 0.75} />
                    <text
                      className="landmark__glyph"
                      textAnchor="middle"
                      dy={size * 0.34}
                      style={{ fontSize: size, fill: style.color }}
                    >
                      {style.glyph}
                    </text>
                    {/* Region markers always name themselves, unlike city landmarks. */}
                    <text className="landmark__label" textAnchor="middle" y={-size}>
                      {m.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </TransformComponent>
        </TransformWrapper>

        {CAN_EDIT && (
          <div className="map__controls">
            <button
              type="button"
              className={"map__control" + (adding ? " region__add--on" : "")}
              onClick={() => setAdding((a) => !a)}
            >
              {adding ? "Clique no mapa…" : "+ Marcador"}
            </button>
          </div>
        )}
        <div className="map__hint">
          Role para dar zoom · arraste para mover
          {CAN_EDIT && " · arraste um marcador para reposicioná-lo"}
        </div>
      </div>

      <div className="app__panel">
        <div className="panel__eyebrow">Região</div>
        {selected ? (
          CAN_EDIT ? (
            <>
              <input
                className="region__field region__field--title"
                value={selected.name}
                aria-label="Nome"
                onChange={(e) => patch(selected.id, { name: e.target.value })}
              />
              <select
                className="region__field"
                value={selected.category}
                aria-label="Categoria"
                onChange={(e) =>
                  patch(selected.id, { category: e.target.value as LandmarkCategory })
                }
              >
                {LANDMARK_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.glyph} {c.label}
                  </option>
                ))}
              </select>
              <textarea
                className="region__field"
                rows={6}
                value={selected.description}
                placeholder="Descrição"
                aria-label="Descrição"
                onChange={(e) => patch(selected.id, { description: e.target.value })}
              />
              <button
                type="button"
                className="region__delete"
                onClick={() => {
                  onChange(markers.filter((m) => m.id !== selected.id));
                  setSelectedId(null);
                }}
              >
                Remover marcador
              </button>
              <div className="region__save" role="status">
                {SAVE_LABEL[saveState]}
              </div>
            </>
          ) : (
            <>
              <h2 className="panel__title">{selected.name}</h2>
              <div className="panel__eyebrow">{landmarkStyle(selected.category).label}</div>
              {selected.description && <p className="panel__desc">{selected.description}</p>}
            </>
          )
        ) : (
          <>
            <h2 className="panel__title">Região de Daren</h2>
            <p className="panel__desc">
              {markers.length === 0
                ? "Nenhum marcador ainda."
                : "Selecione um marcador no mapa para ver os detalhes."}
              {CAN_EDIT && " Use “+ Marcador” e clique no mapa para adicionar um."}
            </p>
          </>
        )}
      </div>
    </>
  );
}

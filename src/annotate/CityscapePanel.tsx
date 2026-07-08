import type { Atlas } from "@/domain/selectors";
import type { Level } from "@/domain/schema";
import type { useCityscapes } from "./useCityscapes";
import type { useAnnotations } from "./useAnnotations";

const SAVE_LABEL = {
  idle: "Salvar no arquivo",
  saving: "Salvando…",
  saved: "Salvo ✓",
  error: "Erro ao salvar",
} as const;

interface CityscapePanelProps {
  atlas: Atlas;
  level: Level;
  cs: ReturnType<typeof useCityscapes>;
  ann: ReturnType<typeof useAnnotations>;
  selectedAreaId: string | null;
  onSelectArea: (id: string) => void;
  onGenerate: (areaId: string) => void;
  onClearArea: (areaId: string) => void;
}

/**
 * The "Cidade" annotate tool: bake an area's procedural cityscape into an
 * editable record, then nudge/add/remove its buildings on the map. Saves to the
 * separate cityscapes.json (its own dev endpoint), so its Save/Restore live here
 * rather than in the shared annotations bar.
 */
export function CityscapePanel({
  atlas,
  level,
  cs,
  ann,
  selectedAreaId,
  onSelectArea,
  onGenerate,
  onClearArea,
}: CityscapePanelProps) {
  const areas = atlas.areasOnLevel(level.id);
  const polys = ann.annotations.polygons ?? {};
  const hasPolygon = (id: string) => (polys[id]?.length ?? 0) >= 3;

  const bakedHere = areas.filter((a) => cs.getArea(a.id as string)).length;
  const bakedTotal = Object.keys(cs.store.areas).length;
  const selected = selectedAreaId ? cs.getArea(selectedAreaId) : undefined;
  const selectedArea = selectedAreaId ? atlas.area(selectedAreaId as never) : undefined;

  return (
    <>
      <div className="annot-save">
        <button
          type="button"
          className="annot-save__btn"
          onClick={cs.saveToFile}
          disabled={cs.saveState === "saving"}
        >
          {SAVE_LABEL[cs.saveState]}
        </button>
        <button type="button" className="annot-save__reset" onClick={cs.resetFromFile}>
          Restaurar do arquivo
        </button>
      </div>
      {cs.saveState === "error" && (
        <p className="annot-note annot-note--warn">
          Falha ao salvar: {cs.saveError ?? "erro desconhecido"}. Salvamento direto só funciona em{" "}
          <code>npm run dev</code>.
        </p>
      )}

      <p className="annot-progress">
        Congeladas neste nível: <b>{bakedHere}</b>/{areas.length} · Total: <b>{bakedTotal}</b>
      </p>

      <div className="panel__section-title">Cidade — {level.name}</div>
      {selectedArea ? (
        <>
          <p className="annot-note">
            <b>{selectedArea.name}</b> ·{" "}
            {selected ? `${selected.buildings.length} casa(s)` : "não congelada"}
          </p>
          {!hasPolygon(selectedAreaId!) && (
            <p className="annot-note annot-note--warn">Trace o polígono desta área primeiro.</p>
          )}
          <div className="annot-actions">
            <button
              type="button"
              className="annot-save__btn"
              onClick={() => onGenerate(selectedAreaId!)}
              disabled={!hasPolygon(selectedAreaId!)}
            >
              {selected ? "Regerar" : "Gerar"}
            </button>
            {selected && (
              <button
                type="button"
                className="annot-save__reset"
                onClick={() => onClearArea(selectedAreaId!)}
              >
                Limpar (volta ao automático)
              </button>
            )}
          </div>
          {selected && (
            <p className="annot-note">
              Arraste uma casa p/ mover · clique no mapa adiciona · Alt+clique remove.
            </p>
          )}
        </>
      ) : (
        <p className="annot-note">Escolha uma área abaixo para congelar e editar sua cidade.</p>
      )}

      <div className="panel__section-title">Áreas neste nível</div>
      {areas.map((a) => {
        const id = a.id as string;
        const baked = Boolean(cs.getArea(id));
        const sel = id === selectedAreaId;
        return (
          <button
            key={id}
            type="button"
            className={"annot-arearow" + (sel ? " annot-arearow--active" : "")}
            onClick={() => onSelectArea(id)}
          >
            <span>{a.name}</span>
            <span className={"annot-badge" + (baked ? " annot-badge--done" : "")}>
              {baked ? "congelada" : hasPolygon(id) ? "—" : "sem polígono"}
            </span>
          </button>
        );
      })}
    </>
  );
}

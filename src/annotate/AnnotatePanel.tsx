import type { Atlas } from "@/domain/selectors";
import type { Landmark, Level, Point } from "@/domain/schema";
import type { useAnnotations } from "./useAnnotations";
import type { AnnotateTool, LandmarkForm } from "./AnnotateMode";
import { PresencePanel } from "./PresencePanel";
import { NpcPanel } from "./NpcPanel";
import { FactionPanel } from "./FactionPanel";
import { LandmarkSection } from "./LandmarkSection";

const TOOL_LABEL: Record<AnnotateTool, string> = {
  select: "Selecionar",
  polygon: "Traçar área",
  landmark: "Marco",
  npc: "NPCs",
  presence: "Influência",
  faction: "Facções",
};

interface AnnotatePanelProps {
  atlas: Atlas;
  level: Level;
  ann: ReturnType<typeof useAnnotations>;
  tool: AnnotateTool;
  onSelectTool: (t: AnnotateTool) => void;
  selectedAreaId: string | null;
  onSelectArea: (id: string) => void;
  workingPolygon: Point[];
  onCommitPolygon: () => void;
  onClearWorking: () => void;
  pending: Point | null;
  form: LandmarkForm;
  onFormChange: (f: LandmarkForm) => void;
  selectedLandmarkId: string | null;
  moving: boolean;
  onStartMove: () => void;
  onSubmitLandmark: () => void;
  onSelectLandmark: (lm: Landmark) => void;
  onCancelLandmark: () => void;
  onExit: () => void;
}

const SAVE_LABEL = {
  idle: "Salvar no arquivo",
  saving: "Salvando…",
  saved: "Salvo ✓",
  error: "Erro ao salvar",
} as const;

export function AnnotatePanel(props: AnnotatePanelProps) {
  const { atlas, level, ann, tool, form } = props;
  const areas = atlas.areasOnLevel(level.id);
  const landmarks = ann.annotations.landmarks?.filter((l) => l.levelId === level.id) ?? [];
  const showForm = props.pending !== null || props.selectedLandmarkId !== null;

  return (
    <div className="app__panel">
      <div className="annot-toolbar">
        {(["select", "polygon", "landmark", "npc", "presence", "faction"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={"annot-tool" + (tool === t ? " annot-tool--active" : "")}
            onClick={() => props.onSelectTool(t)}
          >
            {TOOL_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="annot-save">
        <button
          type="button"
          className="annot-save__btn"
          onClick={ann.saveToFile}
          disabled={ann.saveState === "saving"}
        >
          {SAVE_LABEL[ann.saveState]}
        </button>
        <button type="button" className="annot-save__reset" onClick={ann.resetFromFile}>
          Restaurar do arquivo
        </button>
      </div>
      {ann.saveState === "error" && (
        <p className="annot-note annot-note--warn">
          Falha ao salvar: {ann.saveError ?? "erro desconhecido"}. Salvamento direto só funciona em{" "}
          <code>npm run dev</code>.
        </p>
      )}

      {/* ------------------------------------------------- presence / npc / faction */}
      {tool === "presence" && (
        <PresencePanel atlas={atlas} ann={ann} selectedAreaId={props.selectedAreaId} />
      )}
      {tool === "npc" && <NpcPanel atlas={atlas} ann={ann} />}
      {tool === "faction" && <FactionPanel atlas={atlas} ann={ann} />}

      {/* ------------------------------------------------------- polygon tool */}
      {tool === "polygon" && (
        <>
          {(() => {
            const polys = ann.annotations.polygons ?? {};
            const here = areas.filter((a) => polys[a.id as string]).length;
            const all = atlas.world.areas.length;
            const allDone = Object.keys(polys).filter((id) => polys[id]!.length >= 3).length;
            return (
              <p className="annot-progress">
                Neste nível: <b>{here}</b>/{areas.length} · Total: <b>{allDone}</b>/{all}
              </p>
            );
          })()}

          <div className="panel__section-title">Traçar área — {level.name}</div>
          {props.selectedAreaId ? (
            <>
              <p className="annot-note">
                Traçando <b>{atlas.area(props.selectedAreaId as never)?.name}</b> ·{" "}
                {props.workingPolygon.length} vértice(s).
              </p>
              <div className="annot-actions">
                <button
                  type="button"
                  className="annot-save__btn"
                  onClick={props.onCommitPolygon}
                  disabled={props.workingPolygon.length < 3}
                >
                  Fechar polígono
                </button>
                <button type="button" className="annot-save__reset" onClick={props.onClearWorking}>
                  Limpar
                </button>
                {ann.annotations.polygons?.[props.selectedAreaId] && (
                  <button
                    type="button"
                    className="annot-save__reset"
                    onClick={() => ann.clearPolygon(props.selectedAreaId!)}
                  >
                    Remover
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="annot-note">Escolha uma área abaixo (ou clique seu ponto no mapa).</p>
          )}

          <div className="panel__section-title">Áreas neste nível</div>
          {areas.map((a) => {
            const traced = Boolean(ann.annotations.polygons?.[a.id as string]);
            const sel = (a.id as string) === props.selectedAreaId;
            return (
              <button
                key={a.id}
                type="button"
                className={"annot-arearow" + (sel ? " annot-arearow--active" : "")}
                onClick={() => props.onSelectArea(a.id as string)}
              >
                <span>{a.name}</span>
                <span className={"annot-badge" + (traced ? " annot-badge--done" : "")}>
                  {traced ? "traçada" : "—"}
                </span>
              </button>
            );
          })}
        </>
      )}

      {/* --------------------------------------------------- landmark tool */}
      {(tool === "landmark" || tool === "select") && (
        <LandmarkSection
          atlas={atlas}
          level={level}
          ann={ann}
          landmarks={landmarks}
          tool={tool}
          showForm={showForm}
          form={form}
          onFormChange={props.onFormChange}
          selectedLandmarkId={props.selectedLandmarkId}
          moving={props.moving}
          onSelectTool={props.onSelectTool}
          onStartMove={props.onStartMove}
          onSubmitLandmark={props.onSubmitLandmark}
          onSelectLandmark={props.onSelectLandmark}
          onCancelLandmark={props.onCancelLandmark}
        />
      )}

      <div className="annot-exit">
        <button type="button" className="annot-save__reset" onClick={props.onExit}>
          ← Voltar ao atlas
        </button>
      </div>
    </div>
  );
}

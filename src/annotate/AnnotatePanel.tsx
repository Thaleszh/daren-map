import type { Atlas } from "@/domain/selectors";
import type { Landmark, Level, LandmarkCategory, Point } from "@/domain/schema";
import { LANDMARK_CATEGORIES, landmarkStyle } from "@/map/landmarkStyle";
import type { useAnnotations } from "./useAnnotations";
import type { AnnotateTool, LandmarkForm } from "./AnnotateMode";
import { PresencePanel } from "./PresencePanel";
import { NpcPanel } from "./NpcPanel";
import { FactionPanel } from "./FactionPanel";

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
        <>
          <div className="panel__section-title">
            Marcos — {level.name} ({landmarks.length})
          </div>

          {/* In select mode you browse/click to edit; this is the way in to
              placing a brand-new marker (switches to the placement tool). */}
          {tool === "select" && !showForm && (
            <button
              type="button"
              className="annot-save__btn faction-new"
              onClick={() => props.onSelectTool("landmark")}
            >
              + Novo marco
            </button>
          )}

          {tool === "landmark" && !showForm && (
            <p className="annot-note">Clique no mapa para posicionar um novo marco.</p>
          )}

          {showForm && (
            <div className="annot-form">
              <label className="annot-field">
                <span>Nome</span>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => props.onFormChange({ ...form, name: e.target.value })}
                  placeholder="ex.: Teatro de Sanvil"
                />
              </label>
              <label className="annot-field">
                <span>Categoria</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    props.onFormChange({ ...form, category: e.target.value as LandmarkCategory })
                  }
                >
                  {LANDMARK_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.glyph} {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="annot-field">
                <span>Bairro (opcional)</span>
                <select
                  value={form.districtId}
                  onChange={(e) => props.onFormChange({ ...form, districtId: e.target.value })}
                >
                  <option value="">—</option>
                  {atlas.world.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="annot-field">
                <span>Facção (opcional)</span>
                <select
                  value={form.factionId}
                  onChange={(e) => props.onFormChange({ ...form, factionId: e.target.value })}
                >
                  <option value="">—</option>
                  {atlas.world.factions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="annot-field">
                <span>Descrição</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => props.onFormChange({ ...form, description: e.target.value })}
                />
              </label>
              <div className="annot-actions">
                <button
                  type="button"
                  className="annot-save__btn"
                  onClick={props.onSubmitLandmark}
                  disabled={!form.name.trim()}
                >
                  {props.selectedLandmarkId ? "Atualizar marco" : "Adicionar marco"}
                </button>
                <button
                  type="button"
                  className="annot-save__reset"
                  onClick={props.onCancelLandmark}
                >
                  Cancelar
                </button>
                {props.selectedLandmarkId && (
                  <button type="button" className="annot-save__reset" onClick={props.onStartMove}>
                    {props.moving ? "Clique no mapa…" : "Mover"}
                  </button>
                )}
                {props.selectedLandmarkId && (
                  <button
                    type="button"
                    className="annot-save__reset"
                    onClick={() => {
                      ann.removeLandmark(props.selectedLandmarkId!);
                      props.onCancelLandmark();
                    }}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          )}

          {landmarks.map((lm) => {
            const style = landmarkStyle(lm.category);
            return (
              <button
                key={lm.id}
                type="button"
                className={
                  "annot-arearow" +
                  (lm.id === props.selectedLandmarkId ? " annot-arearow--active" : "")
                }
                onClick={() => props.onSelectLandmark(lm)}
              >
                <span>
                  <span style={{ color: style.color, marginRight: 6 }}>{style.glyph}</span>
                  {lm.name}
                </span>
                <span className="annot-badge">{style.label}</span>
              </button>
            );
          })}
        </>
      )}

      <div className="annot-exit">
        <button type="button" className="annot-save__reset" onClick={props.onExit}>
          ← Voltar ao atlas
        </button>
      </div>
    </div>
  );
}

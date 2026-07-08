import type { Atlas } from "@/domain/selectors";
import type { Landmark, Level, LandmarkCategory } from "@/domain/schema";
import { LANDMARK_CATEGORIES, landmarkStyle } from "@/map/landmarkStyle";
import type { AnnotateTool, LandmarkForm } from "./AnnotateMode";
import type { useAnnotations } from "./useAnnotations";

interface LandmarkSectionProps {
  atlas: Atlas;
  level: Level;
  ann: ReturnType<typeof useAnnotations>;
  landmarks: Landmark[];
  tool: AnnotateTool;
  showForm: boolean;
  form: LandmarkForm;
  onFormChange: (f: LandmarkForm) => void;
  selectedLandmarkId: string | null;
  moving: boolean;
  onSelectTool: (t: AnnotateTool) => void;
  onStartMove: () => void;
  onSubmitLandmark: () => void;
  onSelectLandmark: (lm: Landmark) => void;
  onCancelLandmark: () => void;
}

export function LandmarkSection(props: LandmarkSectionProps) {
  const { atlas, level, ann, landmarks, tool, showForm, form } = props;

  return (
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
            <button type="button" className="annot-save__reset" onClick={props.onCancelLandmark}>
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
              "annot-arearow" + (lm.id === props.selectedLandmarkId ? " annot-arearow--active" : "")
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
  );
}

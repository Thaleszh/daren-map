import type { Atlas } from "@/domain/selectors";
import type { Faction } from "@/domain/schema";
import type { FactionId } from "@/domain/ids";
import generated from "@/data/world.generated.json";
import { mergedFactions } from "./PresencePanel";
import { NEW, useRosterEditor } from "./useRosterEditor";
import type { useAnnotations } from "./useAnnotations";

interface FactionPanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

interface FactionForm {
  name: string;
  shortName: string;
  color: string;
  description: string;
  infoUrl: string;
}

const emptyForm: FactionForm = {
  name: "",
  shortName: "",
  color: "#8b93a7",
  description: "",
  infoUrl: "",
};
const generatedIds = new Set((generated.factions as { id: string }[]).map((f) => f.id));

export function FactionPanel({ atlas, ann }: FactionPanelProps) {
  const { editingId, form, setForm, startEdit, startNew, cancel } = useRosterEditor(emptyForm);

  const factions = mergedFactions(atlas, ann.annotations.factions);
  const sessionIds = new Set(ann.annotations.factions.map((f) => f.id as string));

  /** Every faction referenced by presence / npcs / landmarks (blocks deletion). */
  function isReferenced(id: string): boolean {
    const inPresence = [...atlas.world.presence, ...ann.annotations.presence].some(
      (p) => p.factionId === id,
    );
    const inNpcs = [...(atlas.world.npcs ?? []), ...ann.annotations.npcs].some(
      (n) => n.factionId === id,
    );
    const inLandmarks = [...(atlas.world.landmarks ?? []), ...ann.annotations.landmarks].some(
      (l) => l.factionId === id,
    );
    return inPresence || inNpcs || inLandmarks;
  }

  function beginEdit(f: Faction) {
    startEdit(f.id as string, {
      name: f.name,
      shortName: f.shortName,
      color: f.color,
      description: f.description,
      infoUrl: f.infoUrl ?? "",
    });
  }

  function submit() {
    if (!form.name.trim()) return;
    // Omit infoUrl when blank — the schema only accepts a real URL.
    const url = form.infoUrl.trim();
    const link = url ? { infoUrl: url } : {};
    if (editingId === NEW) {
      ann.addFaction(
        {
          name: form.name.trim(),
          shortName: form.shortName.trim(),
          color: form.color,
          description: form.description.trim(),
          isPlayerOrg: false,
          ...link,
        },
        factions.map((f) => f.id as string),
      );
    } else if (editingId) {
      const source = factions.find((f) => (f.id as string) === editingId);
      ann.upsertFaction({
        id: editingId as FactionId,
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        color: form.color,
        description: form.description.trim(),
        // never toggled here — preserve the (single) player-org flag
        isPlayerOrg: source?.isPlayerOrg ?? false,
        ...link,
      });
    }
    cancel();
  }

  const renderForm = () => (
    <div className="annot-form">
      <label className="annot-field">
        <span>Nome</span>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ex.: Guilda dos Ferreiros"
        />
      </label>
      <label className="annot-field">
        <span>Sigla (opcional)</span>
        <input
          value={form.shortName}
          onChange={(e) => setForm({ ...form, shortName: e.target.value })}
          placeholder="ex.: GF"
        />
      </label>
      <label className="annot-field annot-field--row">
        <span>Cor</span>
        <input
          type="color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <code className="faction-hex">{form.color}</code>
      </label>
      <label className="annot-field">
        <span>Descrição</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <label className="annot-field">
        <span>Link — mais informações (opcional)</span>
        <input
          type="url"
          value={form.infoUrl}
          onChange={(e) => setForm({ ...form, infoUrl: e.target.value })}
          placeholder="https://…"
        />
      </label>
      <div className="annot-actions">
        <button
          type="button"
          className="annot-save__btn"
          onClick={submit}
          disabled={!form.name.trim()}
        >
          {editingId === NEW ? "Criar facção" : "Salvar"}
        </button>
        <button type="button" className="annot-save__reset" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="panel__section-title">Facções ({factions.length})</div>

      {editingId === NEW ? (
        renderForm()
      ) : (
        <button type="button" className="annot-save__btn faction-new" onClick={startNew}>
          + Nova facção
        </button>
      )}

      {factions.map((f) => {
        const id = f.id as string;
        const editing = editingId === id;
        const isSession = sessionIds.has(id);
        const isGenerated = generatedIds.has(id);
        return (
          <div key={id} className="faction-item">
            <button
              type="button"
              className={"annot-arearow" + (editing ? " annot-arearow--active" : "")}
              onClick={() => (editing ? cancel() : beginEdit(f))}
            >
              <span>
                <span className="standing__swatch" style={{ background: f.color }} />
                {f.name}
                {f.shortName && <span className="faction-tag">{f.shortName}</span>}
              </span>
              <span className="annot-badge">
                {f.isPlayerOrg ? "jogadores" : isSession ? (isGenerated ? "editada" : "nova") : "—"}
              </span>
            </button>
            {editing && (
              <>
                {renderForm()}
                {isSession && (
                  <div className="annot-actions">
                    {isGenerated ? (
                      <button
                        type="button"
                        className="annot-save__reset"
                        onClick={() => {
                          ann.removeFaction(id);
                          cancel();
                        }}
                      >
                        Reverter ao gerado
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="annot-save__reset"
                        disabled={isReferenced(id)}
                        title={
                          isReferenced(id)
                            ? "Facção em uso (presença/NPC/marco) — remova as referências antes"
                            : undefined
                        }
                        onClick={() => {
                          ann.removeFaction(id);
                          cancel();
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

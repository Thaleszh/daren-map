import type { Atlas } from "@/domain/selectors";
import type { Npc } from "@/domain/schema";
import type { DistrictId, FactionId, NpcId } from "@/domain/ids";
import generated from "@/data/world.generated.json";
import { mergedFactions } from "./PresencePanel";
import { NEW, useRosterEditor } from "./useRosterEditor";
import type { useAnnotations } from "./useAnnotations";

interface NpcPanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

interface NpcForm {
  name: string;
  role: string;
  districtId: string;
  factionId: string;
  description: string;
}

const emptyForm: NpcForm = { name: "", role: "", districtId: "", factionId: "", description: "" };
const generatedIds = new Set((generated.npcs as { id: string }[]).map((n) => n.id));

/** Generated/file npcs overlaid with session edits + additions, by id. */
function mergedNpcs(atlas: Atlas, session: Npc[]): Npc[] {
  const map = new Map<string, Npc>();
  for (const n of atlas.world.npcs) map.set(n.id as string, n);
  for (const n of session) map.set(n.id as string, n);
  return [...map.values()];
}

export function NpcPanel({ atlas, ann }: NpcPanelProps) {
  const { editingId, form, setForm, startEdit, startNew, cancel } = useRosterEditor(emptyForm);

  const npcs = mergedNpcs(atlas, ann.annotations.npcs);
  const sessionIds = new Set(ann.annotations.npcs.map((n) => n.id as string));
  const factions = mergedFactions(atlas, ann.annotations.factions);

  function beginEdit(n: Npc) {
    startEdit(n.id as string, {
      name: n.name,
      role: n.role,
      districtId: (n.districtId as string) ?? "",
      factionId: (n.factionId as string) ?? "",
      description: n.description,
    });
  }

  function build(id: string): Npc {
    const npc: Npc = {
      id: id as NpcId,
      name: form.name.trim(),
      role: form.role.trim(),
      description: form.description.trim(),
    };
    if (form.districtId) npc.districtId = form.districtId as DistrictId;
    if (form.factionId) npc.factionId = form.factionId as FactionId;
    return npc;
  }

  function submit() {
    if (!form.name.trim()) return;
    if (editingId === NEW) {
      const id = ann.addNpc({
        name: form.name.trim(),
        role: form.role.trim(),
        description: form.description.trim(),
        ...(form.districtId ? { districtId: form.districtId as DistrictId } : {}),
        ...(form.factionId ? { factionId: form.factionId as FactionId } : {}),
      });
      void id;
    } else if (editingId) {
      ann.upsertNpc(build(editingId));
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
          placeholder="ex.: Doril, o Ferreiro"
        />
      </label>
      <label className="annot-field">
        <span>Papel / título</span>
        <input
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          placeholder="ex.: Regente de Daren"
        />
      </label>
      <label className="annot-field">
        <span>Bairro (opcional)</span>
        <select
          value={form.districtId}
          onChange={(e) => setForm({ ...form, districtId: e.target.value })}
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
          onChange={(e) => setForm({ ...form, factionId: e.target.value })}
        >
          <option value="">—</option>
          {factions.map((f) => (
            <option key={f.id} value={f.id as string}>
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
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <div className="annot-actions">
        <button
          type="button"
          className="annot-save__btn"
          onClick={submit}
          disabled={!form.name.trim()}
        >
          {editingId === NEW ? "Adicionar NPC" : "Salvar"}
        </button>
        <button type="button" className="annot-save__reset" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="panel__section-title">NPCs ({npcs.length})</div>

      {editingId === NEW ? (
        renderForm()
      ) : (
        <button type="button" className="annot-save__btn faction-new" onClick={startNew}>
          + Novo NPC
        </button>
      )}

      {npcs.map((n) => {
        const id = n.id as string;
        const editing = editingId === id;
        const isSession = sessionIds.has(id);
        const isGenerated = generatedIds.has(id);
        const faction = n.factionId
          ? factions.find((f) => (f.id as string) === n.factionId)
          : undefined;
        return (
          <div key={id} className="faction-item">
            <button
              type="button"
              className={"annot-arearow" + (editing ? " annot-arearow--active" : "")}
              onClick={() => (editing ? cancel() : beginEdit(n))}
            >
              <span>
                <span
                  className="standing__swatch"
                  style={{ background: faction?.color ?? "#6b7488" }}
                />
                {n.name}
                {n.role && <span className="faction-tag">{n.role}</span>}
              </span>
              <span className="annot-badge">
                {isSession ? (isGenerated ? "editado" : "novo") : "—"}
              </span>
            </button>
            {editing && (
              <>
                {renderForm()}
                {isSession && (
                  <div className="annot-actions">
                    <button
                      type="button"
                      className="annot-save__reset"
                      onClick={() => {
                        ann.removeNpc(id);
                        cancel();
                      }}
                    >
                      {isGenerated ? "Reverter ao gerado" : "Excluir"}
                    </button>
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

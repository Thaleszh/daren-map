import type { Atlas } from "@/domain/selectors";
import { ExpeditionResultSchema, type Expedition, type ExpeditionResult } from "@/domain/schema";
import type { ExpeditionId, FactionId, NpcId } from "@/domain/ids";
import generated from "@/data/world.generated.json";
import { RESULT_META, formatSpan } from "@/expeditions/result";
import { mergedFactions } from "./PresencePanel";
import { NEW, useRosterEditor } from "./useRosterEditor";
import type { useAnnotations } from "./useAnnotations";
import { LinkList, mergeById, type LinkOption } from "./LinkList";

interface ExpeditionPanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

interface ExpeditionForm {
  name: string;
  contractor: string;
  contractorFactionId: string;
  destination: string;
  mission: string;
  /** Comma-separated while editing; split into `members` on save. */
  members: string;
  npcIds: string[];
  result: ExpeditionResult;
  outcome: string;
  summary: string;
  startDate: string;
  endDate: string;
  sessions: number;
}

const emptyForm: ExpeditionForm = {
  name: "",
  contractor: "",
  contractorFactionId: "",
  destination: "",
  mission: "",
  members: "",
  npcIds: [],
  result: "ongoing",
  outcome: "",
  summary: "",
  startDate: "",
  endDate: "",
  sessions: 0,
};
const generatedIds = new Set((generated.expeditions as { id: string }[]).map((e) => e.id));

export function ExpeditionPanel({ atlas, ann }: ExpeditionPanelProps) {
  const { editingId, form, setForm, startEdit, startNew, cancel } = useRosterEditor(emptyForm);

  const expeditions = mergeById(atlas.world.expeditions, ann.annotations.expeditions).sort(
    (a, b) => (b.startDate || "").localeCompare(a.startDate || "") || a.name.localeCompare(b.name),
  );
  const sessionIds = new Set(ann.annotations.expeditions.map((e) => e.id as string));
  /** A relation event links this expedition (deleting a new one would dangle). */
  const linkedIds = new Set(
    [...atlas.world.relations, ...ann.annotations.relations].flatMap((r) =>
      r.events.flatMap((e) => (e.expeditionId ? [e.expeditionId as string] : [])),
    ),
  );
  const factions = mergedFactions(atlas, ann.annotations.factions);
  const npcOptions: LinkOption[] = mergeById(atlas.world.npcs, ann.annotations.npcs).map((n) => ({
    id: n.id as string,
    label: n.role ? `${n.name} — ${n.role}` : n.name,
  }));

  function beginEdit(e: Expedition) {
    startEdit(e.id as string, {
      name: e.name,
      contractor: e.contractor,
      contractorFactionId: (e.contractorFactionId as string | undefined) ?? "",
      destination: e.destination,
      mission: e.mission,
      members: e.members.join(", "),
      npcIds: e.npcIds.map(String),
      result: e.result,
      outcome: e.outcome,
      summary: e.summary,
      startDate: e.startDate,
      endDate: e.endDate,
      sessions: e.sessions,
    });
  }

  function fields(): Omit<Expedition, "id"> {
    return {
      name: form.name.trim(),
      contractor: form.contractor.trim(),
      ...(form.contractorFactionId
        ? { contractorFactionId: form.contractorFactionId as FactionId }
        : {}),
      destination: form.destination.trim(),
      mission: form.mission.trim(),
      members: form.members
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      npcIds: form.npcIds as NpcId[],
      result: form.result,
      outcome: form.outcome.trim(),
      summary: form.summary.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      sessions: Math.max(0, Math.round(form.sessions || 0)),
    };
  }

  // Mirrors the loadWorld check, so a bad range can't be saved and break the load.
  const badRange = Boolean(form.startDate && form.endDate && form.endDate < form.startDate);

  function submit() {
    if (!form.name.trim() || badRange) return;
    if (editingId === NEW) {
      ann.addExpedition(
        fields(),
        expeditions.map((e) => e.id as string),
      );
    } else if (editingId) {
      ann.upsertExpedition({ id: editingId as ExpeditionId, ...fields() });
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
          placeholder="ex.: Exploração de Irvantir"
        />
      </label>
      <label className="annot-field">
        <span>Contratante</span>
        <input
          value={form.contractor}
          onChange={(e) => setForm({ ...form, contractor: e.target.value })}
          placeholder="ex.: Guarda (tenente Gilberto)"
        />
      </label>
      <label className="annot-field">
        <span>Facção contratante (opcional)</span>
        <select
          value={form.contractorFactionId}
          onChange={(e) => setForm({ ...form, contractorFactionId: e.target.value })}
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
        <span>Destino</span>
        <input
          value={form.destination}
          onChange={(e) => setForm({ ...form, destination: e.target.value })}
        />
      </label>
      <label className="annot-field">
        <span>Missão</span>
        <textarea
          rows={2}
          value={form.mission}
          onChange={(e) => setForm({ ...form, mission: e.target.value })}
        />
      </label>
      <label className="annot-field">
        <span>Membros (separados por vírgula)</span>
        <input
          value={form.members}
          onChange={(e) => setForm({ ...form, members: e.target.value })}
          placeholder="ex.: Thomas, Kaz, Cithria"
        />
      </label>
      <LinkList
        label="Pessoas envolvidas (NPCs)"
        options={npcOptions}
        value={form.npcIds}
        onChange={(npcIds) => setForm({ ...form, npcIds })}
      />
      <label className="annot-field">
        <span>Resultado</span>
        <select
          value={form.result}
          onChange={(e) => setForm({ ...form, result: e.target.value as ExpeditionResult })}
        >
          {ExpeditionResultSchema.options.map((r) => (
            <option key={r} value={r}>
              {RESULT_META[r].label}
            </option>
          ))}
        </select>
      </label>
      <label className="annot-field">
        <span>Como terminou</span>
        <textarea
          rows={3}
          value={form.outcome}
          onChange={(e) => setForm({ ...form, outcome: e.target.value })}
        />
      </label>
      <label className="annot-field">
        <span>Resumo</span>
        <textarea
          rows={3}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </label>
      <label className="annot-field">
        <span>Primeira sessão</span>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />
      </label>
      <label className="annot-field">
        <span>Última sessão</span>
        <input
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        />
      </label>
      {badRange && (
        <p className="annot-note annot-note--warn">A última sessão é antes da primeira.</p>
      )}
      <label className="annot-field">
        <span>Sessões</span>
        <input
          type="number"
          min={0}
          value={form.sessions}
          onChange={(e) => setForm({ ...form, sessions: Number(e.target.value) })}
        />
      </label>
      <div className="annot-actions">
        <button
          type="button"
          className="annot-save__btn"
          onClick={submit}
          disabled={!form.name.trim() || badRange}
        >
          {editingId === NEW ? "Adicionar expedição" : "Salvar"}
        </button>
        <button type="button" className="annot-save__reset" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="panel__section-title">Expedições ({expeditions.length})</div>

      {editingId === NEW ? (
        renderForm()
      ) : (
        <button type="button" className="annot-save__btn faction-new" onClick={startNew}>
          + Nova expedição
        </button>
      )}

      {expeditions.map((e) => {
        const id = e.id as string;
        const editing = editingId === id;
        const isSession = sessionIds.has(id);
        const isGenerated = generatedIds.has(id);
        const meta = RESULT_META[e.result];
        return (
          <div key={id} className="faction-item">
            <button
              type="button"
              className={"annot-arearow" + (editing ? " annot-arearow--active" : "")}
              onClick={() => (editing ? cancel() : beginEdit(e))}
            >
              <span>
                <span className="standing__swatch" style={{ background: meta.color }} />
                {e.name}
                <span className="faction-tag">{formatSpan(e.startDate, e.endDate)}</span>
              </span>
              <span className="annot-badge">
                {isSession ? (isGenerated ? "editada" : "nova") : "—"}
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
                      disabled={!isGenerated && linkedIds.has(id)}
                      title={
                        !isGenerated && linkedIds.has(id)
                          ? "Um evento de relação aponta para esta expedição"
                          : undefined
                      }
                      onClick={() => {
                        ann.removeExpedition(id);
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

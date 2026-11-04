import type { Atlas } from "@/domain/selectors";
import {
  InitiativeStatusSchema,
  type Initiative,
  type InitiativeEvent,
  type InitiativeStatus,
  type Landmark,
} from "@/domain/schema";
import type { AreaId, InitiativeId, LandmarkId, MemberId } from "@/domain/ids";
import generated from "@/data/world.generated.json";
import { STATUS_META, initiativeMeta } from "@/initiatives/status";
import { NEW, useRosterEditor } from "./useRosterEditor";
import type { useAnnotations } from "./useAnnotations";
import { LinkList, mergeById, type LinkOption } from "./LinkList";

interface InitiativePanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

interface EventForm {
  date: string;
  title: string;
  description: string;
  /** "" = this event doesn't change it. */
  progress: string;
  status: "" | InitiativeStatus;
}

const emptyEvent: EventForm = { date: "", title: "", description: "", progress: "", status: "" };

interface InitiativeForm {
  name: string;
  status: InitiativeStatus;
  progress: number;
  summary: string;
  outcome: string;
  areaIds: string[];
  landmarkIds: string[];
  relatedInitiativeIds: string[];
  memberIds: string[];
  events: EventForm[];
}

const emptyForm: InitiativeForm = {
  name: "",
  status: "planned",
  progress: 0,
  summary: "",
  outcome: "",
  areaIds: [],
  landmarkIds: [],
  relatedInitiativeIds: [],
  memberIds: [],
  events: [],
};
const generatedIds = new Set((generated.initiatives as { id: string }[]).map((i) => i.id));

export function InitiativePanel({ atlas, ann }: InitiativePanelProps) {
  const { editingId, form, setForm, startEdit, startNew, cancel } = useRosterEditor(emptyForm);

  const initiatives = mergeById(atlas.world.initiatives, ann.annotations.initiatives);
  const sessionIds = new Set(ann.annotations.initiatives.map((i) => i.id as string));
  const landmarks: Landmark[] = mergeById(atlas.world.landmarks, ann.annotations.landmarks);

  const levelName = (levelId: string) =>
    atlas.world.levels.find((l) => l.id === levelId)?.name ?? levelId;
  const areaOptions: LinkOption[] = atlas.world.areas.map((a) => ({
    id: a.id as string,
    label: `${a.name} — ${levelName(a.levelId)}`,
  }));
  const landmarkOptions: LinkOption[] = landmarks.map((l) => ({
    id: l.id as string,
    label: `${l.name} — ${levelName(l.levelId)}`,
  }));
  const memberOptions: LinkOption[] = mergeById(atlas.world.members, ann.annotations.members)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({ id: m.id as string, label: m.name }));
  const initiativeOptions: LinkOption[] = initiatives
    .filter((i) => i.id !== editingId)
    .map((i) => ({ id: i.id as string, label: i.name }));

  /** Another initiative lists this one as related (deleting it would dangle). */
  const isReferenced = (id: string) =>
    initiatives.some((i) => i.id !== id && i.relatedInitiativeIds.some((r) => r === id));

  function beginEdit(i: Initiative) {
    startEdit(i.id as string, {
      name: i.name,
      status: i.status,
      progress: i.progress,
      summary: i.summary,
      outcome: i.outcome,
      areaIds: i.areaIds.map(String),
      landmarkIds: i.landmarkIds.map(String),
      relatedInitiativeIds: i.relatedInitiativeIds.map(String),
      memberIds: i.memberIds.map(String),
      events: i.events.map((e) => ({
        date: e.date,
        title: e.title,
        description: e.description,
        progress: e.progress === undefined ? "" : String(e.progress),
        status: e.status ?? "",
      })),
    });
  }

  function setEvent(i: number, patch: Partial<EventForm>) {
    setForm({ ...form, events: form.events.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  }

  // An event needs a title (the schema requires one); block saving until it has.
  const untitled = form.events.some((e) => !e.title.trim());

  function fields(): Omit<Initiative, "id"> {
    return {
      name: form.name.trim(),
      status: form.status,
      progress: Math.round(Math.min(100, Math.max(0, form.progress || 0))),
      summary: form.summary.trim(),
      outcome: form.outcome.trim(),
      areaIds: form.areaIds as AreaId[],
      landmarkIds: form.landmarkIds as LandmarkId[],
      relatedInitiativeIds: form.relatedInitiativeIds as InitiativeId[],
      memberIds: form.memberIds as MemberId[],
      events: form.events.map((e): InitiativeEvent => ({
        date: e.date,
        title: e.title.trim(),
        description: e.description.trim(),
        ...(e.progress !== ""
          ? { progress: Math.round(Math.min(100, Math.max(0, Number(e.progress) || 0))) }
          : {}),
        ...(e.status ? { status: e.status } : {}),
      })),
    };
  }

  function submit() {
    if (!form.name.trim() || untitled) return;
    if (editingId === NEW) {
      ann.addInitiative(
        fields(),
        initiatives.map((i) => i.id as string),
      );
    } else if (editingId) {
      ann.upsertInitiative({ id: editingId as InitiativeId, ...fields() });
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
          placeholder="ex.: Reconstruir Jorbe"
        />
      </label>
      <label className="annot-field">
        <span>Status</span>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as InitiativeStatus })}
        >
          {InitiativeStatusSchema.options.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </label>
      <label className="annot-field">
        <span>Progresso ({form.progress}%)</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={form.progress}
          onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
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
        <span>Desfecho</span>
        <textarea
          rows={2}
          value={form.outcome}
          onChange={(e) => setForm({ ...form, outcome: e.target.value })}
        />
      </label>
      <LinkList
        label="Regiões afetadas"
        options={areaOptions}
        value={form.areaIds}
        onChange={(areaIds) => setForm({ ...form, areaIds })}
      />
      <LinkList
        label="Locais relacionados"
        options={landmarkOptions}
        value={form.landmarkIds}
        onChange={(landmarkIds) => setForm({ ...form, landmarkIds })}
      />
      <LinkList
        label="Iniciativas relacionadas"
        options={initiativeOptions}
        value={form.relatedInitiativeIds}
        onChange={(relatedInitiativeIds) => setForm({ ...form, relatedInitiativeIds })}
      />
      <LinkList
        label="Membros"
        options={memberOptions}
        value={form.memberIds}
        onChange={(memberIds) => setForm({ ...form, memberIds })}
      />
      {form.events.map((ev, i) => (
        <div key={i} className="annot-form rel-edit-event">
          <label className="annot-field">
            <span>Evento</span>
            <input
              value={ev.title}
              onChange={(e) => setEvent(i, { title: e.target.value })}
              placeholder="ex.: Revestimento tóxico descoberto"
            />
          </label>
          <label className="annot-field">
            <span>Data da sessão</span>
            <input
              type="date"
              value={ev.date}
              onChange={(e) => setEvent(i, { date: e.target.value })}
            />
          </label>
          <label className="annot-field">
            <span>Progresso após o evento (vazio = sem mudança)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={ev.progress}
              onChange={(e) => setEvent(i, { progress: e.target.value })}
            />
          </label>
          <label className="annot-field">
            <span>Status após o evento</span>
            <select
              value={ev.status}
              onChange={(e) => setEvent(i, { status: e.target.value as EventForm["status"] })}
            >
              <option value="">— sem mudança</option>
              {InitiativeStatusSchema.options.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="annot-field">
            <span>O que aconteceu</span>
            <textarea
              rows={2}
              value={ev.description}
              onChange={(e) => setEvent(i, { description: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="annot-save__reset"
            onClick={() => setForm({ ...form, events: form.events.filter((_, j) => j !== i) })}
          >
            Remover evento
          </button>
        </div>
      ))}
      <button
        type="button"
        className="annot-save__reset"
        onClick={() => setForm({ ...form, events: [...form.events, emptyEvent] })}
      >
        + Evento
      </button>
      {untitled && <p className="annot-note annot-note--warn">Todo evento precisa de um nome.</p>}
      <div className="annot-actions">
        <button
          type="button"
          className="annot-save__btn"
          onClick={submit}
          disabled={!form.name.trim() || untitled}
        >
          {editingId === NEW ? "Adicionar iniciativa" : "Salvar"}
        </button>
        <button type="button" className="annot-save__reset" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="panel__section-title">Iniciativas ({initiatives.length})</div>
      <p className="annot-note">
        Novos marcos aparecem aqui depois de criados na ferramenta Marco.
      </p>

      {editingId === NEW ? (
        renderForm()
      ) : (
        <button type="button" className="annot-save__btn faction-new" onClick={startNew}>
          + Nova iniciativa
        </button>
      )}

      {initiatives.map((i) => {
        const id = i.id as string;
        const editing = editingId === id;
        const isSession = sessionIds.has(id);
        const isGenerated = generatedIds.has(id);
        const meta = initiativeMeta(i);
        return (
          <div key={id} className="faction-item">
            <button
              type="button"
              className={"annot-arearow" + (editing ? " annot-arearow--active" : "")}
              onClick={() => (editing ? cancel() : beginEdit(i))}
            >
              <span>
                <span className="standing__swatch" style={{ background: meta.color }} />
                {i.name}
                <span className="faction-tag">{i.progress}%</span>
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
                    {isGenerated ? (
                      <button
                        type="button"
                        className="annot-save__reset"
                        onClick={() => {
                          ann.removeInitiative(id);
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
                            ? "Listada como relacionada em outra iniciativa — remova a referência antes"
                            : undefined
                        }
                        onClick={() => {
                          ann.removeInitiative(id);
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

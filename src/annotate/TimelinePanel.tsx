import type { Atlas } from "@/domain/selectors";
import { TimelineKindSchema, type TimelineEvent, type TimelineKind } from "@/domain/schema";
import type { ExpeditionId, MemberId } from "@/domain/ids";
import { formatWorldSpan, parseWorldDate } from "@/domain/calendar";
import generated from "@/data/world.generated.json";
import { KIND_META } from "@/timeline/meta";
import { NEW, useRosterEditor } from "./useRosterEditor";
import type { useAnnotations } from "./useAnnotations";
import { LinkList, mergeById, type LinkOption } from "./LinkList";

interface TimelinePanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

interface TimelineForm {
  title: string;
  kind: TimelineKind;
  start: string;
  end: string;
  summary: string;
  memberIds: string[];
  companions: string;
  places: string;
  foes: string;
  expeditionId: string;
}

const emptyForm: TimelineForm = {
  title: "",
  kind: "mission",
  start: "",
  end: "",
  summary: "",
  memberIds: [],
  companions: "",
  places: "",
  foes: "",
  expeditionId: "",
};
const generatedIds = new Set((generated.timeline as { id: string }[]).map((e) => e.id));

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function TimelinePanel({ atlas, ann }: TimelinePanelProps) {
  const { editingId, form, setForm, startEdit, startNew, cancel } = useRosterEditor(emptyForm);

  const events = mergeById(atlas.world.timeline, ann.annotations.timeline).sort(
    (a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title),
  );
  const sessionIds = new Set(ann.annotations.timeline.map((e) => e.id as string));
  const memberOptions: LinkOption[] = mergeById(atlas.world.members, ann.annotations.members)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({ id: m.id as string, label: m.name }));
  const expeditions = mergeById(atlas.world.expeditions, ann.annotations.expeditions);

  function beginEdit(e: TimelineEvent) {
    startEdit(e.id as string, {
      title: e.title,
      kind: e.kind,
      start: e.start,
      end: e.end ?? "",
      summary: e.summary,
      memberIds: e.memberIds.map(String),
      companions: e.companions.join(", "),
      places: e.places.join(", "),
      foes: e.foes.join(", "),
      expeditionId: (e.expeditionId as string | undefined) ?? "",
    });
  }

  function fields(): Omit<TimelineEvent, "id"> {
    return {
      title: form.title.trim(),
      kind: form.kind,
      start: form.start,
      ...(form.end && form.end !== form.start ? { end: form.end } : {}),
      summary: form.summary.trim(),
      memberIds: form.memberIds as MemberId[],
      companions: splitList(form.companions),
      places: splitList(form.places),
      foes: splitList(form.foes),
      ...(form.expeditionId ? { expeditionId: form.expeditionId as ExpeditionId } : {}),
    };
  }

  // Mirrors the schema + loadWorld checks, so a bad date can't be saved and break the load.
  const badStart = !parseWorldDate(form.start);
  const badEnd = Boolean(form.end) && !parseWorldDate(form.end);
  const badRange = !badStart && !badEnd && Boolean(form.end) && form.end < form.start;
  const invalid = !form.title.trim() || badStart || badEnd || badRange;

  function submit() {
    if (invalid) return;
    if (editingId === NEW) {
      ann.addTimelineEvent(
        fields(),
        events.map((e) => e.id as string),
      );
    } else if (editingId) {
      ann.upsertTimelineEvent({ id: editingId as TimelineEvent["id"], ...fields() });
    }
    cancel();
  }

  const text = (key: "title" | "start" | "end" | "companions" | "places" | "foes") => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
  });

  const renderForm = () => (
    <div className="annot-form">
      <label className="annot-field">
        <span>Título</span>
        <input autoFocus {...text("title")} placeholder="ex.: Escolta dos mineradores" />
      </label>
      <label className="annot-field">
        <span>Tipo</span>
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value as TimelineKind })}
        >
          {TimelineKindSchema.options.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label}
            </option>
          ))}
        </select>
      </label>
      <label className="annot-field">
        <span>Início (AAAA-MM-DD; mês 00 = Ascensão)</span>
        <input {...text("start")} placeholder="0560-02-04" />
      </label>
      <label className="annot-field">
        <span>Fim (opcional)</span>
        <input {...text("end")} placeholder="0560-02-08" />
      </label>
      {(badStart && form.start !== "") || badEnd ? (
        <p className="annot-note annot-note--warn">
          Data fora do calendário (meses de 28 dias; só dezembro tem o dia 29).
        </p>
      ) : null}
      {badRange && <p className="annot-note annot-note--warn">O fim é antes do início.</p>}
      <label className="annot-field">
        <span>Resumo</span>
        <textarea
          rows={3}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </label>
      <LinkList
        label="Membros"
        options={memberOptions}
        value={form.memberIds}
        onChange={(memberIds) => setForm({ ...form, memberIds })}
      />
      <label className="annot-field">
        <span>Aliados fora da guilda (separados por vírgula)</span>
        <input {...text("companions")} />
      </label>
      <label className="annot-field">
        <span>Lugares (separados por vírgula)</span>
        <input {...text("places")} />
      </label>
      <label className="annot-field">
        <span>Inimigos (separados por vírgula)</span>
        <input {...text("foes")} />
      </label>
      <label className="annot-field">
        <span>Expedição (opcional)</span>
        <select
          value={form.expeditionId}
          onChange={(e) => setForm({ ...form, expeditionId: e.target.value })}
        >
          <option value="">—</option>
          {expeditions.map((x) => (
            <option key={x.id} value={x.id as string}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <div className="annot-actions">
        <button type="button" className="annot-save__btn" onClick={submit} disabled={invalid}>
          {editingId === NEW ? "Adicionar evento" : "Salvar"}
        </button>
        <button type="button" className="annot-save__reset" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="panel__section-title">Linha do tempo ({events.length})</div>

      {editingId === NEW ? (
        renderForm()
      ) : (
        <button type="button" className="annot-save__btn faction-new" onClick={startNew}>
          + Novo evento
        </button>
      )}

      {events.map((e) => {
        const id = e.id as string;
        const editing = editingId === id;
        const isSession = sessionIds.has(id);
        const isGenerated = generatedIds.has(id);
        return (
          <div key={id} className="faction-item">
            <button
              type="button"
              className={"annot-arearow" + (editing ? " annot-arearow--active" : "")}
              onClick={() => (editing ? cancel() : beginEdit(e))}
            >
              <span>
                <span
                  className="standing__swatch"
                  style={{ background: KIND_META[e.kind].color }}
                />
                {e.title}
                <span className="faction-tag">{formatWorldSpan(e.start, e.end)}</span>
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
                        ann.removeTimelineEvent(id);
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

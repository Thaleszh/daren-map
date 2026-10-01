import type { Atlas } from "@/domain/selectors";
import type { FactionRelation, RelationEvent } from "@/domain/schema";
import type { ExpeditionId, FactionId } from "@/domain/ids";
import generated from "@/data/world.generated.json";
import { RELATION_GROUPING_ID, relationSteps, relationTier } from "@/domain/relations";
import { effectColor, formatEffect } from "@/relations/effect";
import { mergedFactions } from "./PresencePanel";
import { useRosterEditor } from "./useRosterEditor";
import type { useAnnotations } from "./useAnnotations";
import { mergeById } from "./LinkList";

interface RelationPanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

interface EventForm {
  date: string;
  title: string;
  description: string;
  effect: number;
  expeditionId: string;
}

interface RelationForm {
  summary: string;
  events: EventForm[];
}

const emptyForm: RelationForm = { summary: "", events: [] };
const emptyEvent: EventForm = {
  date: "",
  title: "",
  description: "",
  effect: 0,
  expeditionId: "",
};
const generatedIds = new Set(
  ((generated as { relations?: { factionId: string }[] }).relations ?? []).map((r) => r.factionId),
);

const clampEffect = (n: number) => Math.max(-5, Math.min(5, Math.round(n || 0)));

/**
 * The guild's history with each faction: a one-line read plus dated events,
 * each with how far it moved the relation; the grade (−10..+10) and its tier
 * follow from them. Which factions are listed at all is set in Agrupamentos
 * ("Relação com os Sem Cores").
 */
export function RelationPanel({ atlas, ann }: RelationPanelProps) {
  const { editingId, form, setForm, startEdit, cancel } = useRosterEditor(emptyForm);

  const relations = new Map(
    [...atlas.world.relations, ...ann.annotations.relations].map((r) => [r.factionId as string, r]),
  );
  // Same cut as the Relações view: factions placed in the stance grouping (this
  // session's moves included) or already carrying a history.
  const placed = new Set(
    atlas.world.groupings
      .find((g) => g.id === RELATION_GROUPING_ID)
      ?.groups.flatMap((g) => g.members.map(String)) ?? [],
  );
  for (const m of ann.annotations.memberships) {
    if (m.groupingId !== RELATION_GROUPING_ID) continue;
    if (m.groupId === null) placed.delete(m.factionId as string);
    else placed.add(m.factionId as string);
  }
  const factions = mergedFactions(atlas, ann.annotations.factions).filter(
    (f) => !f.isPlayerOrg && (placed.has(f.id as string) || relations.has(f.id as string)),
  );
  const sessionIds = new Set(ann.annotations.relations.map((r) => r.factionId as string));
  const expeditions = mergeById(atlas.world.expeditions, ann.annotations.expeditions);

  function beginEdit(factionId: string) {
    const rel = relations.get(factionId);
    startEdit(factionId, {
      summary: rel?.summary ?? "",
      events: (rel?.events ?? []).map((e) => ({
        date: e.date,
        title: e.title,
        description: e.description,
        effect: e.effect,
        expeditionId: (e.expeditionId as string | undefined) ?? "",
      })),
    });
  }

  function setEvent(i: number, patch: Partial<EventForm>) {
    setForm({ ...form, events: form.events.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  }

  // An event needs a title (the schema requires one); block saving until it has.
  const untitled = form.events.some((e) => !e.title.trim());

  function submit() {
    if (!editingId || untitled) return;
    const events: RelationEvent[] = form.events.map((e) => ({
      date: e.date,
      title: e.title.trim(),
      description: e.description.trim(),
      effect: clampEffect(e.effect),
      ...(e.expeditionId ? { expeditionId: e.expeditionId as ExpeditionId } : {}),
    }));
    const rel: FactionRelation = {
      factionId: editingId as FactionId,
      summary: form.summary.trim(),
      events,
    };
    ann.upsertRelation(rel);
    cancel();
  }

  const renderForm = () => (
    <div className="annot-form">
      <label className="annot-field">
        <span>Resumo da relação</span>
        <textarea
          rows={2}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="ex.: Contratantes satisfeitos, mas desconfiados da Inquisição"
        />
      </label>

      {form.events.map((ev, i) => (
        <div key={i} className="annot-form rel-edit-event">
          <label className="annot-field">
            <span>Evento</span>
            <input
              value={ev.title}
              onChange={(e) => setEvent(i, { title: e.target.value })}
              placeholder="ex.: Entregamos as frutas do leste"
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
            <span>
              Efeito na relação (−5 a +5):{" "}
              <b style={{ color: effectColor(ev.effect) }}>{formatEffect(ev.effect)}</b>
            </span>
            <input
              type="range"
              min={-5}
              max={5}
              step={1}
              value={ev.effect}
              onChange={(e) => setEvent(i, { effect: Number(e.target.value) })}
            />
          </label>
          <label className="annot-field">
            <span>Expedição (opcional)</span>
            <select
              value={ev.expeditionId}
              onChange={(e) => setEvent(i, { expeditionId: e.target.value })}
            >
              <option value="">—</option>
              {expeditions.map((x) => (
                <option key={x.id} value={x.id as string}>
                  {x.name}
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
        <button type="button" className="annot-save__btn" onClick={submit} disabled={untitled}>
          Salvar
        </button>
        <button type="button" className="annot-save__reset" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="panel__section-title">Relações ({factions.length})</div>
      <p className="annot-note">
        O grau (−10 a +10) sai da soma dos efeitos. Quem aparece aqui é decidido em{" "}
        <b>Agrupamentos</b> (Relação com os Sem Cores).
      </p>

      {factions.map((f) => {
        const id = f.id as string;
        const editing = editingId === id;
        const rel = relations.get(id);
        const balance = relationSteps(rel?.events ?? []).at(-1)?.balance ?? 0;
        const tier = relationTier(balance);
        const isSession = sessionIds.has(id);
        const isGenerated = generatedIds.has(id);
        return (
          <div key={id} className="faction-item">
            <button
              type="button"
              className={"annot-arearow" + (editing ? " annot-arearow--active" : "")}
              onClick={() => (editing ? cancel() : beginEdit(id))}
            >
              <span>
                <span className="standing__swatch" style={{ background: f.color }} />
                {f.name}
                {rel && rel.events.length > 0 && (
                  <span className="faction-tag" style={{ color: tier.color }}>
                    {formatEffect(balance)} {tier.label} · {rel.events.length}
                  </span>
                )}
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
                      onClick={() => {
                        ann.removeRelation(id);
                        cancel();
                      }}
                    >
                      {isGenerated ? "Reverter ao gerado" : "Apagar histórico"}
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

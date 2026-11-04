import type { Atlas } from "@/domain/selectors";
import {
  MemberKindSchema,
  MemberStatusSchema,
  type Member,
  type MemberKind,
  type MemberStatus,
} from "@/domain/schema";
import type { MemberId } from "@/domain/ids";
import generated from "@/data/world.generated.json";
import { KIND_META, STATUS_META } from "@/members/meta";
import { NEW, useRosterEditor } from "./useRosterEditor";
import type { useAnnotations } from "./useAnnotations";
import { mergeById } from "./LinkList";

interface MemberPanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

interface MemberForm {
  name: string;
  /** Comma-separated while editing; split into `aliases` on save. */
  aliases: string;
  kind: MemberKind;
  status: MemberStatus;
  /** Empty = NPC. */
  player: string;
  description: string;
  statusNote: string;
}

const emptyForm: MemberForm = {
  name: "",
  aliases: "",
  kind: "mercenary",
  status: "active",
  player: "",
  description: "",
  statusNote: "",
};
const generatedIds = new Set((generated.members as { id: string }[]).map((m) => m.id));

export function MemberPanel({ atlas, ann }: MemberPanelProps) {
  const { editingId, form, setForm, startEdit, startNew, cancel } = useRosterEditor(emptyForm);

  const members = mergeById(atlas.world.members, ann.annotations.members).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const sessionIds = new Set(ann.annotations.members.map((m) => m.id as string));
  /** An expedition or initiative links this member (deleting a new one would dangle). */
  const linkedIds = new Set(
    [
      ...mergeById(atlas.world.expeditions, ann.annotations.expeditions),
      ...mergeById(atlas.world.initiatives, ann.annotations.initiatives),
    ].flatMap((x) => x.memberIds.map(String)),
  );

  function beginEdit(m: Member) {
    startEdit(m.id as string, {
      name: m.name,
      aliases: m.aliases.join(", "),
      kind: m.kind,
      status: m.status,
      player: m.player,
      description: m.description,
      statusNote: m.statusNote,
    });
  }

  function fields(): Omit<Member, "id"> {
    return {
      name: form.name.trim(),
      aliases: form.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      kind: form.kind,
      status: form.status,
      player: form.player.trim(),
      description: form.description.trim(),
      statusNote: form.statusNote.trim(),
    };
  }

  function submit() {
    if (!form.name.trim()) return;
    if (editingId === NEW) {
      ann.addMember(
        fields(),
        members.map((m) => m.id as string),
      );
    } else if (editingId) {
      ann.upsertMember({ id: editingId as MemberId, ...fields() });
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
        />
      </label>
      <label className="annot-field">
        <span>Outras grafias (separadas por vírgula)</span>
        <input
          value={form.aliases}
          onChange={(e) => setForm({ ...form, aliases: e.target.value })}
          placeholder="ex.: Kinnan"
        />
      </label>
      <label className="annot-field">
        <span>Tipo</span>
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value as MemberKind })}
        >
          {MemberKindSchema.options.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label} — {KIND_META[k].hint.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="annot-field">
        <span>Situação</span>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as MemberStatus })}
        >
          {MemberStatusSchema.options.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </label>
      <label className="annot-field">
        <span>Jogador (vazio = NPC)</span>
        <input
          list="member-players"
          value={form.player}
          onChange={(e) => setForm({ ...form, player: e.target.value })}
        />
        <datalist id="member-players">
          {[...new Set(members.map((m) => m.player).filter(Boolean))].map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
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
        <span>Como morreu / se perdeu</span>
        <textarea
          rows={2}
          value={form.statusNote}
          onChange={(e) => setForm({ ...form, statusNote: e.target.value })}
        />
      </label>
      <div className="annot-actions">
        <button
          type="button"
          className="annot-save__btn"
          onClick={submit}
          disabled={!form.name.trim()}
        >
          {editingId === NEW ? "Adicionar membro" : "Salvar"}
        </button>
        <button type="button" className="annot-save__reset" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="panel__section-title">Membros ({members.length})</div>

      {editingId === NEW ? (
        renderForm()
      ) : (
        <button type="button" className="annot-save__btn faction-new" onClick={startNew}>
          + Novo membro
        </button>
      )}

      {members.map((m) => {
        const id = m.id as string;
        const editing = editingId === id;
        const isSession = sessionIds.has(id);
        const isGenerated = generatedIds.has(id);
        const linked = linkedIds.has(id);
        return (
          <div key={id} className="faction-item">
            <button
              type="button"
              className={"annot-arearow" + (editing ? " annot-arearow--active" : "")}
              onClick={() => (editing ? cancel() : beginEdit(m))}
            >
              <span>
                <span
                  className="standing__swatch"
                  style={{ background: STATUS_META[m.status].color }}
                />
                {m.name}
                <span className="faction-tag">{KIND_META[m.kind].label}</span>
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
                      disabled={!isGenerated && linked}
                      title={
                        !isGenerated && linked
                          ? "Uma expedição ou iniciativa aponta para este membro"
                          : undefined
                      }
                      onClick={() => {
                        ann.removeMember(id);
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

import { useState } from "react";
import type { Atlas } from "@/domain/selectors";
import type { Member, MemberKind } from "@/domain/schema";
import type { ExpeditionId, InitiativeId, MemberId } from "@/domain/ids";
import { RESULT_META, formatSpan } from "@/expeditions/result";
import { initiativeMeta } from "@/initiatives/status";
import { KIND_META, STATUS_META } from "./meta";

interface Section {
  title: string;
  members: Member[];
  empty?: string;
}

export interface MembersViewProps {
  atlas: Atlas;
  /** Controlled selection, mirrored to the URL by App so a link restores it. */
  selectedId: MemberId | null;
  onSelectId: (id: MemberId) => void;
  onOpenExpedition: (id: ExpeditionId) => void;
  onOpenInitiative: (id: InitiativeId) => void;
}

/**
 * The guild roster: mercenaries (who go out on jobs) and civilians (who mostly
 * stay), with ex-members, the dead and the missing listed apart at the bottom. Laid out like
 * the other list + detail views; the detail links back to the expeditions and
 * initiatives the member appears in.
 */
export function MembersView({
  atlas,
  selectedId,
  onSelectId,
  onOpenExpedition,
  onOpenInitiative,
}: MembersViewProps) {
  const guild = atlas.guild();
  const members = atlas.members();

  const living = (kind: MemberKind) =>
    members.filter((m) => m.status === "active" && m.kind === kind);
  const [groupBy, setGroupBy] = useState<"kind" | "player">("kind");

  const byKind: Section[] = [
    { title: KIND_META.mercenary.plural, members: living("mercenary") },
    {
      title: KIND_META.civil.plural,
      members: living("civil"),
      empty: "Nenhum civil registrado ainda.",
    },
    { title: "Ex-Membros", members: members.filter((m) => m.status === "left") },
    { title: "Mortos", members: members.filter((m) => m.status === "dead") },
    { title: "Desaparecidos", members: members.filter((m) => m.status === "missing") },
  ];

  // One section per player (in roster order), every status together; no player = NPC.
  const players = [...new Set(members.map((m) => m.player).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const byPlayer: Section[] = [
    ...players.map((p) => ({ title: p, members: members.filter((m) => m.player === p) })),
    { title: "NPCs", members: members.filter((m) => !m.player) },
  ];
  const sections = groupBy === "player" ? byPlayer : byKind;

  // Fall back to the first listed member so the empty-hash view still lands on
  // a detail pane without dirtying the URL.
  const selected =
    (selectedId ? atlas.member(selectedId) : undefined) ?? sections.flatMap((s) => s.members)[0];

  return (
    <div className="app__body app__body--initiatives">
      <aside className="initiatives__list">
        <div className="initiatives__eyebrow">Membros · {guild?.name ?? "Guilda"}</div>
        <div className="members__toggle">
          {(["kind", "player"] as const).map((g) => (
            <button
              type="button"
              key={g}
              className="chip--link"
              aria-pressed={groupBy === g}
              onClick={() => setGroupBy(g)}
            >
              {g === "kind" ? "Por tipo" : "Por jogador"}
            </button>
          ))}
        </div>
        {sections.map((section) => (
          <section key={section.title}>
            <div className="rel-section">
              {section.title}
              <span className="rel-section__count">{section.members.length}</span>
            </div>
            {section.members.length === 0 && section.empty && (
              <div className="panel__empty">{section.empty}</div>
            )}
            {section.members.map((m) => (
              <button
                type="button"
                key={m.id}
                className={"init-card" + (m.id === selected?.id ? " init-card--active" : "")}
                onClick={() => onSelectId(m.id)}
              >
                <div className="init-card__head">
                  <span className="init-card__name">{m.name}</span>
                  {m.status !== "active" ? (
                    <StatusChip status={m.status} />
                  ) : (
                    <span className="exp-card__date">
                      {groupBy === "player" ? KIND_META[m.kind].label : m.player || "NPC"}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </section>
        ))}
      </aside>

      {selected ? (
        <MemberDetail
          key={selected.id}
          atlas={atlas}
          member={selected}
          onOpenExpedition={onOpenExpedition}
          onOpenInitiative={onOpenInitiative}
        />
      ) : (
        <div className="app__panel">
          <div className="panel__empty">Selecione um membro para ver os detalhes.</div>
        </div>
      )}
    </div>
  );
}

export function StatusChip({ status }: { status: Member["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span className="chip" style={{ borderColor: meta.color, color: meta.color }}>
      {meta.label}
    </span>
  );
}

function MemberDetail({
  atlas,
  member,
  onOpenExpedition,
  onOpenInitiative,
}: {
  atlas: Atlas;
  member: Member;
  onOpenExpedition: (id: ExpeditionId) => void;
  onOpenInitiative: (id: InitiativeId) => void;
}) {
  const expeditions = atlas.expeditionsForMember(member.id);
  const initiatives = atlas.initiativesForMember(member.id);

  return (
    <div className="initiatives__detail app__panel">
      <div className="panel__eyebrow">Membro · {KIND_META[member.kind].label}</div>
      <h2 className="panel__title">{member.name}</h2>
      <div className="init-detail__status">
        <span className="chip">{KIND_META[member.kind].hint}</span>
        <span className="chip">{member.player ? `Jogador: ${member.player}` : "NPC"}</span>
        {member.status !== "active" && <StatusChip status={member.status} />}
      </div>
      {member.aliases.length > 0 && (
        <p className="panel__field">Também grafado: {member.aliases.join(", ")}</p>
      )}
      {member.description && <p className="panel__desc">{member.description}</p>}
      {member.statusNote && <p className="panel__field">{member.statusNote}</p>}

      <div className="panel__section-title">Expedições ({expeditions.length})</div>
      {expeditions.length === 0 && (
        <div className="panel__empty">Nenhuma expedição registrada.</div>
      )}
      {expeditions.map((exp) => {
        const meta = RESULT_META[exp.result];
        const span = formatSpan(exp.startDate, exp.endDate);
        return (
          <button
            type="button"
            className="init-link"
            key={exp.id}
            onClick={() => onOpenExpedition(exp.id)}
          >
            <span className="init-link__name">
              {exp.name}
              {span && <span className="exp-facts__sub"> · {span}</span>}
            </span>
            <span className="init-link__sub" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </button>
        );
      })}

      {initiatives.length > 0 && (
        <>
          <div className="panel__section-title">Iniciativas</div>
          {initiatives.map((init) => {
            const meta = initiativeMeta(init);
            return (
              <button
                type="button"
                className="init-link"
                key={init.id}
                onClick={() => onOpenInitiative(init.id)}
              >
                <span className="init-link__name">{init.name}</span>
                <span className="init-link__sub" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

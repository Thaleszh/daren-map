import type { Atlas } from "@/domain/selectors";
import type { Expedition } from "@/domain/schema";
import type { ExpeditionId } from "@/domain/ids";
import { RESULT_META, formatSpan } from "./result";

export interface ExpeditionsViewProps {
  atlas: Atlas;
  /** Controlled selection, mirrored to the URL by App so a link restores it. */
  selectedId: ExpeditionId | null;
  onSelectId: (id: ExpeditionId) => void;
}

/**
 * The guild's expedition log: every job it went out on, newest first, with the
 * selected one's contract, crew and outcome on the right. Laid out like the
 * initiatives view so the two read as siblings.
 */
export function ExpeditionsView({ atlas, selectedId, onSelectId }: ExpeditionsViewProps) {
  const guild = atlas.guild();
  const expeditions = atlas.expeditions();

  // Fall back to the newest expedition so the empty-hash view still lands on a
  // detail pane without dirtying the URL.
  const selected = (selectedId ? atlas.expedition(selectedId) : undefined) ?? expeditions[0];

  return (
    <div className="app__body app__body--initiatives">
      <aside className="initiatives__list">
        <div className="initiatives__eyebrow">Expedições · {guild?.name ?? "Guilda"}</div>
        {expeditions.length === 0 && (
          <div className="panel__empty">Nenhuma expedição registrada.</div>
        )}
        {expeditions.map((exp) => {
          const meta = RESULT_META[exp.result];
          const span = formatSpan(exp.startDate, exp.endDate);
          return (
            <button
              type="button"
              key={exp.id}
              className={"init-card" + (exp.id === selected?.id ? " init-card--active" : "")}
              onClick={() => onSelectId(exp.id)}
            >
              <div className="init-card__head">
                <span className="init-card__name">{exp.name}</span>
                <span className="chip" style={{ borderColor: meta.color, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              {exp.destination && <div className="init-card__summary">{exp.destination}</div>}
              {span && <div className="exp-card__date">{span}</div>}
            </button>
          );
        })}
      </aside>

      {selected ? (
        <ExpeditionDetail key={selected.id} atlas={atlas} expedition={selected} />
      ) : (
        <div className="app__panel">
          <div className="panel__empty">Selecione uma expedição para ver os detalhes.</div>
        </div>
      )}
    </div>
  );
}

function ExpeditionDetail({ atlas, expedition }: { atlas: Atlas; expedition: Expedition }) {
  const meta = RESULT_META[expedition.result];
  const contractorFaction = expedition.contractorFactionId
    ? atlas.faction(expedition.contractorFactionId)
    : undefined;
  const npcs = expedition.npcIds
    .map((id) => atlas.npc(id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);
  const span = formatSpan(expedition.startDate, expedition.endDate);
  const when = [
    span,
    expedition.sessions > 0 &&
      `${expedition.sessions} ${expedition.sessions === 1 ? "sessão" : "sessões"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="initiatives__detail app__panel">
      <div className="panel__eyebrow">Expedição{when && ` · ${when}`}</div>
      <h2 className="panel__title">{expedition.name}</h2>
      <div className="init-detail__status">
        <span className="chip" style={{ borderColor: meta.color, color: meta.color }}>
          {meta.label}
        </span>
      </div>
      {expedition.summary && <p className="panel__desc">{expedition.summary}</p>}

      <dl className="exp-facts">
        {(expedition.contractor || contractorFaction) && (
          <>
            <dt>Contratante</dt>
            <dd>
              {contractorFaction && (
                <span
                  className="init-detail__swatch"
                  style={{ background: contractorFaction.color }}
                />
              )}
              {expedition.contractor || contractorFaction!.name}
              {expedition.contractor && contractorFaction && (
                <span className="exp-facts__sub"> · {contractorFaction.name}</span>
              )}
            </dd>
          </>
        )}
        {expedition.destination && (
          <>
            <dt>Destino</dt>
            <dd>{expedition.destination}</dd>
          </>
        )}
        {expedition.mission && (
          <>
            <dt>Missão</dt>
            <dd>{expedition.mission}</dd>
          </>
        )}
      </dl>

      {expedition.members.length > 0 && (
        <>
          <div className="panel__section-title">Membros</div>
          <div>
            {expedition.members.map((m) => (
              <span key={m} className="chip">
                {m}
              </span>
            ))}
          </div>
        </>
      )}

      {npcs.length > 0 && (
        <>
          <div className="panel__section-title">Pessoas envolvidas</div>
          {npcs.map((npc) => (
            <div key={npc.id} className="exp-npc">
              <span className="init-link__name">{npc.name}</span>
              {npc.role && <span className="init-link__sub">{npc.role}</span>}
            </div>
          ))}
        </>
      )}

      {expedition.outcome && (
        <>
          <div className="panel__section-title">Resultado</div>
          <p className="panel__field">{expedition.outcome}</p>
        </>
      )}
    </div>
  );
}

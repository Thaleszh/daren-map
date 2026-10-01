import type { Atlas } from "@/domain/selectors";
import {
  RELATION_MAX,
  RELATION_MIN,
  relationRows,
  relationTimeline,
  type RelationRow,
} from "@/domain/relations";
import type { ExpeditionId, FactionId } from "@/domain/ids";
import { RESULT_META, formatDate } from "@/expeditions/result";
import { effectColor, formatEffect } from "./effect";

export interface RelationsViewProps {
  atlas: Atlas;
  /** Controlled selection, mirrored to the URL by App so a link restores it. */
  selectedId: FactionId | null;
  onSelectId: (id: FactionId) => void;
  onOpenExpedition: (id: ExpeditionId) => void;
}

/**
 * The guild's standing with every other faction: the list on the left grouped
 * by tier (Aliado … Inimigo), and the selected faction's history on the right —
 * each event with how far it moved things on the −10..+10 scale.
 * Laid out like the initiatives view so the three read as siblings.
 */
export function RelationsView({
  atlas,
  selectedId,
  onSelectId,
  onOpenExpedition,
}: RelationsViewProps) {
  const guild = atlas.guild();
  const rows = relationRows(atlas);

  // Fall back to the first row so the empty-hash view still lands on a detail
  // pane without dirtying the URL.
  const selected = rows.find((r) => r.faction.id === selectedId) ?? rows[0];

  // Rows arrive warmest first (the apart group last), so a section starts
  // wherever the tier — or, past the main list, the apart group — changes. The
  // apart group is one section whose cards carry their own tier.
  const sections: { title: string; color: string; apart: boolean; rows: RelationRow[] }[] = [];
  for (const row of rows) {
    const title = row.apart?.name ?? row.tier.label;
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.rows.push(row);
    else
      sections.push({
        title,
        color: row.apart?.color ?? row.tier.color,
        apart: Boolean(row.apart),
        rows: [row],
      });
  }

  return (
    <div className="app__body app__body--initiatives">
      <aside className="initiatives__list">
        <div className="initiatives__eyebrow">Relações · {guild?.name ?? "Guilda"}</div>
        {sections.map((section) => (
          <section key={section.title}>
            <div className={"rel-section" + (section.apart ? " rel-section--apart" : "")}>
              <span className="standing__swatch" style={{ background: section.color }} />
              {section.title}
              <span className="rel-section__count">{section.rows.length}</span>
            </div>
            {section.rows.map((row) => {
              const events = row.relation?.events.length ?? 0;
              return (
                <button
                  type="button"
                  key={row.faction.id}
                  className={
                    "init-card rel-card" +
                    (row.faction.id === selected?.faction.id ? " init-card--active" : "")
                  }
                  onClick={() => onSelectId(row.faction.id)}
                >
                  <div className="init-card__head">
                    <span className="init-card__name">
                      <span
                        className="init-detail__swatch"
                        style={{ background: row.faction.color }}
                      />
                      {row.faction.name}
                    </span>
                    {events > 0 && (
                      <span className="rel-balance" style={{ color: row.tier.color }}>
                        {section.apart && `${row.tier.label} `}
                        {formatEffect(row.balance)}
                      </span>
                    )}
                  </div>
                  {(row.relation?.summary || events > 0) && (
                    <div className="init-card__summary">
                      {row.relation?.summary ||
                        `${events} ${events === 1 ? "evento" : "eventos"} registrados`}
                    </div>
                  )}
                </button>
              );
            })}
          </section>
        ))}
      </aside>

      {selected ? (
        <RelationDetail
          key={selected.faction.id}
          atlas={atlas}
          row={selected}
          onOpenExpedition={onOpenExpedition}
        />
      ) : (
        <div className="app__panel">
          <div className="panel__empty">Nenhuma facção registrada.</div>
        </div>
      )}
    </div>
  );
}

function RelationDetail({
  atlas,
  row,
  onOpenExpedition,
}: {
  atlas: Atlas;
  row: RelationRow;
  onOpenExpedition: (id: ExpeditionId) => void;
}) {
  const { faction, balance, tier, relation } = row;
  const timeline = relationTimeline(atlas, faction.id);
  const contracts = atlas.expeditionsForFaction(faction.id);
  const npcs = atlas.npcsInFaction(faction.id);

  return (
    <div className="initiatives__detail app__panel">
      <div className="panel__eyebrow">Relação com {atlas.guild()?.name ?? "a guilda"}</div>
      <h2 className="panel__title">
        <span className="init-detail__swatch" style={{ background: faction.color }} />
        {faction.name}
      </h2>
      <div className="init-detail__status">
        <span className="chip" style={{ borderColor: tier.color, color: tier.color }}>
          {tier.label}
        </span>
        <span className="init-detail__pct" style={{ color: tier.color }}>
          Saldo {formatEffect(balance)}
        </span>
      </div>
      <RelationGauge balance={balance} color={tier.color} />
      {relation?.summary && <p className="panel__desc">{relation.summary}</p>}
      {faction.description && <p className="panel__field">{faction.description}</p>}

      <div className="panel__section-title">Histórico</div>
      {timeline.length === 0 ? (
        <div className="panel__empty">Nenhum evento registrado com esta facção ainda.</div>
      ) : (
        <ol className="rel-timeline">
          {timeline.map(({ event, balance: after, tier: reached }, i) => {
            const exp = event.expeditionId ? atlas.expedition(event.expeditionId) : undefined;
            // Call out the events that moved the relation into a new tier.
            const before = i > 0 ? timeline[i - 1]!.tier : undefined;
            const crossed = reached.label !== (before?.label ?? "Neutro");
            return (
              <li key={i} className="rel-event">
                <span
                  className="rel-event__dot"
                  style={{ background: effectColor(event.effect) }}
                  aria-hidden
                />
                <div className="rel-event__head">
                  <span className="rel-event__title">{event.title}</span>
                  <span
                    className="rel-event__effect"
                    style={{ color: effectColor(event.effect) }}
                    title="Efeito na relação"
                  >
                    {formatEffect(event.effect)}
                  </span>
                </div>
                <div className="rel-event__meta">
                  {event.date && <span>{formatDate(event.date)}</span>}
                  <span>
                    saldo → <b style={{ color: reached.color }}>{formatEffect(after)}</b>
                  </span>
                  {crossed && <span style={{ color: reached.color }}>agora {reached.label}</span>}
                </div>
                {event.description && <p className="rel-event__desc">{event.description}</p>}
                {exp && (
                  <button
                    type="button"
                    className="rel-event__exp"
                    onClick={() => onOpenExpedition(exp.id)}
                  >
                    Expedição: {exp.name} →
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {contracts.length > 0 && (
        <>
          <div className="panel__section-title">Contratos com a guilda</div>
          {contracts.map((exp) => {
            const meta = RESULT_META[exp.result];
            return (
              <button
                type="button"
                key={exp.id}
                className="init-link"
                onClick={() => onOpenExpedition(exp.id)}
              >
                <span className="init-link__name">{exp.name}</span>
                <span className="init-link__sub" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </>
      )}

      {npcs.length > 0 && (
        <>
          <div className="panel__section-title">Pessoas</div>
          {npcs.map((npc) => (
            <div key={npc.id} className="exp-npc">
              <span className="init-link__name">{npc.name}</span>
              {npc.role && <span className="init-link__sub">{npc.role}</span>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** The balance on the −10..+10 scale, filled out from the neutral center. */
function RelationGauge({ balance, color }: { balance: number; color: string }) {
  const span = RELATION_MAX - RELATION_MIN;
  const zero = (-RELATION_MIN / span) * 100;
  const at = ((balance - RELATION_MIN) / span) * 100;
  return (
    <div
      className="rel-gauge"
      role="img"
      aria-label={`Saldo ${balance} de ${RELATION_MIN} a +${RELATION_MAX}`}
    >
      <div
        className="rel-gauge__fill"
        style={{
          left: `${Math.min(zero, at)}%`,
          width: `${Math.abs(at - zero)}%`,
          background: color,
        }}
      />
      <div className="rel-gauge__zero" style={{ left: `${zero}%` }} />
      <div className="rel-gauge__ends">
        <span>{RELATION_MIN}</span>
        <span>+{RELATION_MAX}</span>
      </div>
    </div>
  );
}

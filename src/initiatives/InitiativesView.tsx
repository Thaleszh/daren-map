import { useState } from "react";
import type { Atlas } from "@/domain/selectors";
import type { Initiative, InitiativeStatus } from "@/domain/schema";
import type { AreaId, InitiativeId, LandmarkId } from "@/domain/ids";
import { landmarkStyle } from "@/map/landmarkStyle";

/** Per-status label + color, used for the chip and the progress fill. */
const STATUS_META: Record<InitiativeStatus, { label: string; color: string }> = {
  planned: { label: "Planejada", color: "#6b7488" },
  active: { label: "Em andamento", color: "#e4c65b" },
  completed: { label: "Concluída", color: "#4fb477" },
  failed: { label: "Fracassada", color: "#d05a5a" },
  abandoned: { label: "Abandonada", color: "#8a7bb0" },
};

/** Ordering for the list: live work first, resolved last. */
const STATUS_ORDER: InitiativeStatus[] = ["active", "planned", "completed", "failed", "abandoned"];

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="progress" role="img" aria-label={`${value}% concluído`}>
      <div className="progress__fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export interface InitiativesViewProps {
  atlas: Atlas;
  /** Jump to the map with this area's level open and the area selected. */
  onOpenArea: (areaId: AreaId) => void;
  /** Jump to the map with this landmark's level open and it selected. */
  onOpenLandmark: (landmarkId: LandmarkId) => void;
}

/**
 * The second view: the guild's initiatives, independent of the live map. A
 * master list of undertakings on the left; the selected one's detail — progress,
 * outcome, affected regions, related places and sibling initiatives — on the
 * right. Regions and places deep-link back to the map.
 */
export function InitiativesView({ atlas, onOpenArea, onOpenLandmark }: InitiativesViewProps) {
  const guild = atlas.guild();
  const initiatives = [...atlas.world.initiatives].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      b.progress - a.progress ||
      a.name.localeCompare(b.name),
  );

  const [selectedId, setSelectedId] = useState<InitiativeId | null>(initiatives[0]?.id ?? null);
  const selected = selectedId ? atlas.initiative(selectedId) : undefined;

  return (
    <div className="app__body app__body--initiatives">
      <aside className="initiatives__list">
        <div className="initiatives__eyebrow">Iniciativas · {guild?.name ?? "Guilda"}</div>
        {initiatives.length === 0 && (
          <div className="panel__empty">Nenhuma iniciativa registrada.</div>
        )}
        {initiatives.map((init) => {
          const meta = STATUS_META[init.status];
          return (
            <button
              type="button"
              key={init.id}
              className={"init-card" + (init.id === selected?.id ? " init-card--active" : "")}
              onClick={() => setSelectedId(init.id)}
            >
              <div className="init-card__head">
                <span className="init-card__name">{init.name}</span>
                <span className="chip" style={{ borderColor: meta.color, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              {init.summary && <div className="init-card__summary">{init.summary}</div>}
              <div className="init-card__foot">
                <ProgressBar value={init.progress} color={meta.color} />
                <span className="init-card__pct">{init.progress}%</span>
              </div>
            </button>
          );
        })}
      </aside>

      {selected ? (
        <InitiativeDetail
          key={selected.id}
          atlas={atlas}
          initiative={selected}
          guildColor={guild?.color ?? "#888"}
          onSelectInitiative={setSelectedId}
          onOpenArea={onOpenArea}
          onOpenLandmark={onOpenLandmark}
        />
      ) : (
        <div className="app__panel">
          <div className="panel__empty">Selecione uma iniciativa para ver os detalhes.</div>
        </div>
      )}
    </div>
  );
}

function InitiativeDetail({
  atlas,
  initiative,
  guildColor,
  onSelectInitiative,
  onOpenArea,
  onOpenLandmark,
}: {
  atlas: Atlas;
  initiative: Initiative;
  guildColor: string;
  onSelectInitiative: (id: InitiativeId) => void;
  onOpenArea: (areaId: AreaId) => void;
  onOpenLandmark: (landmarkId: LandmarkId) => void;
}) {
  const meta = STATUS_META[initiative.status];
  const guild = atlas.guild();

  const areas = initiative.areaIds
    .map((id) => atlas.area(id))
    .filter((a): a is NonNullable<typeof a> => a !== undefined);
  const landmarks = initiative.landmarkIds
    .map((id) => atlas.world.landmarks.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined);
  const related = initiative.relatedInitiativeIds
    .map((id) => atlas.initiative(id))
    .filter((i): i is Initiative => i !== undefined);
  const levelName = (levelId: string) =>
    atlas.world.levels.find((l) => l.id === levelId)?.name ?? levelId;

  return (
    <div className="initiatives__detail app__panel">
      <div className="panel__eyebrow">Iniciativa · {guild?.name ?? "Guilda"}</div>
      <h2 className="panel__title">
        <span className="init-detail__swatch" style={{ background: guildColor }} />
        {initiative.name}
      </h2>
      {initiative.summary && <p className="panel__desc">{initiative.summary}</p>}

      <div className="init-detail__status">
        <span className="chip" style={{ borderColor: meta.color, color: meta.color }}>
          {meta.label}
        </span>
        <span className="init-detail__pct">{initiative.progress}%</span>
      </div>
      <ProgressBar value={initiative.progress} color={meta.color} />

      {initiative.outcome && (
        <>
          <div className="panel__section-title">Desfecho</div>
          <p className="panel__field">{initiative.outcome}</p>
        </>
      )}

      {areas.length > 0 && (
        <>
          <div className="panel__section-title">Regiões afetadas</div>
          {areas.map((area) => (
            <button
              type="button"
              className="init-link"
              key={area.id}
              onClick={() => onOpenArea(area.id)}
            >
              <span className="init-link__name">{area.name}</span>
              <span className="init-link__sub">{levelName(area.levelId)} ↗</span>
            </button>
          ))}
        </>
      )}

      {landmarks.length > 0 && (
        <>
          <div className="panel__section-title">Locais relacionados</div>
          {landmarks.map((lm) => {
            const style = landmarkStyle(lm.category);
            return (
              <button
                type="button"
                className="init-link"
                key={lm.id}
                onClick={() => onOpenLandmark(lm.id)}
              >
                <span className="init-link__name">
                  <span style={{ marginRight: 6 }}>{style.glyph}</span>
                  {lm.name}
                </span>
                <span className="init-link__sub">{levelName(lm.levelId)} ↗</span>
              </button>
            );
          })}
        </>
      )}

      {related.length > 0 && (
        <>
          <div className="panel__section-title">Iniciativas relacionadas</div>
          {related.map((rel) => {
            const relMeta = STATUS_META[rel.status];
            return (
              <button
                type="button"
                className="init-link"
                key={rel.id}
                onClick={() => onSelectInitiative(rel.id)}
              >
                <span className="init-link__name">{rel.name}</span>
                <span className="init-link__sub" style={{ color: relMeta.color }}>
                  {relMeta.label}
                </span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

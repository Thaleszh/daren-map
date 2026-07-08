import type { Atlas } from "@/domain/selectors";
import type { Area } from "@/domain/schema";
import { landmarkStyle } from "@/map/landmarkStyle";
import { CLASS_META, occupationColor } from "@/map/socialStyle";
import { InfluenceBar } from "./InfluenceBar";
import { DemographicBar } from "./DemographicBar";
import { ShareBar } from "./ShareBar";

/** Detail panel for a selected area: influence breakdown, district info, initiatives. */
export function AreaPanel({ atlas, area }: { atlas: Atlas; area: Area }) {
  const standings = atlas.standings(area.id);
  const initiatives = atlas.initiativesAffectingArea(area.id);
  const guild = atlas.guild();
  const events = atlas.world.chronicle
    .filter((e) => e.areaIds.includes(area.id))
    .sort((a, b) => b.sortKey - a.sortKey);

  // District-wide detail (the DLC "por bairro" template), shown for any slice.
  const district = area.districtId ? atlas.district(area.districtId) : undefined;
  const districtSlices = area.districtId ? atlas.areasInDistrict(area.districtId) : [];
  const districtStandings =
    area.districtId && districtSlices.length > 1
      ? atlas.districtStandings(area.districtId)
      : [];
  const npcs = area.districtId ? atlas.npcsInDistrict(area.districtId) : [];
  const districtLandmarks = area.districtId ? atlas.landmarksInDistrict(area.districtId) : [];
  const demographics = area.districtId ? atlas.demographics(area.districtId) : undefined;

  return (
    <div className="app__panel" key={area.id}>
      <div className="panel__eyebrow">
        {district ? district.name : "Área"}
        {districtSlices.length > 1 && ` · nível ${districtSlices.findIndex((s) => s.id === area.id) + 1}/${districtSlices.length}`}
      </div>
      <h2 className="panel__title">{area.name}</h2>
      {(area.description || district?.description) && (
        <p className="panel__desc">{area.description || district?.description}</p>
      )}

      <div className="panel__section-title">Controle neste nível (fatia de influência)</div>
      <InfluenceBar standings={standings} />

      <div style={{ marginTop: 12 }}>
        {standings.length === 0 && (
          <div className="panel__empty">Nenhuma presença de facção registrada aqui.</div>
        )}
        {standings.map((s) => (
          <div className="standing" key={s.faction.id}>
            <span className="standing__swatch" style={{ background: s.faction.color }} />
            <div>
              <div
                className={
                  "standing__name" + (s.faction.isPlayerOrg ? " standing__name--player" : "")
                }
              >
                {s.faction.name}
                {s.faction.infoUrl && (
                  <a
                    className="standing__info"
                    href={s.faction.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Mais sobre ${s.faction.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </a>
                )}
              </div>
              {s.note && <div className="standing__sub">{s.note}</div>}
            </div>
            <div className="standing__stats">
              <div className="standing__share">{Math.round(s.share * 100)}%</div>
              <div className="standing__power">
                pow {s.power} · inf {s.influence}
              </div>
            </div>
          </div>
        ))}
      </div>

      {districtStandings.length > 0 && district && (
        <>
          <div className="panel__section-title">
            {district.name} — controle em todos os {districtSlices.length} níveis
          </div>
          <InfluenceBar standings={districtStandings} />
          <div style={{ marginTop: 12 }}>
            {districtStandings.map((s) => (
              <div className="standing" key={s.faction.id}>
                <span className="standing__swatch" style={{ background: s.faction.color }} />
                <div>
                  <div
                    className={
                      "standing__name" +
                      (s.faction.isPlayerOrg ? " standing__name--player" : "")
                    }
                  >
                    {s.faction.name}
                  </div>
                </div>
                <div className="standing__stats">
                  <div className="standing__share">{Math.round(s.share * 100)}%</div>
                  <div className="standing__power">
                    pow {s.power} · inf {s.influence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {demographics && (
        <>
          <div className="panel__section-title">População</div>
          <DemographicBar demographics={demographics} />
          {district && district.classes.length > 0 && (
            <>
              <div className="panel__subtitle">Classe social</div>
              <ShareBar
                items={district.classes.map((c) => ({
                  label: CLASS_META[c.class].label,
                  color: CLASS_META[c.class].color,
                  share: c.share,
                }))}
              />
            </>
          )}
          {district && district.occupations.length > 0 && (
            <>
              <div className="panel__subtitle">Ocupação</div>
              <ShareBar
                items={district.occupations.map((o) => ({
                  label: o.occupation,
                  color: occupationColor(o.occupation),
                  share: o.share,
                }))}
              />
            </>
          )}
        </>
      )}

      {district &&
        (district.demographics ||
          district.qualityOfLife ||
          district.history.length > 0 ||
          district.events.length > 0 ||
          district.relations.length > 0 ||
          district.rumors.length > 0) && (
          <>
            <div className="panel__section-title">Sobre o bairro</div>
            {district.demographics && (
              <p className="panel__field">
                <b>Demografia.</b> {district.demographics}
              </p>
            )}
            {district.qualityOfLife && (
              <p className="panel__field">
                <b>Qualidade de vida.</b> {district.qualityOfLife}
              </p>
            )}
            {district.history.length > 0 && (
              <ul className="panel__list">
                {district.history.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
            {district.events.length > 0 && (
              <>
                <div className="panel__subtitle">Eventos</div>
                {district.events.map((ev, i) => (
                  <p className="panel__field" key={i}>
                    <b>{ev.name}.</b> {ev.description}
                  </p>
                ))}
              </>
            )}
            {district.relations.length > 0 && (
              <>
                <div className="panel__subtitle">Relações</div>
                <ul className="panel__list">
                  {district.relations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            )}
            {district.rumors.length > 0 && (
              <>
                <div className="panel__subtitle">Rumores</div>
                <ul className="panel__list panel__list--rumor">
                  {district.rumors.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

      {npcs.length > 0 && (
        <>
          <div className="panel__section-title">Pessoas</div>
          {npcs.map((n) => {
            const faction = n.factionId ? atlas.faction(n.factionId) : undefined;
            return (
              <div className="standing" key={n.id}>
                <span
                  className="standing__swatch"
                  style={{ background: faction?.color ?? "#6b7488" }}
                />
                <div>
                  <div className="standing__name">{n.name}</div>
                  {n.role && <div className="standing__sub">{n.role}</div>}
                  {n.description && <div className="standing__sub">{n.description}</div>}
                </div>
                <div />
              </div>
            );
          })}
        </>
      )}

      {districtLandmarks.length > 0 && (
        <>
          <div className="panel__section-title">Marcos do bairro</div>
          {districtLandmarks.map((lm) => {
            const style = landmarkStyle(lm.category);
            return (
              <div className="standing" key={lm.id}>
                <span className="standing__swatch" style={{ background: style.color }} />
                <div>
                  <div className="standing__name">
                    <span style={{ marginRight: 6 }}>{style.glyph}</span>
                    {lm.name}
                  </div>
                  {lm.description && <div className="standing__sub">{lm.description}</div>}
                </div>
                <div />
              </div>
            );
          })}
        </>
      )}

      {initiatives.length > 0 && (
        <>
          <div className="panel__section-title">Iniciativas da guilda aqui</div>
          {initiatives.map((init) => (
            <div className="standing" key={init.id}>
              <span
                className="standing__swatch"
                style={{ background: guild?.color ?? "#888" }}
              />
              <div>
                <div className="standing__name">{init.name}</div>
                {init.summary && <div className="standing__sub">{init.summary}</div>}
              </div>
              <div className="standing__stats">
                <span className="chip">{init.status}</span>
                <div className="standing__power">{init.progress}%</div>
              </div>
            </div>
          ))}
        </>
      )}

      {events.length > 0 && (
        <>
          <div className="panel__section-title">Crônica</div>
          {events.map((e) => (
            <div className="standing" key={e.id} style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <div className="standing__name">{e.title}</div>
                <div className="standing__sub">
                  {e.date} — {e.body}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

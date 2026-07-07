import type { Atlas } from "@/domain/selectors";
import type { Landmark } from "@/domain/schema";
import { landmarkStyle } from "@/map/landmarkStyle";

/** Detail panel for a selected landmark (point of interest). */
export function LandmarkPanel({ atlas, landmark }: { atlas: Atlas; landmark: Landmark }) {
  const style = landmarkStyle(landmark.category);
  const district = landmark.districtId ? atlas.district(landmark.districtId) : undefined;
  const faction = landmark.factionId ? atlas.faction(landmark.factionId) : undefined;

  return (
    <div className="app__panel" key={landmark.id}>
      <div className="panel__eyebrow" style={{ color: style.color }}>
        {style.glyph} {style.label}
        {district && ` · ${district.name}`}
      </div>
      <h2 className="panel__title">{landmark.name}</h2>
      {landmark.description && <p className="panel__desc">{landmark.description}</p>}

      {faction && (
        <>
          <div className="panel__section-title">Facção associada</div>
          <div className="standing">
            <span className="standing__swatch" style={{ background: faction.color }} />
            <div>
              <div className="standing__name">{faction.name}</div>
              {faction.description && <div className="standing__sub">{faction.description}</div>}
            </div>
            <div />
          </div>
        </>
      )}
    </div>
  );
}

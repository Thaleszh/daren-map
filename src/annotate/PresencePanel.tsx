import type { Atlas } from "@/domain/selectors";
import type { AreaId, FactionId } from "@/domain/ids";
import type { Faction } from "@/domain/schema";
import type { useAnnotations } from "./useAnnotations";

/** Generated/file factions overlaid with session edits + additions, by id. */
export function mergedFactions(atlas: Atlas, session: Faction[]): Faction[] {
  const map = new Map<string, Faction>();
  for (const f of atlas.world.factions) map.set(f.id as string, f);
  for (const f of session) map.set(f.id as string, f);
  return [...map.values()];
}

interface PresencePanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
  selectedAreaId: string | null;
}

const MIN = 0;
const MAX = 20;
const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n));

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= MIN}>
        −
      </button>
      <span className="stepper__val">{value}</span>
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= MAX}>
        +
      </button>
    </span>
  );
}

export function PresencePanel({ atlas, ann, selectedAreaId }: PresencePanelProps) {
  if (!selectedAreaId) {
    return (
      <>
        <div className="panel__section-title">Influência & poder</div>
        <p className="annot-note">
          Clique numa área do mapa para editar as facções presentes nela.
        </p>
      </>
    );
  }

  const area = atlas.area(selectedAreaId as AreaId);
  const overrides = ann.annotations.presence;

  // Current value = working override if any, else the generated/file value.
  function current(factionId: string): { influence: number; power: number; overridden: boolean } {
    const w = overrides.find((p) => p.areaId === selectedAreaId && p.factionId === factionId);
    if (w) return { influence: w.influence, power: w.power, overridden: true };
    const g = atlas.world.presence.find(
      (p) => p.areaId === selectedAreaId && p.factionId === factionId,
    );
    return { influence: g?.influence ?? 0, power: g?.power ?? 0, overridden: false };
  }

  return (
    <>
      <div className="panel__section-title">Influência & poder — {area?.name ?? "área"}</div>
      <p className="annot-note">
        Influência é relativa (participação = influência ÷ total da área). Poder é absoluto. 0–20.
        Zere ambos para remover uma facção da área.
      </p>

      <div className="presence-head">
        <span />
        <span>Infl.</span>
        <span>Poder</span>
      </div>

      {mergedFactions(atlas, ann.annotations.factions).map((f) => {
        const { influence, power, overridden } = current(f.id as string);
        const write = (infl: number, pow: number) =>
          ann.setPresence(selectedAreaId, f.id as FactionId, infl, pow);
        return (
          <div className={"presence-row" + (overridden ? " presence-row--edited" : "")} key={f.id}>
            <div className="presence-row__name">
              <span className="standing__swatch" style={{ background: f.color }} />
              {f.name}
            </div>
            <Stepper value={influence} onChange={(n) => write(n, power)} />
            <Stepper value={power} onChange={(n) => write(influence, n)} />
          </div>
        );
      })}
    </>
  );
}

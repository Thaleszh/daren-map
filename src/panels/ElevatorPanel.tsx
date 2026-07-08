import type { Atlas } from "@/domain/selectors";
import type { Elevator } from "@/domain/schema";
import type { LevelId } from "@/domain/ids";

interface ElevatorPanelProps {
  atlas: Atlas;
  elevator: Elevator;
  currentLevelId: LevelId;
  onGoToLevel: (levelId: LevelId) => void;
}

/** Detail panel for a selected elevator: the levels it reaches ("acessos"),
 *  in depth order, with the current level marked and the others clickable. */
export function ElevatorPanel({ atlas, elevator, currentLevelId, onGoToLevel }: ElevatorPanelProps) {
  // Order the shaft's stops top-to-bottom (surface first) using level depth.
  const stops = atlas
    .levels()
    .filter((l) => elevator.levelIds.includes(l.id));

  return (
    <div className="app__panel" key={elevator.id}>
      <div className="panel__eyebrow elevator-panel__eyebrow">⇅ Elevador</div>
      <h2 className="panel__title">{elevator.name}</h2>
      {elevator.note && <p className="panel__desc">{elevator.note}</p>}

      <div className="panel__section-title">Acessos ({stops.length} níveis)</div>
      <ul className="access-list">
        {stops.map((l) => {
          const here = l.id === currentLevelId;
          return (
            <li key={l.id}>
              <button
                type="button"
                className={"access-row" + (here ? " access-row--current" : "")}
                onClick={here ? undefined : () => onGoToLevel(l.id)}
                disabled={here}
              >
                <span className="access-row__name">{l.name}</span>
                <span className="access-row__tag">{here ? "aqui" : "ir →"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

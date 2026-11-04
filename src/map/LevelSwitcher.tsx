import type { Level } from "@/domain/schema";
import type { LevelId } from "@/domain/ids";

interface LevelSwitcherProps {
  levels: readonly Level[];
  currentId: LevelId;
  onSelect: (id: LevelId) => void;
  /** The region map is a second map beside the city levels, not a level itself. */
  regionActive?: boolean;
  onSelectRegion?: () => void;
}

/** Vertical floor selector, ordered surface-down by depth. */
export function LevelSwitcher({
  levels,
  currentId,
  onSelect,
  regionActive = false,
  onSelectRegion,
}: LevelSwitcherProps) {
  return (
    <nav className="levels" aria-label="City levels">
      {levels.map((lvl) => (
        <button
          key={lvl.id}
          type="button"
          className={
            "levels__btn" + (!regionActive && lvl.id === currentId ? " levels__btn--active" : "")
          }
          onClick={() => onSelect(lvl.id)}
          title={lvl.name}
        >
          <span className="levels__depth">{lvl.depth === 0 ? "S" : `−${lvl.depth}`}</span>
          <span className="levels__name">{lvl.name}</span>
        </button>
      ))}
      {onSelectRegion && (
        <>
          <div className="levels__sep" role="separator" />
          <button
            type="button"
            className={"levels__btn" + (regionActive ? " levels__btn--active" : "")}
            onClick={onSelectRegion}
            title="Mapa da região"
          >
            <span className="levels__depth">◎</span>
            <span className="levels__name">Região</span>
          </button>
        </>
      )}
    </nav>
  );
}

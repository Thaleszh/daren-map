import { useMemo, useState } from "react";
import { loadWorld, WorldIntegrityError } from "@/domain/world";
import { Atlas } from "@/domain/selectors";
import type { Area, Landmark } from "@/domain/schema";
import type { AreaId, LandmarkId, LevelId } from "@/domain/ids";
import { worldData } from "@/data/world";
import { LevelSwitcher } from "@/map/LevelSwitcher";
import { MapView } from "@/map/MapView";
import { AreaPanel } from "@/panels/AreaPanel";
import { LandmarkPanel } from "@/panels/LandmarkPanel";
import { DemographicBar } from "@/panels/DemographicBar";
import { AnnotateMode } from "@/annotate/AnnotateMode";

export function App() {
  // Load + validate once. If the data is broken, show the errors instead of a
  // blank screen — the whole point of the integrity checker.
  const loaded = useMemo(() => {
    try {
      return { atlas: new Atlas(loadWorld(worldData)), error: null as string | null };
    } catch (err) {
      const msg =
        err instanceof WorldIntegrityError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      return { atlas: null, error: msg };
    }
  }, []);

  const [mode, setMode] = useState<"view" | "annotate">("view");
  const [levelId, setLevelId] = useState<LevelId | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<LandmarkId | null>(null);

  if (loaded.error || !loaded.atlas) {
    return (
      <div className="app">
        <div className="app__header">
          <span className="app__title">Daren — erro de dados</span>
        </div>
        <pre style={{ padding: 20, whiteSpace: "pre-wrap", color: "#e88" }}>{loaded.error}</pre>
      </div>
    );
  }

  const atlas = loaded.atlas;
  const levels = atlas.levels();
  const level = levels.find((l) => l.id === levelId) ?? levels[0]!;
  const selectedArea = selectedAreaId !== null ? atlas.area(selectedAreaId) : undefined;
  const selectedLandmark =
    selectedLandmarkId !== null
      ? atlas.world.landmarks.find((l) => l.id === selectedLandmarkId)
      : undefined;

  function handleSelectLevel(id: LevelId) {
    setLevelId(id);
    setSelectedAreaId(null);
    setSelectedLandmarkId(null);
  }
  function handleSelectArea(area: Area) {
    setSelectedAreaId(area.id);
    setSelectedLandmarkId(null);
  }
  function handleSelectLandmark(lm: Landmark) {
    setSelectedLandmarkId(lm.id);
    setSelectedAreaId(null);
  }

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title">{atlas.world.meta.city}</span>
        <span className="app__subtitle">Atlas da Cidade · {atlas.world.meta.playerOrg}</span>
        <button
          type="button"
          className="app__mode"
          onClick={() => setMode((m) => (m === "view" ? "annotate" : "view"))}
        >
          {mode === "view" ? "Anotar mapa" : "← Atlas"}
        </button>
      </header>

      {mode === "annotate" ? (
        <AnnotateMode atlas={atlas} onExit={() => setMode("view")} />
      ) : (
        <div className="app__body">
          <LevelSwitcher levels={levels} currentId={level.id} onSelect={handleSelectLevel} />
          <MapView
            atlas={atlas}
            level={level}
            selectedAreaId={selectedAreaId}
            selectedLandmarkId={selectedLandmarkId}
            onSelectArea={handleSelectArea}
            onSelectLandmark={handleSelectLandmark}
          />
          {selectedLandmark ? (
            <LandmarkPanel atlas={atlas} landmark={selectedLandmark} />
          ) : selectedArea ? (
            <AreaPanel atlas={atlas} area={selectedArea} />
          ) : (
            <div className="app__panel">
              <div className="panel__eyebrow">{level.name}</div>
              <h2 className="panel__title">{level.name}</h2>
              {level.blurb && <p className="panel__desc">{level.blurb}</p>}
              <div className="panel__section-title">População de Daren</div>
              <DemographicBar demographics={atlas.cityDemographics()} />
              <div className="panel__empty" style={{ marginTop: 16 }}>
                Selecione uma área ou um marco no mapa para inspecioná-lo.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { loadWorld, WorldIntegrityError } from "@/domain/world";
import { Atlas } from "@/domain/selectors";
import type { Area, Elevator, Landmark } from "@/domain/schema";
import type { AreaId, ElevatorId, LandmarkId, LevelId } from "@/domain/ids";
import { worldData } from "@/data/world";
import { parseHash, serializeHash, type Selection, type ViewMode } from "@/urlState";
import { LevelSwitcher } from "@/map/LevelSwitcher";
import { MapView } from "@/map/MapView";
import { AreaPanel } from "@/panels/AreaPanel";
import { LandmarkPanel } from "@/panels/LandmarkPanel";
import { ElevatorPanel } from "@/panels/ElevatorPanel";
import { DemographicBar } from "@/panels/DemographicBar";
import { InitiativesView } from "@/initiatives/InitiativesView";
import { FontStyleSelect } from "@/FontStyleSelect";
import { ErrorBoundary } from "@/ErrorBoundary";

// Annotating is a dev-only GM activity: the save endpoint only exists under
// `npm run dev` (see saveAnnotationsPlugin). Lazy + DEV-gated so the whole
// annotate tree is dead-code-eliminated from the production bundle.
const AnnotateMode = import.meta.env.DEV
  ? lazy(() => import("@/annotate/AnnotateMode").then((m) => ({ default: m.AnnotateMode })))
  : null;

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

  // Seed initial state from the URL hash so a refresh / shared link restores the
  // view. Annotate is dev-only, so a persisted "annotate" falls back when the
  // editor isn't available (production).
  const initial = useMemo(() => {
    const s = parseHash(typeof window === "undefined" ? "" : window.location.hash);
    if (s.mode === "annotate" && !AnnotateMode) s.mode = "view";
    return s;
  }, []);

  const [mode, setMode] = useState<ViewMode>(initial.mode);
  const [levelId, setLevelId] = useState<LevelId | null>(initial.levelId);
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId | null>(
    initial.selection?.type === "area" ? initial.selection.id : null,
  );
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<LandmarkId | null>(
    initial.selection?.type === "landmark" ? initial.selection.id : null,
  );
  const [selectedElevatorId, setSelectedElevatorId] = useState<ElevatorId | null>(
    initial.selection?.type === "elevator" ? initial.selection.id : null,
  );

  // Mirror state → URL (replaceState, so clicking around doesn't spam history)
  // and apply external hash changes (back/forward, hand-edited/opened links).
  useEffect(() => {
    const selection: Selection = selectedAreaId
      ? { type: "area", id: selectedAreaId }
      : selectedLandmarkId
        ? { type: "landmark", id: selectedLandmarkId }
        : selectedElevatorId
          ? { type: "elevator", id: selectedElevatorId }
          : null;
    const hash = serializeHash({ mode, levelId, selection });
    if (hash !== window.location.hash) {
      const url = hash || window.location.pathname + window.location.search;
      window.history.replaceState(null, "", url);
    }
  }, [mode, levelId, selectedAreaId, selectedLandmarkId, selectedElevatorId]);

  useEffect(() => {
    function onHashChange() {
      const s = parseHash(window.location.hash);
      setMode(s.mode === "annotate" && !AnnotateMode ? "view" : s.mode);
      setLevelId(s.levelId);
      setSelectedAreaId(s.selection?.type === "area" ? s.selection.id : null);
      setSelectedLandmarkId(s.selection?.type === "landmark" ? s.selection.id : null);
      setSelectedElevatorId(s.selection?.type === "elevator" ? s.selection.id : null);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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
  const selectedElevator =
    selectedElevatorId !== null
      ? atlas.world.elevators.find((e) => e.id === selectedElevatorId)
      : undefined;

  function handleSelectLevel(id: LevelId) {
    setLevelId(id);
    setSelectedAreaId(null);
    setSelectedLandmarkId(null);
    setSelectedElevatorId(null);
  }
  function handleSelectArea(area: Area) {
    setSelectedAreaId(area.id);
    setSelectedLandmarkId(null);
    setSelectedElevatorId(null);
  }
  function handleSelectLandmark(lm: Landmark) {
    setSelectedLandmarkId(lm.id);
    setSelectedAreaId(null);
    setSelectedElevatorId(null);
  }
  function handleSelectElevator(e: Elevator) {
    setSelectedElevatorId(e.id);
    setSelectedAreaId(null);
    setSelectedLandmarkId(null);
  }
  // Jump to another level the elevator reaches, keeping it selected across the trip.
  function handleGoToLevel(id: LevelId) {
    setLevelId(id);
  }
  // Deep-links from the initiatives view: open the map on the target and select it.
  function openAreaOnMap(areaId: AreaId) {
    const area = atlas.area(areaId);
    if (!area) return;
    setMode("view");
    setLevelId(area.levelId);
    setSelectedAreaId(areaId);
    setSelectedLandmarkId(null);
    setSelectedElevatorId(null);
  }
  function openLandmarkOnMap(landmarkId: LandmarkId) {
    const lm = atlas.world.landmarks.find((l) => l.id === landmarkId);
    if (!lm) return;
    setMode("view");
    setLevelId(lm.levelId);
    setSelectedLandmarkId(landmarkId);
    setSelectedAreaId(null);
    setSelectedElevatorId(null);
  }

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title">{atlas.world.meta.city}</span>
        <span className="app__subtitle">Atlas da Cidade · {atlas.world.meta.playerOrg}</span>
        <nav className="app__nav">
          <button
            type="button"
            className={"app__nav-btn" + (mode === "view" ? " app__nav-btn--active" : "")}
            onClick={() => setMode("view")}
          >
            Atlas
          </button>
          <button
            type="button"
            className={"app__nav-btn" + (mode === "initiatives" ? " app__nav-btn--active" : "")}
            onClick={() => setMode("initiatives")}
          >
            Iniciativas
          </button>
        </nav>
        <FontStyleSelect />
        {AnnotateMode && (
          <button
            type="button"
            className="app__mode"
            onClick={() => setMode((m) => (m === "annotate" ? "view" : "annotate"))}
          >
            {mode === "annotate" ? "← Atlas" : "Anotar mapa"}
          </button>
        )}
      </header>

      {/* key={mode} lets a crash in one view clear itself when you switch views. */}
      <ErrorBoundary key={mode}>
      {AnnotateMode && mode === "annotate" ? (
        <Suspense fallback={<div className="app__body">Carregando editor…</div>}>
          <AnnotateMode atlas={atlas} onExit={() => setMode("view")} />
        </Suspense>
      ) : mode === "initiatives" ? (
        <InitiativesView
          atlas={atlas}
          onOpenArea={openAreaOnMap}
          onOpenLandmark={openLandmarkOnMap}
        />
      ) : (
        <div className="app__body">
          <LevelSwitcher levels={levels} currentId={level.id} onSelect={handleSelectLevel} />
          <MapView
            atlas={atlas}
            level={level}
            selectedAreaId={selectedAreaId}
            selectedLandmarkId={selectedLandmarkId}
            selectedElevatorId={selectedElevatorId}
            onSelectArea={handleSelectArea}
            onSelectLandmark={handleSelectLandmark}
            onSelectElevator={handleSelectElevator}
          />
          {selectedElevator ? (
            <ElevatorPanel
              atlas={atlas}
              elevator={selectedElevator}
              currentLevelId={level.id}
              onGoToLevel={handleGoToLevel}
            />
          ) : selectedLandmark ? (
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
      </ErrorBoundary>
    </div>
  );
}

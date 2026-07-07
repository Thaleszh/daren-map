import { useCallback, useEffect, useState } from "react";
import type { Atlas } from "@/domain/selectors";
import type { Landmark, LandmarkCategory, Point } from "@/domain/schema";
import type { LevelId } from "@/domain/ids";
import rawAnnotations from "@/data/annotations.json";
import type { WorkingAnnotations } from "@/domain/annotations";
import { LevelSwitcher } from "@/map/LevelSwitcher";
import { useAnnotations, type NewLandmark } from "./useAnnotations";
import { AnnotateView } from "./AnnotateView";
import { AnnotatePanel } from "./AnnotatePanel";

export type AnnotateTool = "select" | "polygon" | "landmark";

export interface LandmarkForm {
  name: string;
  category: LandmarkCategory;
  districtId: string;
  factionId: string;
  description: string;
}

const emptyForm: LandmarkForm = {
  name: "",
  category: "other",
  districtId: "",
  factionId: "",
  description: "",
};

export function AnnotateMode({ atlas, onExit }: { atlas: Atlas; onExit: () => void }) {
  const levels = atlas.levels();
  const ann = useAnnotations(rawAnnotations as WorkingAnnotations);

  const [levelId, setLevelId] = useState<LevelId>(levels[0]!.id);
  const [tool, setTool] = useState<AnnotateTool>("select");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [workingPolygon, setWorkingPolygon] = useState<Point[]>([]);
  const [pending, setPending] = useState<Point | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [form, setForm] = useState<LandmarkForm>(emptyForm);

  const level = levels.find((l) => l.id === levelId) ?? levels[0]!;

  const commitPolygon = useCallback(() => {
    if (selectedAreaId && workingPolygon.length >= 3) {
      ann.setPolygon(selectedAreaId, workingPolygon);
      setWorkingPolygon([]);
    }
  }, [ann, selectedAreaId, workingPolygon]);

  // Keyboard shortcuts while tracing a polygon.
  useEffect(() => {
    if (tool !== "polygon") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitPolygon();
      } else if (e.key === "Escape") {
        setWorkingPolygon([]);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setWorkingPolygon((pts) => pts.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, commitPolygon]);

  function selectLevel(id: LevelId) {
    setLevelId(id);
    setWorkingPolygon([]);
    setPending(null);
    setSelectedAreaId(null);
    setSelectedLandmarkId(null);
  }

  function selectTool(next: AnnotateTool) {
    setTool(next);
    setWorkingPolygon([]);
    setPending(null);
    setSelectedLandmarkId(null);
    setMovingId(null);
    setForm(emptyForm);
  }

  function onMapClick(p: Point) {
    if (movingId) {
      ann.updateLandmark(movingId, { position: p });
      setMovingId(null);
    } else if (tool === "polygon" && selectedAreaId) {
      setWorkingPolygon((pts) => [...pts, p]);
    } else if (tool === "landmark") {
      setPending(p);
      setSelectedLandmarkId(null);
      setForm(emptyForm);
    }
  }

  function onSelectArea(areaId: string) {
    setSelectedAreaId(areaId);
    // Load an existing polygon so it can be redone; else start fresh.
    setWorkingPolygon(ann.annotations.polygons?.[areaId] ?? []);
  }

  function onSelectLandmark(lm: Landmark) {
    setSelectedLandmarkId(lm.id);
    setMovingId(null);
    setPending(null);
    setForm({
      name: lm.name,
      category: lm.category,
      districtId: lm.districtId ?? "",
      factionId: lm.factionId ?? "",
      description: lm.description,
    });
  }

  function buildLandmark(): NewLandmark | null {
    if (!form.name.trim()) return null;
    const position = selectedLandmarkId
      ? ann.annotations.landmarks?.find((l) => l.id === selectedLandmarkId)?.position
      : pending;
    if (!position) return null;
    const lm: NewLandmark = {
      levelId: level.id,
      name: form.name.trim(),
      category: form.category,
      position,
      description: form.description,
    };
    if (form.districtId) lm.districtId = form.districtId as NewLandmark["districtId"];
    if (form.factionId) lm.factionId = form.factionId as NewLandmark["factionId"];
    return lm;
  }

  function submitLandmark() {
    const lm = buildLandmark();
    if (!lm) return;
    if (selectedLandmarkId) ann.updateLandmark(selectedLandmarkId, lm);
    else ann.addLandmark(lm);
    setPending(null);
    setSelectedLandmarkId(null);
    setForm(emptyForm);
  }

  return (
    <div className="app__body app__body--annotate">
      <LevelSwitcher levels={levels} currentId={level.id} onSelect={selectLevel} />
      <AnnotateView
        atlas={atlas}
        level={level}
        annotations={ann.annotations}
        tool={tool}
        moving={movingId !== null}
        selectedAreaId={selectedAreaId}
        workingPolygon={workingPolygon}
        pending={pending}
        selectedLandmarkId={selectedLandmarkId}
        onMapClick={onMapClick}
        onSelectArea={onSelectArea}
        onSelectLandmark={onSelectLandmark}
      />
      <AnnotatePanel
        atlas={atlas}
        level={level}
        ann={ann}
        tool={tool}
        onSelectTool={selectTool}
        selectedAreaId={selectedAreaId}
        onSelectArea={onSelectArea}
        workingPolygon={workingPolygon}
        onCommitPolygon={commitPolygon}
        onClearWorking={() => setWorkingPolygon([])}
        pending={pending}
        form={form}
        onFormChange={setForm}
        selectedLandmarkId={selectedLandmarkId}
        moving={movingId !== null}
        onStartMove={() => setMovingId(selectedLandmarkId)}
        onSubmitLandmark={submitLandmark}
        onSelectLandmark={onSelectLandmark}
        onCancelLandmark={() => {
          setPending(null);
          setSelectedLandmarkId(null);
          setMovingId(null);
          setForm(emptyForm);
        }}
        onExit={onExit}
      />
    </div>
  );
}

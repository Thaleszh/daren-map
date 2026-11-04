import { useCallback, useState } from "react";
import { parseRegionData, type RegionMarker } from "@/domain/region";
import raw from "@/data/region-markers.json";

export type RegionSaveState = "idle" | "saving" | "saved" | "error";

/**
 * Region markers, owned by App so edits survive switching to a city level and
 * back. In dev every change is written straight to `region-markers.json` (the
 * `/__save-region` endpoint); in a production build the file is read-only data.
 */
export function useRegionMarkers() {
  const [markers, setMarkers] = useState<RegionMarker[]>(() => parseRegionData(raw).markers);
  const [saveState, setSaveState] = useState<RegionSaveState>("idle");

  const update = useCallback((next: RegionMarker[]) => {
    setMarkers(next);
    if (!import.meta.env.DEV) return;
    setSaveState("saving");
    fetch("/__save-region", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markers: next }),
    })
      .then((res) => setSaveState(res.ok ? "saved" : "error"))
      .catch(() => setSaveState("error"));
  }, []);

  return { markers, update, saveState };
}

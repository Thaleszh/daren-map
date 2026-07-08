import type { AreaId, ElevatorId, InitiativeId, LandmarkId, LevelId } from "@/domain/ids";

/**
 * The shareable view state, encoded in the URL hash so a refresh restores where
 * you were and a GM can paste a link to a specific area/level. Pure string ⇄
 * state functions live here (no `window`) so they're unit-testable; App owns the
 * `window.location`/`hashchange` wiring.
 *
 * Format: `#view=initiatives` · `#level=l1&sel=area:centro-s`. The default
 * (atlas view, default level, nothing selected) serializes to an empty hash.
 * The `sel` slot is mode-scoped: area/landmark/elevator in the atlas, initiative
 * in the initiatives view — `view` disambiguates which the id belongs to.
 */
export type Selection =
  | { type: "area"; id: AreaId }
  | { type: "landmark"; id: LandmarkId }
  | { type: "elevator"; id: ElevatorId }
  | { type: "initiative"; id: InitiativeId }
  | null;

export type ViewMode = "view" | "initiatives" | "annotate";

export interface ViewState {
  mode: ViewMode;
  levelId: LevelId | null;
  selection: Selection;
}

const MODES = new Set<ViewMode>(["view", "initiatives", "annotate"]);
const SEL_TYPES = new Set(["area", "landmark", "elevator", "initiative"]);

export function parseHash(hash: string): ViewState {
  const params = new URLSearchParams(hash.replace(/^#\/?/, ""));

  const modeParam = params.get("view") ?? "view";
  const mode: ViewMode = MODES.has(modeParam as ViewMode) ? (modeParam as ViewMode) : "view";

  const levelId = (params.get("level") || null) as LevelId | null;

  let selection: Selection = null;
  const sel = params.get("sel");
  if (sel) {
    const idx = sel.indexOf(":");
    const type = idx >= 0 ? sel.slice(0, idx) : "";
    const id = idx >= 0 ? sel.slice(idx + 1) : "";
    if (id && SEL_TYPES.has(type)) {
      selection = { type, id } as Selection;
    }
  }

  return { mode, levelId, selection };
}

export function serializeHash(state: ViewState): string {
  const params = new URLSearchParams();
  if (state.mode !== "view") params.set("view", state.mode);
  if (state.levelId) params.set("level", state.levelId);
  if (state.selection) params.set("sel", `${state.selection.type}:${state.selection.id}`);
  const s = params.toString();
  return s ? `#${s}` : "";
}

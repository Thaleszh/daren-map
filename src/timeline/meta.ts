import type { TimelineKind } from "@/domain/schema";

/** Per-kind label + color (colors carried over from the original Aeon timeline). */
export const KIND_META: Record<TimelineKind, { label: string; color: string }> = {
  mission: { label: "Missão", color: "#ebcd24" },
  "side-mission": { label: "Missão paralela", color: "#bd2b2f" },
  meeting: { label: "Reunião", color: "#835bc0" },
  festivity: { label: "Festividade", color: "#2ec994" },
  season: { label: "Estação", color: "#007efb" },
};

export const KIND_ORDER = Object.keys(KIND_META) as TimelineKind[];

/** The moon isn't an event kind (it is derived from the date) but gets a filter-style toggle. */
export const MOON_COLOR = "#c9c4e8";

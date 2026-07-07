import type { LandmarkCategory } from "@/domain/schema";

/** Per-category display: label (pt-BR), marker color, and a short glyph. */
export const LANDMARK_CATEGORIES: ReadonlyArray<{
  key: LandmarkCategory;
  label: string;
  color: string;
  glyph: string;
}> = [
  { key: "military", label: "Militar", color: "#b23b3b", glyph: "⚔" },
  { key: "religious", label: "Religioso", color: "#d8c33a", glyph: "✦" },
  { key: "civic", label: "Cívico", color: "#3f7fb0", glyph: "⬢" },
  { key: "commerce", label: "Comércio", color: "#48a67a", glyph: "⬥" },
  { key: "culture", label: "Cultura", color: "#d066a0", glyph: "♪" },
  { key: "noble", label: "Nobreza", color: "#c9a24b", glyph: "♛" },
  { key: "danger", label: "Perigo", color: "#d9663f", glyph: "⚠" },
  { key: "other", label: "Outro", color: "#9aa3b8", glyph: "◆" },
];

const BY_KEY = new Map(LANDMARK_CATEGORIES.map((c) => [c.key, c]));

export function landmarkStyle(category: LandmarkCategory) {
  return BY_KEY.get(category) ?? LANDMARK_CATEGORIES[LANDMARK_CATEGORIES.length - 1]!;
}

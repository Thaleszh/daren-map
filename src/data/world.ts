import type { WorldInput } from "@/domain/schema";
import { mergeAnnotations, type Annotations } from "@/domain/annotations";
import generated from "./world.generated.json";
import annotations from "./annotations.json";

/**
 * The Daren world data = PSD-generated geometry + hand annotations.
 *
 * `world.generated.json` is produced by `scripts/generate-world.mjs` from the
 * PSD metadata + faction roster + influence seed. `annotations.json` holds the
 * hand-traced polygons and landmarks from the in-app annotate tool. They are
 * merged here and validated together by `loadWorld`, so the cast is only to
 * hand raw JSON to the Zod parser — any drift is caught at runtime, loudly.
 *
 * Do NOT hand-edit the generated file for structural changes — edit the
 * generator and re-run:
 *   node scripts/extract-levels.mjs && node scripts/generate-world.mjs
 */
export const worldData: WorldInput = mergeAnnotations(
  generated as unknown as WorldInput,
  annotations as Annotations,
);

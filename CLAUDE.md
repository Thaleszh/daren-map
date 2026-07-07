# CLAUDE.md

Guidance for working in this repository.

## Shell

Use the **Bash** tool for general shell commands (POSIX `sh` syntax). **Exception: `npm` segfaults under Git Bash on this machine — always run `npm`/`npx`/`node` via PowerShell.** File and content searches should still use the dedicated tools.

## What this is

`daren-front` — a React + TypeScript + Vite single-page app that renders an interactive, multi-level "city atlas" for the tabletop world of **Daren**. It shows factions' influence and power across areas of a city, level by level (surface down through excavated layers), with pan/zoom, per-area inspection panels, elevators connecting levels, projects, and a chronicle log.

There is no backend. All world data is a static, hand-authored literal validated at load time.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build (static export)
npm run preview    # preview the production build
npm run typecheck  # tsc -b --noEmit
```

There is no test runner or linter configured. `npm run typecheck` is the primary correctness gate. For data changes, `node scripts/validate-world.mjs` runs the real `loadWorld()` (Zod + integrity) over the generated data + annotations — catches data problems without opening a browser.

## Architecture

- **`src/domain/`** — the model, framework-free.
  - `ids.ts` — branded id types (`AreaId`, `LevelId`, `FactionId`, …).
  - `schema.ts` — **the single source of truth.** Zod schemas; all types are `z.infer`'d from them. There is no separate hand-written interface. Change the schema, not a parallel type.
  - `world.ts` — `loadWorld()`: Zod parse (shapes) **then** referential-integrity checks (the cross-reference graph). Throws `WorldIntegrityError` listing every problem. Fails loud at load rather than rendering a half-broken map.
  - `selectors.ts` — `Atlas`, an indexed read-only wrapper over a validated `World`. Derived views (control `share`, `standings`, `dominant`, centroids) are **computed on demand, never stored**.
    - `districts.ts` concept: a *bairro* (District) may span several levels; each level holds one Area **slice** of it (`Area.districtId`). `Atlas.districtStandings` rolls influence up across all slices; `Atlas.standings` is per-slice.
- **`src/data/`** — `world.generated.json` is the world content (see Data pipeline); `world.ts` imports and re-exports it as `worldData`. `psd-metadata.json` is the raw PSD-harvested coordinates.
- **`src/map/`** — `MapView` (SVG + react-zoom-pan-pinch, hosts the lens selector), `AreaShape` (renders a traced polygon *or*, until one exists, a marker+label; polygon fills are **inset** via `insetPolygon` so base boundary lines show through), `LevelSwitcher`. `lenses.ts` defines the map coloring modes (`areaFill` → solid tint or proportional `segments` for the contested lens); `raceStyle.ts` / `socialStyle.ts` hold demographic palettes.
- **`src/panels/`** — `AreaPanel` (per-slice standings, district rollup, population by race/class/occupation, DLC district detail, NPCs, landmarks), `InfluenceBar`, `DemographicBar` (race counts), `ShareBar` (class/occupation shares).
- **`src/App.tsx`** — loads/validates the world once in a `useMemo`; on failure renders the error text instead of the map.

Path alias: `@/` → `src/` (see `vite.config.ts` and `tsconfig`).

## Data pipeline

The world is **generated from the Photoshop source**, not hand-authored. In `photoshop/Danren city.psd`, each level is a group (`Superficie`, `-1`…`-6`) containing an `Occlusion`+`Layer -N` base, a `Bairros` group (outline drawing + per-district text labels), and an `Elevadores` group (one marker per shaft). Two scripts (run via PowerShell) turn that into app data:

1. `node scripts/extract-levels.mjs` — composites each level **without** the text/elevator layers → `public/levels/level-N.png` (clean bases), and harvests elevator centers + district label anchors → `src/data/psd-metadata.json`.
2. `node scripts/generate-world.mjs` — joins that metadata with the district registry, faction roster, and lore-grounded influence seed (all inline in the script) → `src/data/world.generated.json`.

So: **structural/geometry edits belong in the PSD or the generator scripts, then re-run both.** These all live inline in `generate-world.mjs`: the faction roster (`FACTIONS`), the influence seed (`PRESENCE`), district one-liners (`DISTRICT_META`), the DLC per-bairro content (`DISTRICT_DLC` — demographics, quality-of-life, history, events, relations, rumors, from `docs/DLC Daren.pdf`), the NPC roster (`NPCS`), and population (`POPULATION` — relative weights scaled to ~130k, plus absolute minority headcounts; humans are the remainder, computed in `Atlas.demographics`). `scripts/inspect-psd.mjs` dumps a PSD's layer tree; `scripts/seed-landmarks.mjs` seeds landmarks from district anchors.

### Annotations (polygons + landmarks)

Two things are authored by hand, in the in-app **annotate tool** (`src/annotate/`), and kept in `src/data/annotations.json` so re-generating the world never clobbers them:

- **Area polygons** — traced over each district; until traced, an area renders as an anchor marker.
- **Landmarks** — named points of interest (`Landmark` in the schema), category-colored.

`src/data/world.ts` merges `annotations.json` onto the generated world (`mergeAnnotations`) before `loadWorld` validates everything together. The annotate tool (toggle "Anotar mapa" in the header) writes `annotations.json` directly via a **dev-only** endpoint (`saveAnnotationsPlugin` in `vite.config.ts`, POST `/__save-annotations`) — so annotating requires `npm run dev`. Working state is also mirrored to `localStorage`. `scripts/preview-level.mjs <slug> <out>` renders a level (base + elevators + area labels + annotations) to a PNG for quick visual checks without a browser.

## Conventions

- **Data model changes go through Zod in `schema.ts`.** Types flow from the schema; don't hand-write interfaces alongside it.
- **Influence vs. power:** `influence` is *relative* (control share = a faction's influence ÷ total influence in the area); `power` is *absolute* (shown as-is). Both are integers 0–20.
- **Derived data stays derived** — compute in `selectors.ts`, don't add it to the stored schema.
- When you add a cross-reference between entities, add the matching integrity check in `loadWorld`.
- Match the existing code's comment style: short, explains *why*, not *what*.

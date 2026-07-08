# CLAUDE.md

Guidance for working in this repository.

## Shell

Use the **Bash** tool for general shell commands (POSIX `sh` syntax). **Exception: `npm` segfaults under Git Bash on this machine — always run `npm`/`npx`/`node` via PowerShell.** File and content searches should still use the dedicated tools.

## What this is

`daren-front` — a React + TypeScript + Vite single-page app that renders an interactive, multi-level "city atlas" for the tabletop world of **Daren**. It shows factions' influence and power across areas of a city, level by level (surface down through excavated layers), with pan/zoom, per-area inspection panels, elevators connecting levels, a second **Iniciativas** view (guild initiatives that affect regions, track progress toward an outcome, and link to related places/initiatives — see `src/initiatives/`), and a chronicle log.

There is no backend. All world data is static and validated at load time — most of it **generated** from a Photoshop source (see [Data pipeline](#data-pipeline)), with area polygons and landmarks layered on by hand. New to the code? Start at `src/domain/schema.ts` (the data model) and `src/App.tsx` (the entry point).

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build (static export)
npm run preview    # preview the production build
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint . (flat config, src/ only)
npm test           # vitest run (unit tests, one pass)
npm run test:watch # vitest in watch mode
```

`npm run typecheck`, `npm run lint`, and `npm test` are the correctness gates — all three (plus `validate-world`) run in CI (`.github/workflows/ci.yml`) on every PR/push and gate the Pages deploy. ESLint (`eslint.config.js`) is scoped to `src/` and carries the two classic hook rules (`rules-of-hooks`, `exhaustive-deps`) — not the v7 React-Compiler memoization rules, which this project doesn't use. **Vitest** covers the framework-free `src/domain/` logic — unit tests live beside their source as `*.test.ts` (e.g. `world.test.ts`, `selectors.test.ts`, `snap.test.ts`, `annotations.test.ts`), and `src/domain/world.fixture.ts` builds a small referentially-valid `WorldInput` that tests clone and mutate. Config is `vitest.config.ts` (node environment, `@` alias mirrored from Vite); test files + fixtures are excluded from the app build (`tsconfig.app.json`) and typechecked via `tsconfig.test.json`. For data changes, `node scripts/validate-world.mjs` runs the real `loadWorld()` (Zod + integrity) over the generated data + annotations — catches data problems without opening a browser.

## Architecture

- **`src/domain/`** — the model, framework-free.
  - `ids.ts` — branded id types (`AreaId`, `LevelId`, `FactionId`, …).
  - `schema.ts` — **the single source of truth.** Zod schemas; all types are `z.infer`'d from them. There is no separate hand-written interface. Change the schema, not a parallel type.
  - `world.ts` — `loadWorld()`: Zod parse (shapes) **then** referential-integrity checks (the cross-reference graph). Throws `WorldIntegrityError` listing every problem. Fails loud at load rather than rendering a half-broken map.
  - `annotations.ts` — `AnnotationsSchema` (hand-traced polygons + landmarks) and `mergeAnnotations()`, which layers them onto the generated world *before* validation. Kept separate so re-generating from the PSD never clobbers manual work.
  - `selectors.ts` — `Atlas`, an indexed read-only wrapper over a validated `World`. Derived views (control `share`, `standings`, `dominant`, centroids) are **computed on demand, never stored**.
    - `districts.ts` concept: a *bairro* (District) may span several levels; each level holds one Area **slice** of it (`Area.districtId`). `Atlas.districtStandings` rolls influence up across all slices; `Atlas.standings` is per-slice.
- **`src/data/`** — `world.generated.json` is the world content (see Data pipeline); `world.ts` imports and re-exports it as `worldData`. `psd-metadata.json` is the raw PSD-harvested coordinates.
- **`src/map/`** — `MapView` (SVG + react-zoom-pan-pinch, hosts the map stage), `AreaShape` (renders a traced polygon *or*, until one exists, a marker+label; polygon fills are **inset** via `insetPolygon` so base boundary lines show through), `LevelSwitcher`. **Display options** live in a gear popover, `MapSettings`, which edits the persisted `MapPrefs` (`mapPrefs.ts` — lens, focus faction, texture style, street network, elevators, parchment; guarded on load); persistence is `usePersistentState` in `src/prefs.ts` (localStorage-backed, validated). Marker visibility is deliberately *not* persisted — it's a live quick-toggle next to the gear. `lenses.ts` defines the map coloring modes (`areaFill` → solid tint or proportional `segments` for the contested lens); `raceStyle.ts` / `socialStyle.ts` hold demographic palettes. **City texture** (`cityscape.ts` + `CityTexture`): an optional per-area procedural cityscape drawn under the lens tint, off by default, built in two passes. First, a **street network** (`streets.ts`) carves the area polygon into *blocks* — three selectable strategies (`StreetNetwork`): `grid` (a rotated lattice warped by value noise), `subdivision` (recursive quarter splits), `voronoi` (a Voronoi tiling of blue-noise sites). Then **frontage packing** fills each block with rows of little houses that face the street, leaving a gutter that reads as a road. Two paint treatments only (ink / rooftops) — they draw the *same* geometry. Shared polygon math is in `geometry.ts`. Geometry is **deterministic** — seeded on the stable area id (value noise runs off a separate stream so warping never perturbs building jitter) — and density (how packed a district builds out) comes from district population over polygon area, normalized level-locally via `areaDensities`. A house's `rank` grows with its depth into the block, and density is a *nested-subset filter* over that fixed superset (`visibleBuildings`): a small population change only peels back or fills in the inner rows at the margin — it never restructures the streets. **Freezing:** `node scripts/seed-cityscape.mjs <slug|all> [network]` bakes render-ready geometry into `src/data/cityscapes.json` (a *sparse* override loaded by `cityscapeStore.ts`); a baked area renders that frozen geometry verbatim (immune to later algorithm/population changes), an unbaked one generates live. Kept out of the domain/`World` schema on purpose — a cityscape is a rendering concern, not world data. `scripts/preview-cityscape.mjs <style> <slug> <out> [network]` rasterizes a style+network to a PNG (browser-free).
- **`src/panels/`** — `AreaPanel` (per-slice standings, district rollup, population by race/class/occupation, DLC district detail, NPCs, landmarks), `InfluenceBar`, `DemographicBar` (race counts), `ShareBar` (class/occupation shares).
- **`src/App.tsx`** — loads/validates the world once in a `useMemo`; on failure renders the error text instead of the map. View state (mode/level/selection) is mirrored to the URL hash via `src/urlState.ts` (pure, unit-tested `parseHash`/`serializeHash`; App owns the `window`/`hashchange` wiring) so refreshes and shared links restore the view. The mode-switched body is wrapped in `src/ErrorBoundary.tsx` so a render crash degrades to a message instead of a blank page (data errors are still caught up front by `loadWorld`).

Path alias: `@/` → `src/` (see `vite.config.ts` and `tsconfig`).

## Data pipeline

The world is **generated from the Photoshop source**, not hand-authored. In `photoshop/Danren city.psd`, each level is a group (`Superficie`, `-1`…`-6`) containing an `Occlusion`+`Layer -N` base, a `Bairros` group (outline drawing + per-district text labels), and an `Elevadores` group (one marker per shaft). Two scripts (run via PowerShell) turn that into app data:

1. `node scripts/extract-levels.mjs` — composites each level **without** the text/elevator layers → `public/levels/level-N.png` (clean bases), and harvests elevator centers + district label anchors → `src/data/psd-metadata.json`.
2. `node scripts/generate-world.mjs` — joins that metadata with the district registry, faction roster, and lore-grounded influence seed (all inline in the script) → `src/data/world.generated.json`.

So: **structural/geometry edits belong in the PSD or the generator scripts, then re-run both.** These all live inline in `generate-world.mjs`: the faction roster (`FACTIONS`), the influence seed (`PRESENCE`), district one-liners (`DISTRICT_META`), the DLC per-bairro content (`DISTRICT_DLC` — demographics, quality-of-life, history, events, relations, rumors, from `docs/DLC Daren.pdf`), the NPC roster (`NPCS`), and population (`POPULATION` — relative weights scaled to ~130k, plus absolute minority headcounts; humans are the remainder, computed in `Atlas.demographics`). `scripts/inspect-psd.mjs` dumps a PSD's layer tree; `scripts/seed-landmarks.mjs` seeds landmarks from district anchors.

### Annotations (polygons + landmarks)

Several things are authored by hand, in the in-app **annotate tool** (`src/annotate/`), and kept in `src/data/annotations.json` so re-generating the world never clobbers them. Each tool is a mode in the annotate toolbar:

- **Area polygons** — traced over each district; until traced, an area renders as an anchor marker. The tracer supports drag-to-move / click-edge-to-insert / Alt+click-to-delete vertices, a rubber-band cursor line, and a traced-count readout (`AnnotateView`). **Frontier snapping** (`domain/snap.ts`): a new/dragged vertex within `SNAP_RADIUS` of another area's vertex or edge on the same level locks onto it (green ring = the snap target), so districts that share a border share the exact coordinate. `node scripts/weld-polygons.mjs [tolerance]` welds already-traced levels the same way — clusters near-coincident vertices in `annotations.json` in place (counts preserved, coords nudged ≤ tolerance); it's idempotent. Welding only fixes near-miss frontiers, not large structural overlaps (two zones traced over the same ground) — re-trace those.
- **Landmarks** — named points of interest (`Landmark`), category-colored, placed on the map.
- **NPCs** (`NpcPanel`) — panel-only "Pessoas"; never a map marker. Add new, or edit/revert a generated one.
- **Faction roster** (`FactionPanel`) — add a faction, or rename/recolor/edit an existing one. Deletion is blocked while a faction is referenced (presence/npc/landmark); exactly-one-player-org is preserved (`isPlayerOrg` isn't editable here).
- **Presence** (`PresencePanel`) — pick an area on the map, then set each faction's influence/power (0–20 steppers). This is the live GM loop that recolors the map.
- **Cidade** (`CityscapePanel` + `useCityscapes`) — freeze/hand-edit an area's city texture. Pick an area, **Gerar** to bake the procedural cityscape into an editable record, then drag a building to nudge it, click the map to add one, Alt+click to remove. Saves to the **separate** `cityscapes.json` (not annotations — a cityscape is a rendering concern), so it has its own Save bar and its own dev endpoint. Building drag/add reuses `useBuildingEditing` (the tracer analogue) and `svgCoords.ts`. Equivalent CLI: `scripts/seed-cityscape.mjs`.

Of the map tools, presence/npc/faction are **overrides**: an annotation entry replaces its generated counterpart by id (or by `(area, faction)` for presence) or adds a new one — see `mergeAnnotations` in `domain/annotations.ts`. `src/data/world.ts` merges `annotations.json` onto the generated world before `loadWorld` validates everything together. The annotate tool (toggle "Anotar mapa" in the header) writes its files directly via **dev-only** endpoints — `saveJsonPlugin` in `vite.config.ts` registers `POST /__save-annotations` (→ `annotations.json`) and `POST /__save-cityscapes` (→ `cityscapes.json`) — so annotating requires `npm run dev`. `scripts/preview-level.mjs <slug> <out>` renders a level (base + elevators + area labels + annotations) to a PNG for quick visual checks without a browser; `scripts/preview-lens.mjs <lens> <slug> <out>` does the same for a specific map lens.

## Conventions

- **Data model changes go through Zod in `schema.ts`.** Types flow from the schema; don't hand-write interfaces alongside it.
- **Influence vs. power:** `influence` is *relative* (control share = a faction's influence ÷ total influence in the area); `power` is *absolute* (shown as-is). Both are integers 0–20.
- **Derived data stays derived** — compute in `selectors.ts`, don't add it to the stored schema.
- When you add a cross-reference between entities, add the matching integrity check in `loadWorld`.
- Match the existing code's comment style: short, explains *why*, not *what*.

# Prototypes — village / city generation R&D

Design spikes for a **rewrite** of the procedural city texture (the feature that
lives on this `cityscape` branch). These are throwaway research artifacts, **not**
wired into the app or the build — they exist to lock the *look* and the algorithm
before porting into `src/`.

## `village-generation-lab.html`

A self-contained interactive lab (no build, no deps — open it in a browser).
Generates a whole **level** at once and lets you tune it live.

The model it settled on, layered:

1. **Locked skeleton** — a ring-road + main-road graph. Mains reach the wall
   **gates** on the surface, or the **elevator shafts** underground (core is
   optional; underground levels have no centre). Curves come from the rings
   following the boundary plus an angle-varied "swirl", never from domain-warp.
2. **Subzones → parcels** — each sector between mains/rings is subdivided into
   small parcels, separated by a local street grid.
3. **Random occupation per parcel** — each parcel is filled with a pattern:
   a **D-block** (a ring of houses around an interior loop road, open on the
   side facing the adjacent street) or a **grid mesh**. Extensible: add cases in
   `fillParcel`.
4. **Per-district character** — districts drive green space (fields/groves vs
   housing); e.g. Rebanhos/Eco read as pasture.

Real Daren data is embedded (surface level 0 + underground level −4: district
polygons, elevator anchors, the Forte citadel).

## `render-preview.mjs`

Browser-free rasteriser used to iterate on the lab: it re-implements the
generator and draws it to PNG via `@napi-rs/canvas` (full-level + zoomed crops),
so the geometry can be inspected without a browser. Run via **PowerShell**
(`node prototypes/render-preview.mjs`) — output PNGs go to `%TEMP%`. It carries
its own copy of the generator; the HTML lab is the source of truth.

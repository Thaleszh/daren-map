// Re-exports the real rendering functions so preview-lens.mjs can bundle and
// exercise them (verifies inset + lens fills without a browser).
export { loadWorld } from "@/domain/world";
export { Atlas, insetPolygon, centroid } from "@/domain/selectors";
export { areaFill, lensContext, gradientStops } from "@/map/lenses";
export { worldData } from "@/data/world";

import type { WorldInput } from "./schema";

/**
 * A small, referentially-valid world for tests. Two levels of one district
 * ("centro"), a second surface-only district ("porto"), three factions (one of
 * them the player org), and presence that makes control shares easy to reason
 * about. Deep-cloned per call so a test can mutate it freely.
 *
 * Geometry note: `centro-s` is a unit square (area 1, centroid 0.5,0.5) so
 * centroid/inset tests have exact expected values.
 */
export function makeWorld(): WorldInput {
  const world: WorldInput = {
    meta: { city: "Daren", playerOrg: "Sem Cores" },
    levels: [
      {
        id: "surface",
        name: "Superfície",
        depth: 0,
        image: "s.png",
        viewBox: { width: 100, height: 100 },
      },
      { id: "l1", name: "-1", depth: 1, image: "l1.png", viewBox: { width: 100, height: 100 } },
    ],
    districts: [
      {
        id: "centro",
        name: "Centro",
        population: 1000,
        races: [
          { race: "dwarf", count: 100 },
          { race: "elf", count: 50 },
        ],
      },
      { id: "porto", name: "Porto", population: 200, races: [] },
    ],
    areas: [
      {
        id: "centro-s",
        levelId: "surface",
        districtId: "centro",
        name: "Centro (superfície)",
        polygon: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      },
      {
        id: "centro-l1",
        levelId: "l1",
        districtId: "centro",
        name: "Centro (-1)",
        labelAnchor: { x: 10, y: 10 },
      },
      {
        id: "porto-s",
        levelId: "surface",
        districtId: "porto",
        name: "Porto",
        labelAnchor: { x: 80, y: 80 },
      },
    ],
    factions: [
      { id: "coroa", name: "Coroa", color: "#ff0000" },
      { id: "guilda", name: "Guilda", color: "#00ff00" },
      { id: "semcores", name: "Sem Cores", color: "#0000ff", isPlayerOrg: true },
    ],
    presence: [
      // centro-s: Coroa 6, Guilda 2 → shares 0.75 / 0.25.
      { factionId: "coroa", areaId: "centro-s", influence: 6, power: 10 },
      { factionId: "guilda", areaId: "centro-s", influence: 2, power: 4 },
      // centro-l1: Guilda dominates.
      { factionId: "guilda", areaId: "centro-l1", influence: 4, power: 3 },
    ],
    landmarks: [],
    npcs: [
      { id: "npc-1", name: "Regente", districtId: "centro", factionId: "coroa" },
      { id: "npc-2", name: "Andarilho" },
    ],
    elevators: [
      {
        id: "elev-1",
        name: "Poço Central",
        levelIds: ["surface", "l1"],
        positions: { surface: { x: 50, y: 50 }, l1: { x: 50, y: 50 } },
      },
    ],
    initiatives: [],
    chronicle: [],
  };
  return structuredClone(world);
}

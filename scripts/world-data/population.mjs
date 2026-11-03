/* ------ population: residents (scaled to ~130k) + daytime workers ----------- */
// id → { res, dwarf?, elf?, other?, cls, occ }.  Humans are the remainder.
//   res  → residential weight; scaled so residents sum to POP_TARGET across the
//          city. Low for workplace districts (a market, the water works) — few
//          people *sleep* there. The quartéis are high: the Guarda lives in barracks.
//   dwarf/elf/other → absolute minority *residents* (≤ that district's
//          residents); campaign targets: dwarves ≈ 3.2k (mostly the Depra clan
//          in the Eco), elves < 1k, others < 1k.
//   cls → social-class shares of residents.
//   occ → absolute daytime headcount per occupation (people who work there, may
//          live elsewhere); the district's workforce is their sum. Categories
//          follow the worker factions / Esfera groups (see OCCUPATIONS).
// About 92% of residents work by day. The Guarda is the city's largest employer
// (~28% of residents): it takes in the unemployed and puts them to every kind of
// public labour — farming corvées in the Ala Fungi, the Refúgio's debt-workers,
// works crews in the Eco.
const POP_TARGET = 130000; // total residents across the city

// Occupation labels (shown in the area panel).
const G = "Guarda", PD = "Produção", AR = "Artesanato e Minas", OB = "Obras",
  CO = "Comércio", SV = "Serviços", AD = "Administração", SA = "Saber e Magia",
  FE = "Fé", CU = "Cultura e Lazer";

const POPULATION = {
  forte: { res: 2, other: 50, cls: { trabalhadora: 0.55, elite: 0.25, media: 0.2 }, occ: { [G]: 3050, [SV]: 600, [AD]: 200 } },
  "alta-daren": { res: 4, elf: 100, cls: { elite: 0.7, media: 0.25, trabalhadora: 0.05 }, occ: { [SV]: 1350, [G]: 400, [CU]: 250, [AR]: 150, [AD]: 100 } },
  "vila-aberta": { res: 8, elf: 150, cls: { media: 0.6, trabalhadora: 0.25, elite: 0.15 }, occ: { [SV]: 2000, [CO]: 1200, [G]: 650, [CU]: 550, [AD]: 400, [AR]: 400 } },
  "campo-alto": { res: 2, elf: 100, other: 100, cls: { media: 0.5, trabalhadora: 0.4, pobre: 0.1 }, occ: { [CU]: 650, [SV]: 450, [PD]: 400, [CO]: 200, [AR]: 150, [G]: 100 } },
  brita: { res: 4, dwarf: 100, elf: 150, cls: { media: 0.6, trabalhadora: 0.3, elite: 0.1 }, occ: { [SA]: 1250, [CU]: 1250, [SV]: 750, [CO]: 400, [AD]: 300, [G]: 300, [AR]: 250 } },
  "quartel-topo": { res: 6, other: 70, cls: { trabalhadora: 0.8, media: 0.2 }, occ: { [G]: 6300, [AR]: 650 } },
  "residencial-1": { res: 14, cls: { trabalhadora: 0.7, media: 0.25, pobre: 0.05 }, occ: { [AR]: 1300, [SV]: 1050, [CO]: 650, [OB]: 400, [G]: 400 } },
  "ala-fungi": { res: 9, cls: { trabalhadora: 0.8, media: 0.15, pobre: 0.05 }, occ: { [PD]: 9200, [G]: 1050, [SV]: 550, [SA]: 300, [OB]: 300, [CU]: 250, [AR]: 250 } },
  centro: { res: 8, dwarf: 100, elf: 100, other: 100, cls: { media: 0.5, trabalhadora: 0.35, elite: 0.15 }, occ: { [SV]: 5300, [G]: 3700, [CO]: 3300, [AD]: 2600, [AR]: 1050, [OB]: 300 } },
  refugio: { res: 9, cls: { pobre: 0.8, trabalhadora: 0.2 }, occ: { [G]: 1050, [SV]: 900, [AR]: 550, [OB]: 300, [CO]: 200 } },
  "quartel-2": { res: 5, cls: { trabalhadora: 0.85, media: 0.15 }, occ: { [G]: 5250, [SV]: 400 } },
  bazar: { res: 1, other: 150, cls: { media: 0.55, trabalhadora: 0.35, pobre: 0.1 }, occ: { [CO]: 6300, [AR]: 1950, [SV]: 1300, [G]: 400, [CU]: 400 } },
  selado: { res: 7, cls: { trabalhadora: 0.6, media: 0.3, pobre: 0.1 }, occ: { [G]: 2600, [AR]: 1800, [SV]: 800, [CO]: 550, [OB]: 200 } },
  suspensao: { res: 22, elf: 100, other: 50, cls: { trabalhadora: 0.65, media: 0.25, pobre: 0.1 }, occ: { [SV]: 2650, [AR]: 2650, [CO]: 1950, [G]: 650, [CU]: 650, [OB]: 500 } },
  "quatro-ceus": { res: 4, cls: { trabalhadora: 0.45, media: 0.4, pobre: 0.15 }, occ: { [CU]: 1200, [FE]: 1050, [SV]: 550, [AR]: 200, [G]: 150, [SA]: 100 } },
  rebanhos: { res: 1, dwarf: 100, cls: { trabalhadora: 0.85, media: 0.1, pobre: 0.05 }, occ: { [PD]: 5250, [AR]: 550, [G]: 300 } },
  "quartel-selado": { res: 7, dwarf: 200, other: 80, cls: { trabalhadora: 0.85, media: 0.15 }, occ: { [G]: 8400, [AR]: 400, [SV]: 250 } },
  eco: { res: 6, dwarf: 2700, cls: { trabalhadora: 0.75, media: 0.2, elite: 0.05 }, occ: { [AR]: 5900, [G]: 2100, [OB]: 650, [CO]: 650, [SV]: 350, [AD]: 300 } },
  fundo: { res: 0.2, cls: { trabalhadora: 0.9, pobre: 0.1 }, occ: { [AR]: 450, [OB]: 200, [G]: 100 } },
};
const RES_TOTAL_WEIGHT = Object.values(POPULATION).reduce((s, p) => s + p.res, 0);

export function districtPopulation(id) {
  const p = POPULATION[id];
  if (!p) return { population: undefined, races: [], classes: [], occupations: [] };
  const residents = Math.round((p.res / RES_TOTAL_WEIGHT) * POP_TARGET);
  const population = { residents };
  const occ = Object.entries(p.occ ?? {}).sort((a, b) => b[1] - a[1]);
  const workers = occ.reduce((s, [, n]) => s + n, 0);
  if (workers > 0) population.workers = workers;
  const races = [];
  for (const race of ["dwarf", "elf", "other"]) {
    if (p[race]) races.push({ race, count: p[race] });
  }
  const classes = Object.entries(p.cls ?? {}).map(([cls, share]) => ({ class: cls, share }));
  const occupations = occ.map(([occupation, n]) => ({ occupation, share: n / workers }));
  return { population, races, classes, occupations };
}

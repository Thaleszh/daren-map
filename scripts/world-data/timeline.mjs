/* ------ timeline: events on Daren's own calendar ---------------------------- */
// Seeded from the old Aeon Timeline export (github.com/Thaleszh/daren-rpg-timeline),
// which ran from Nov 559 to Nov 560 After Siarel. Dates are in-world, not session
// dates. The source stored some events at 23:00; those are snapped to whole days
// (a 23:00 start is the next day, a 23:00 end is that same day), which also lines
// the moon phases up on a clean 14-day cycle (full on the 10th, none on the 24th).
//
// Calendar: 13 months of 28 days (Ascensão, Jan … Dec), December has 29. See
// src/domain/calendar.ts for the rules; the app re-validates every date.
const MONTH = {
  Asc: 0, Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/** d("Feb", 4) → "0560-02-04"; the year defaults to 560 (pass it first to override). */
const d = (...args) => {
  const [year, mon, day] = typeof args[0] === "number" ? args : [560, ...args];
  if (!(mon in MONTH)) throw new Error(`unknown month "${mon}"`);
  return `${String(year).padStart(4, "0")}-${String(MONTH[mon]).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// kind, title, start, end?, extras. `members` are roster names (aliases work);
// `companions` are people who aren't on the roster.
const e = (id, kind, title, start, end, extra = {}) => ({ id, kind, title, start, end, ...extra });

const missions = [
  e("tl-vigia", "mission", "Instalação do instrumento de observação", d("Feb", 4), d("Feb", 8), {
    members: ["Nivy", "Aiden", "Tristan", "Josh", "Zyra"],
    places: ["Leste", "Razef"],
    foes: ["Vrocks", "Goblins", "Encrustados", "Orcs"],
    expeditionId: "exp-vigia-magos",
  }),
  e("tl-mineracao-1", "mission", "Operação de mineração I", d("Feb", 13), d("Feb", 20), {
    members: ["Nivy", "Aiden", "Tristan", "Josh", "Zyra"],
    places: ["Oeste", "Proximidades de Ikvar", "Minas de Ikvar"],
    foes: ["Encrustados", "Lican"],
    expeditionId: "exp-escolta-mineradores",
  }),
  e("tl-irvantir", "mission", "Aberrações de Irvantir", d("Feb", 27), d("Mar", 3), {
    members: ["Aiden", "Tristan", "RhodD", "Rimut", "Brin", "Nessy"],
    places: ["Norte", "Irvantir"],
    foes: ["Esquecidos", "Humanos", "Aberrações"],
    expeditionId: "exp-aberracao-orbe",
  }),
  e("tl-caca-criancas-1", "mission", "Caça às crianças I", d("Mar", 12), d("Mar", 16), {
    members: ["Aiden", "RhodD", "Violetta", "Rimut", "Brin", "Nessy"],
    places: ["Oeste", "Proximidades de Ikvar"],
    foes: ["Lican"],
    expeditionId: "exp-criancas-raptadas",
  }),
  e("tl-ponte-patrulha-1", "mission", "Patrulha da ponte I", d("Mar", 21), d("Mar", 24), {
    members: ["Nivy", "Tristan", "Kinnan", "Josh", "Nosk"],
    places: ["Sul", "Planícies de Mafros"],
    foes: ["Vrocks", "Goblins", "Encrustados", "Orcs", "Mortos-vivos", "Olhos Verdes"],
  }),
  e("tl-ponte-patrulha-2", "mission", "Patrulha da ponte II", d("Apr", 1), d("Apr", 4), {
    members: ["Aiden", "Súre", "Josh"],
    places: ["Sul", "Planícies de Mafros"],
  }),
  e("tl-circulo-demoniaco", "mission", "Círculo demoníaco", d("Apr", 2), d("Apr", 6), {
    members: ["Tristan", "Kinnan", "RhodD", "Nosk", "Brin", "Nessy"],
    places: ["Sul", "Floresta Encantada"],
    foes: ["Orcs", "Humanos", "Demônios", "Mortos-vivos"],
    expeditionId: "exp-circulo-demoniaco",
  }),
  e("tl-ponte-assalto-1", "mission", "Assalto à ponte I", d("Apr", 14), d("Apr", 17), {
    members: ["Nivy", "Tristan", "Kinnan", "Josh", "Nosk"],
    places: ["Sul", "Planícies de Mafros"],
    foes: ["Vrocks", "Goblins", "Encrustados", "Orcs", "Mortos-vivos", "Olhos Verdes"],
  }),
  e("tl-criancas-1", "mission", "Crianças", d("Jul", 25), d("Aug", 2), {
    members: ["Kinnan", "Nosk", "Valorie", "Elan", "Zaruni"],
    places: ["Minas de Ikvar"],
    expeditionId: "exp-escolta-criancas",
  }),
  e("tl-tunel-reconhecimento", "mission", "Reconhecimento do túnel", d("Jul", 26), d("Aug", 7)),
  e("tl-forte-reconhecimento", "mission", "Reconhecimento do forte dos mortos-vivos", d("Jul", 26), d("Aug", 4)),
  e("tl-criancas-2", "mission", "Crianças (retorno)", d("Aug", 9), d("Aug", 13), {
    members: ["Kinnan", "Nosk", "Valorie", "Elan", "Zaruni"],
    places: ["Oeste", "Minas de Ikvar"],
    expeditionId: "exp-escolta-criancas",
  }),
  e("tl-tunel-sul", "mission", "Reconhecimento do túnel ao sul", d("Aug", 10), d("Aug", 18), {
    members: ["Nivy", "Aiden", "Josh", "Jorbe"],
    places: ["Leste", "Razef"],
    expeditionId: "exp-tunel-razef",
  }),
  e("tl-reuniao-pantano", "mission", "Reunião no pântano", d("Aug", 23), undefined, {
    members: ["Rimut", "Josh", "Nosk", "Valorie", "Miri"],
    places: ["Sul", "Floresta Encantada", "Pântano"],
  }),
];

const sideMissions = [
  e("tl-torre-1", "side-mission", "Caça à torre I", d("Mar", 17), d("Apr", 2), {
    members: ["Nevali"],
    companions: ["Penar Dfey", "Erwann", "Guva", "Redagi", "Natcho"],
    places: ["Leste", "Torre demoníaca"],
    foes: ["Demônios"],
  }),
  e("tl-torre-2", "side-mission", "Caça à torre II", d("Apr", 11), d("May", 21), {
    members: ["Nevali"],
    companions: ["Penar Dfey", "Erwann", "Guva", "Redagi", "Natcho", "Triva", "Ryndala", "Angelo Angro"],
    places: ["Leste", "Razef", "Torre demoníaca"],
    foes: ["Demônios"],
  }),
  e("tl-viagem-tarvos", "side-mission", "Viagem a Tarvos", d("Apr", 28), d("May", 27), {
    members: ["Tristan", "Kinnan", "RhodD"],
    places: ["Tarvos"],
  }),
];

const meetings = [
  ["tl-reuniao-1", "Reunião 1", d("Feb", 11)],
  ["tl-reuniao-2", "Reunião 2", d("Feb", 22)],
  ["tl-reuniao-3", "Reunião 3", d("Mar", 6)],
  ["tl-reuniao-4", "Reunião 4", d("Mar", 19)],
  ["tl-reuniao-5", "Reunião 5", d("Mar", 27)],
  ["tl-reuniao-6", "Reunião 6", d("Apr", 8)],
  ["tl-reuniao-7", "Reunião 7", d("Apr", 19)],
  ["tl-reuniao-t2e1", "Reunião T2 E1", d("Aug", 8)],
  ["tl-reuniao-t2e2", "Reunião T2 E2", d("Aug", 20)],
].map(([id, title, start]) => e(id, "meeting", title, start, undefined, { places: ["Daren"] }));

const festivities = [
  e("tl-solsticio-verao", "festivity", "Solstício de verão", d(559, "Dec", 28)),
  e("tl-dia-perdido-559", "festivity", "Dia Perdido", d(559, "Dec", 29), undefined, {
    summary: "O 29º dia de dezembro, fora da semana.",
  }),
  e("tl-semana-cinzas", "festivity", "Semana das Cinzas", d("Jan", 18), d("Jan", 24)),
  e("tl-dia-daren", "festivity", "Dia de Daren", d("Mar", 11), undefined, { places: ["Daren"] }),
  e("tl-torneio-siarel", "festivity", "Torneio de Siarel", d("Apr", 25), d("May", 10)),
  e("tl-aniversario-segunda-lua", "festivity", "Aniversário da Segunda Lua", d("May", 9)),
  e("tl-noite-mais-longa", "festivity", "Noite Mais Longa", d("Jun", 14)),
  e("tl-colheita", "festivity", "Colheita", d("Aug", 4), d("Aug", 6)),
  e("tl-dia-perdido-560", "festivity", "Dia Perdido", d("Dec", 29), undefined, {
    summary: "O 29º dia de dezembro, fora da semana.",
    places: ["Daren"],
  }),
];

const seasons = [
  e("tl-verao-559", "season", "Início do verão", d(559, "Nov", 11)),
  e("tl-outono-560", "season", "Início do outono", d("Jan", 18)),
  e("tl-inverno-560", "season", "Início do inverno", d("Apr", 25)),
  e("tl-primavera-560", "season", "Início da primavera", d("Aug", 4)),
  e("tl-verao-560", "season", "Início do verão", d("Nov", 11)),
];

const moons = [
  e("tl-lua-cheia-ago", "moon", "Lua cheia", d("Aug", 10)),
  e("tl-sem-lua-ago", "moon", "Sem lua", d("Aug", 24)),
  e("tl-lua-cheia-set", "moon", "Lua cheia", d("Sep", 10)),
  e("tl-sem-lua-set", "moon", "Sem lua", d("Sep", 24)),
  e("tl-lua-cheia-out", "moon", "Lua cheia", d("Oct", 10)),
  e("tl-lua-cheia-nov", "moon", "Lua cheia", d("Nov", 10)),
];

export const TIMELINE = [
  ...missions,
  ...sideMissions,
  ...meetings,
  ...festivities,
  ...seasons,
  ...moons,
].map(({ members = [], end, ...ev }) => ({
  ...ev,
  ...(end ? { end } : {}),
  members,
}));

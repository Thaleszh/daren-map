/* ------ timeline: events on Daren's own calendar ---------------------------- */
// Seeded from the old Aeon Timeline export (github.com/Thaleszh/daren-rpg-timeline),
// which ran from Nov 559 to Nov 560 After Siarel. Dates are in-world, not session
// dates. The source stored some events at 23:00; those are snapped to whole days
// (a 23:00 start is the next day, a 23:00 end is that same day), which also lines
// the moon on a clean 14-day cycle (full on the 10th, none on the 24th). The moon is
// derived from the date (calendar.ts), so the old moon markers are not carried over.
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
    expeditionId: "exp-ponte-goblins",
  }),
  e("tl-criancas-1", "mission", "Crianças", d("Jul", 25), d("Aug", 2), {
    members: ["Kinnan", "Nosk", "Valorie", "Elan", "Zaruni"],
    places: ["Minas de Ikvar"],
    expeditionId: "exp-escolta-criancas",
  }),
  e("tl-tunel-reconhecimento", "mission", "Reconhecimento do túnel", d("Jul", 26), d("Aug", 7)),
  // The forte arc was three trips: this scouting run (alongside the swamp escort), a camp, the assault.
  e("tl-forte-reconhecimento", "mission", "Reconhecimento do forte dos mortos-vivos", d("Aug", 23), d("Aug", 26), {
    places: ["Sul", "Floresta", "Forte dos mortos-vivos"],
    foes: ["Mortos-vivos"],
    expeditionId: "exp-forte-mortos-vivos",
  }),
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
  e("tl-reuniao-pantano", "mission", "Escolta do Antônio ao pântano", d("Aug", 23), d("Sep", 3), {
    members: ["Rimut", "Josh", "Nosk", "Valorie", "Miri"],
    places: ["Sul", "Floresta Encantada", "Pântano"],
    expeditionId: "exp-antonio-pantano",
  }),
  // --- everything below is estimated from the session notes; durations per the GM ---
  e("tl-capturar-encrustado", "mission", "Capturar Encrustado", d("Sep", 13), d("Sep", 16), {
    members: ["Jorbe", "Nivy", "Nosk", "Josh", "Âncora"],
    foes: ["Encrustados"],
    expeditionId: "exp-capturar-encrustado",
  }),
  // The "crianças" jobs are one expedition (exp-escolta-criancas) in the expedition log.
  e("tl-criancas-3", "mission", "Crianças (escolta final)", d("Sep", 15), d("Sep", 21), {
    members: ["RhodD", "Kaz", "Valorie", "Emeria", "Zaruni"],
    places: ["Minas de Ikvar"],
    expeditionId: "exp-escolta-criancas",
  }),
  e("tl-forte-acampamento", "mission", "Acampamento junto ao forte", d("Oct", 3), d("Oct", 16), {
    places: ["Sul", "Floresta", "Forte dos mortos-vivos"],
    foes: ["Mortos-vivos"],
    expeditionId: "exp-forte-mortos-vivos",
  }),
  e("tl-forte-assalto", "mission", "Assalto ao forte dos mortos-vivos", d("Oct", 26), d("Nov", 7), {
    members: ["Âncora", "Emeria", "Súre", "Kaz", "Patri", "Kinnan", "Zygmunt", "Nivy", "Josh", "Nosk", "Zaruni", "Valorie", "Rimut", "Miri", "Aiden", "Gael"],
    places: ["Sul", "Floresta", "Forte dos mortos-vivos"],
    foes: ["Mortos-vivos", "Orcs"],
    expeditionId: "exp-forte-mortos-vivos",
  }),
  e("tl-demonios", "mission", "Missão demônios", d("Nov", 17), d("Nov", 26), {
    members: ["Âncora", "Nosk", "Zaruni", "Kinnan", "Zygmunt", "Colliva", "Nevali"],
    places: ["Ikvar", "Caverna do Keruga"],
    foes: ["Demônios"],
    expeditionId: "exp-demonios",
  }),
  e("tl-monumento-vrock", "mission", "Missão Monumento Vrock", d("Nov", 20), d("Nov", 24), {
    members: ["Josh", "Nivy", "Emeria", "Thomas", "Aiden"],
    places: ["Rio Naufrágio", "Planícies de Mafros"],
    foes: ["Vrocks"],
    expeditionId: "exp-monumento-vrock",
  }),
  e("tl-escolta-pantano", "mission", "Escolta no pântano", d("Dec", 8), d("Dec", 21), {
    members: ["Âncora", "Emeria", "Cithria", "Nosk", "Zaruni"],
    places: ["Pântano", "Inarai"],
    foes: ["Goblins", "Orcs", "Trolls"],
    expeditionId: "exp-escolta-pantano",
  }),
  e("tl-fugitivos", "mission", "Missão dos fugitivos", d("Dec", 10), d("Dec", 17), {
    members: ["Nivy", "Kaz", "Valorie", "Rimut", "Zygmunt"],
    places: ["Montanhas", "Langris"],
    expeditionId: "exp-fugitivos",
  }),
  e("tl-carroca", "mission", "A carroça desaparecida", d(561, "Asc", 2), d(561, "Asc", 7), {
    members: ["Cithria", "Kaz", "Nevali", "Miri", "Thomas"],
    places: ["Antrus"],
    foes: ["Mortos-vivos"],
    expeditionId: "exp-carroca-desaparecida",
  }),
  e("tl-resgate-trio", "mission", "Resgate do trio", d(561, "Asc", 17), d(561, "Asc", 22), {
    members: ["Cithria", "Taarak", "Aiden", "Valorie", "Rimut"],
    places: ["Montanhas", "Vila dos Kalppi"],
    foes: ["Yetis"],
    expeditionId: "exp-resgate-trio",
  }),
  e("tl-caravana-sudeste", "mission", "Resgate da caravana no sudeste", d(561, "Asc", 19), d(561, "Asc", 23), {
    members: ["Josh", "Nosk", "Nevali", "Miri", "Thomas"],
    places: ["Sudeste", "Cidade murada"],
    expeditionId: "exp-caravana-sudeste",
  }),
  e("tl-irvantir-exploracao", "mission", "Exploração de Irvantir", d(561, "Jan", 26), d(561, "Feb", 9), {
    members: ["RhodD", "Emeria", "Âncora", "Aiden", "Taarak"],
    places: ["Leste", "Irvantir", "Iruzitar"],
    foes: ["Encrustados"],
    expeditionId: "exp-irvantir",
  }),
  e("tl-pioneiros-frutas", "mission", "Pioneiros das Frutas do Leste", d(561, "Feb", 19), d(561, "Mar", 5), {
    members: ["Thomas", "Kaz", "Cithria", "Zaruni", "Nevali", "Josh"],
    places: ["Leste", "Floresta dos homens baixos"],
    expeditionId: "exp-pioneiros-frutas",
  }),
  e("tl-arco-iris", "mission", "Arco-íris", d(561, "Mar", 15), d(561, "Mar", 19), {
    members: ["Josh", "Miri", "Nosk", "Valorie", "Nevali"],
    places: ["Cevaral"],
    expeditionId: "exp-arco-iris",
  }),
  e("tl-escolinha-guarda", "mission", "Escolinha da guarda", d(561, "Mar", 17), d(561, "Mar", 26), {
    members: ["Thomas", "Elan", "Edochi", "Draco", "Mayari"],
    places: ["Floresta Encantada"],
    expeditionId: "exp-escolinha-guarda",
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
  ["tl-reuniao-t2e3", "Reunião T2 E3", d("Sep", 6)],
  ["tl-reuniao-t2e4", "Reunião T2 E4", d("Sep", 24)],
  ["tl-reuniao-t2e5", "Reunião T2 E5", d("Oct", 19)],
  ["tl-reuniao-t2e6", "Reunião T2 E6", d("Nov", 10)],
  ["tl-reuniao-t2e7", "Reunião T2 E7", d("Dec", 1)],
  ["tl-reuniao-t2e8", "Reunião T2 E8", d("Dec", 24)],
  ["tl-reuniao-t2e9", "Reunião T2 E9", d(561, "Asc", 10)],
  ["tl-reuniao-t2e10", "Reunião T2 E10", d(561, "Asc", 26)],
  ["tl-reuniao-t2e11", "Reunião T2 E11", d(561, "Feb", 12)],
  ["tl-reuniao-t2e12", "Reunião T2 E12", d(561, "Mar", 8)],
  ["tl-reuniao-t2e13", "Reunião T2 E13", d(561, "Apr", 1)],
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
  // 561 repeats the yearly festivities.
  e("tl-semana-cinzas-561", "festivity", "Semana das Cinzas", d(561, "Jan", 18), d(561, "Jan", 24)),
  e("tl-dia-daren-561", "festivity", "Dia de Daren", d(561, "Mar", 11), undefined, { places: ["Daren"] }),
  e("tl-torneio-siarel-561", "festivity", "Torneio de Siarel", d(561, "Apr", 25), d(561, "May", 10)),
  e("tl-aniversario-segunda-lua-561", "festivity", "Aniversário da Segunda Lua", d(561, "May", 9)),
  e("tl-noite-mais-longa-561", "festivity", "Noite Mais Longa", d(561, "Jun", 14)),
  e("tl-colheita-561", "festivity", "Colheita", d(561, "Aug", 4), d(561, "Aug", 6)),
  e("tl-dia-perdido-561", "festivity", "Dia Perdido", d(561, "Dec", 29), undefined, {
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
  e("tl-outono-561", "season", "Início do outono", d(561, "Jan", 18)),
  e("tl-inverno-561", "season", "Início do inverno", d(561, "Apr", 25)),
  e("tl-primavera-561", "season", "Início da primavera", d(561, "Aug", 4)),
  e("tl-verao-561", "season", "Início do verão", d(561, "Nov", 11)),
];

export const TIMELINE = [
  ...missions,
  ...sideMissions,
  ...meetings,
  ...festivities,
  ...seasons,
].map(({ members = [], end, ...ev }) => ({
  ...ev,
  ...(end ? { end } : {}),
  members,
}));

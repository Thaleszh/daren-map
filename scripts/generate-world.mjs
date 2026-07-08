// Generates src/data/world.generated.json from the PSD-extracted metadata,
// a district registry, a faction roster, and a lore-grounded influence seed.
//
// Re-run after extract-levels.mjs whenever the PSD changes:
//   node scripts/extract-levels.mjs && node scripts/generate-world.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(
  readFileSync(join(root, "src", "data", "psd-metadata.json"), "utf8"),
);

/* ------ levels: depth ranges & blurbs from the worldbuilding doc ---------- */
const LEVELS = [
  { slug: "level-0", name: "Superfície", depth: 0, blurb: "+100 a −50 m. A face exposta de Daren: Forte, Alta Daren, Vila Aberta, Campo Alto, Brita e Quartel do Topo." },
  { slug: "level-1", name: "Nível 1", depth: 1, blurb: "−200 a −500 m. Residencial Um, Ala Fungi e parte da Brita." },
  { slug: "level-2", name: "Nível 2", depth: 2, blurb: "−500 a −700 m. Centro, Refúgio, Ala Fungi e o Quartel Nível 2." },
  { slug: "level-3", name: "Nível 3", depth: 3, blurb: "−700 a −850 m. Centro, Bazar, Ala Fungi, Selado, Suspensão e os Quatro Céus." },
  { slug: "level-4", name: "Nível 4", depth: 4, blurb: "−850 a −1000 m. Selado, Quatro Céus, os Rebanhos e o Quartel Selado." },
  { slug: "level-5", name: "Nível 5", depth: 5, blurb: "−1000 a −1200 m. Selado, Quartel Selado, Rebanhos e o Eco." },
  { slug: "level-6", name: "Nível 6 — O Fundo", depth: 6, blurb: "−1200 a −1500 m. O Fundo e o Eco: esgoto, forja e calor." },
];

/* ------ districts: normalize PSD label text → canonical district ---------- */
// raw PSD label (cleaned) → { id, name }
const DISTRICT_OF = {
  "Vila Aberta": ["vila-aberta", "Vila Aberta"],
  "Quartel do Topo": ["quartel-topo", "Quartel do Topo"],
  "Brita": ["brita", "Bairro da Brita"],
  "Alta Daren": ["alta-daren", "Alta Daren"],
  "Forte": ["forte", "O Forte"],
  "Campo Alto": ["campo-alto", "Campo Alto"],
  "Residencial Um": ["residencial-1", "Residencial Um"],
  "Ala fungi": ["ala-fungi", "Ala Fungi"],
  "Quartel Nv Dois": ["quartel-2", "Quartel Nível 2"],
  "Centro": ["centro", "Centro"],
  "Refugio": ["refugio", "Refúgio"],
  "Bairro Selado": ["selado", "Bairro Selado"],
  "Quartel Selado": ["quartel-selado", "Quartel Selado"],
  "Quatro Céus": ["quatro-ceus", "Quatro Céus"],
  "Bazar": ["bazar", "Bazar"],
  "Bazar // Eco": ["eco", "Eco"],
  "Suspenção": ["suspensao", "Suspensão"],
  "Rebanhos": ["rebanhos", "Os Rebanhos"],
  "Bairro do Eco": ["eco", "Bairro do Eco"],
  "Fundo": ["fundo", "O Fundo"],
  "Eco": ["eco", "Bairro do Eco"],
};

const DISTRICT_META = {
  forte: "Ponto original e mais alto da cidade; centro militar e sede da regência.",
  "alta-daren": "Bairro nobre em volta do Forte; elite financeira, social e intelectual.",
  "vila-aberta": "Bairro nobre ao ar livre, tranquilo, junto ao muro externo.",
  "campo-alto": "O bairro mais alegre: praças, tavernas, teatros e plantações.",
  brita: "Bairro dos intelectuais e estudantes; maiores bibliotecas e escolas.",
  "quartel-topo": "Quartel de superfície ao oeste; guarda das muralhas.",
  "residencial-1": "Primeiro nível residencial subterrâneo.",
  "ala-fungi": "Plantações e túneis de fungos que alimentam a cidade (níveis 1–3).",
  "quartel-2": "Quartel do segundo nível; o de treino mais rigoroso.",
  centro: "Coração administrativo do subterrâneo; fóruns, cortes e mercados.",
  refugio: "Habitação temporária para recém-chegados; abriga o orfanato.",
  selado: "A região mais silenciosa e vigiada, junto à saída selada (níveis 3–5).",
  "quartel-selado": "O maior quartel de Daren, dominando o oeste dos níveis 3–5.",
  "quatro-ceus": "Bairro religioso de cavernas coloridas; templos de todo tipo.",
  bazar: "Comércio em centenas de lojas, na maior caverna da cidade.",
  suspensao: "Plataformas e casas suspensas; o bairro mais habitado.",
  rebanhos: "Criação e abate de animais subterrâneos (níveis 4–5).",
  eco: "Metalurgia e maquinário; forjas junto a uma fonte de calor (níveis 5–6).",
  fundo: "O nível mais profundo: esgoto, calor e a entrada da forja.",
};

/* ------ DLC "por bairro": filled-in districts from DLC Daren --------------- */
// id → { description?, demographics?, qualityOfLife?, history[], events[], relations[], rumors[] }
const DISTRICT_DLC = {
  selado: {
    description: "Bairro silencioso e sigiloso, cheio de guardas e rumores.",
    demographics: "Principalmente habitacional, com comércio e oficinas discretas.",
    qualityOfLife: "Iluminação natural fúngica; extremamente silencioso.",
    history: [
      "O encontro com uma série de túneis externos a Daren permitiu uma invasão de Vrocks; parte dos túneis foi colapsada e a região passou a ser vigiada.",
    ],
    events: [
      { name: "Procissão de Lamentos", description: "Parada militar e cívica pelos mortos da invasão; cinzas de mortos recentes são espalhadas como proteção. Costuma começar no bairro do Eco, após cremações." },
    ],
    rumors: [
      "Dizem que é possível sair de Daren pelos túneis laterais do Bairro Selado.",
      "O esforço excessivo em guardar o bairro faz suspeitar que há algo por trás de seu nome.",
      "A guarda local é tida como corrupta, mas ninguém tem provas — nem tenta.",
    ],
  },
  eco: {
    description: "Refino, forjas e moinhos a vapor; sede de manutenção e expedições mineradoras, parte sob jurisdição anã.",
    demographics: "Industrial, com subespaço habitacional; algumas forjas vendem no próprio local.",
    qualityOfLife: "Muito quente, com sons metálicos quase constantes; boa parte é bem úmida.",
    history: [
      "As forjas foram transferidas para cá assim que se criou um perímetro cavernoso seguro; o aquecimento geotérmico intenso facilita a produção.",
    ],
    events: [
      { name: "Dia festivo dos anões", description: "Um dia em que os anões simplesmente não aparecem." },
      { name: "Inspeção de estoque e estrutura", description: "Realizada duas vezes ao ano." },
    ],
  },
  fundo: {
    description: "Local de tratamento da água; bairro pouco frequentado e de entrada controlada.",
    demographics: "Não habitacional; apenas indústria ligada à água.",
    qualityOfLife: "Horrível: quente, úmido e insuportavelmente fedido.",
    history: [
      "Antes do sistema de água, banhos só aconteciam com chuva e no inverno trazia-se neve; a cidade era bem mais suja.",
    ],
  },
  "quatro-ceus": {
    description: "Bairro de cultos em bolhas coloridas escavadas na rocha.",
    demographics: "Religiosa; boa parte da habitação é nos próprios templos.",
    qualityOfLife: "Pacato, ventilado, com água, pracinhas, limpo e iluminado — um dos lugares mais agradáveis do subsolo.",
    history: ["Originalmente um espaço de praças que foi cedendo lugar aos templos."],
    events: [{ name: "Cozinha solidária", description: "Realizada dois dias por semana." }],
    relations: [
      "Um espaço de oratória em anfiteatro liga o Centro aos Quatro Céus, usado raramente para julgamentos públicos.",
    ],
  },
  rebanhos: {
    description: "Criação de animais, processamento de derivados animais e fonte de água.",
    demographics: "Majoritariamente industrial.",
    qualityOfLife: "Um nojo: fedor dos animais, alta umidade das fontes e calor da manutenção dos lagartos.",
    events: [
      { name: "Grande Abate do Inverno", description: "Abate anual dos lagartos-milenares menos produtivos (cujas escamas passam de verde a ciano e cinza); premia-se o lote mais produtivo com um jantar e uma peça de couro exclusiva. Carne e couro viram itens de alto valor." },
    ],
  },
  "vila-aberta": {
    description: "O bairro mais 'pato' da cidade — um wannabe Alta Daren.",
    demographics: "Majoritariamente habitacional, urbanização orgânica, com acesso a serviços e comércio.",
    qualityOfLife: "Dos lugares bons é o mais 'meh', e dos 'meh' é o mais bom.",
  },
  "residencial-1": {
    qualityOfLife: "Infraestrutura hidráulica defasada; risco de desabamentos por escavação precipitada (não havia anões na época).",
  },
};

/* ------ population: relative weight (scaled to ~130k) + minority headcounts -- */
// id → { weight, dwarf?, elf?, other? }.  Humans are the remainder.
// Minority counts are absolute and sum to the campaign targets:
//   dwarves ≈ 3.2k (mostly the Depra clan in the Eco), elves < 1k, others < 1k.
const POP_TARGET = 130000;
// weight → relative population; dwarf/elf/other → absolute minorities;
// cls → social-class shares; occ → occupation shares (both ≈ sum to 1).
const POPULATION = {
  forte: { weight: 3, other: 50, cls: { trabalhadora: 0.55, elite: 0.25, media: 0.2 }, occ: { Militar: 0.7, Administração: 0.2, Serviços: 0.1 } },
  "alta-daren": { weight: 4, elf: 100, cls: { elite: 0.7, media: 0.25, trabalhadora: 0.05 }, occ: { Nobreza: 0.4, Serviços: 0.35, Administração: 0.15, Cultura: 0.1 } },
  "vila-aberta": { weight: 7, elf: 150, cls: { media: 0.6, trabalhadora: 0.25, elite: 0.15 }, occ: { Serviços: 0.4, Comércio: 0.3, Administração: 0.15, Ócio: 0.15 } },
  "campo-alto": { weight: 2, elf: 100, other: 100, cls: { media: 0.5, trabalhadora: 0.4, pobre: 0.1 }, occ: { Serviços: 0.4, Comércio: 0.25, Cultura: 0.2, Agricultura: 0.15 } },
  brita: { weight: 6, dwarf: 100, elf: 150, cls: { media: 0.6, trabalhadora: 0.3, elite: 0.1 }, occ: { Academia: 0.55, Administração: 0.2, Comércio: 0.15, Serviços: 0.1 } },
  "quartel-topo": { weight: 4, other: 70, cls: { trabalhadora: 0.8, media: 0.2 }, occ: { Militar: 0.85, Indústria: 0.15 } },
  "residencial-1": { weight: 12, cls: { trabalhadora: 0.7, media: 0.25, pobre: 0.05 }, occ: { Serviços: 0.4, Indústria: 0.3, Comércio: 0.3 } },
  "ala-fungi": { weight: 8, cls: { trabalhadora: 0.8, media: 0.15, pobre: 0.05 }, occ: { Agricultura: 0.7, Academia: 0.15, Serviços: 0.15 } },
  centro: { weight: 15, dwarf: 100, elf: 100, other: 100, cls: { media: 0.5, trabalhadora: 0.35, elite: 0.15 }, occ: { Administração: 0.35, Comércio: 0.3, Serviços: 0.25, Militar: 0.1 } },
  refugio: { weight: 7, cls: { pobre: 0.8, trabalhadora: 0.2 }, occ: { Serviços: 0.5, Ócio: 0.3, Comércio: 0.2 } },
  "quartel-2": { weight: 3, cls: { trabalhadora: 0.85, media: 0.15 }, occ: { Militar: 0.9, Serviços: 0.1 } },
  bazar: { weight: 7, other: 150, cls: { media: 0.55, trabalhadora: 0.35, pobre: 0.1 }, occ: { Comércio: 0.7, Serviços: 0.2, Indústria: 0.1 } },
  selado: { weight: 9, cls: { trabalhadora: 0.6, media: 0.3, pobre: 0.1 }, occ: { Militar: 0.4, Serviços: 0.3, Indústria: 0.2, Comércio: 0.1 } },
  suspensao: { weight: 20, elf: 100, other: 50, cls: { trabalhadora: 0.65, media: 0.25, pobre: 0.1 }, occ: { Serviços: 0.4, Comércio: 0.3, Indústria: 0.2, Cultura: 0.1 } },
  "quatro-ceus": { weight: 6, cls: { trabalhadora: 0.45, media: 0.4, pobre: 0.15 }, occ: { Religião: 0.6, Serviços: 0.2, Academia: 0.2 } },
  rebanhos: { weight: 3, dwarf: 100, cls: { trabalhadora: 0.85, media: 0.1, pobre: 0.05 }, occ: { Indústria: 0.5, Agricultura: 0.4, Serviços: 0.1 } },
  "quartel-selado": { weight: 7, dwarf: 200, other: 80, cls: { trabalhadora: 0.85, media: 0.15 }, occ: { Militar: 0.9, Serviços: 0.1 } },
  eco: { weight: 9, dwarf: 2700, cls: { trabalhadora: 0.75, media: 0.2, elite: 0.05 }, occ: { Indústria: 0.6, Administração: 0.15, Militar: 0.15, Comércio: 0.1 } },
  fundo: { weight: 0.5, cls: { trabalhadora: 0.9, pobre: 0.1 }, occ: { Indústria: 0.7, Administração: 0.3 } },
};
const POP_TOTAL_WEIGHT = Object.values(POPULATION).reduce((s, p) => s + p.weight, 0);

function districtPopulation(id) {
  const p = POPULATION[id];
  if (!p) return { population: undefined, races: [], classes: [], occupations: [] };
  const population = Math.round((p.weight / POP_TOTAL_WEIGHT) * POP_TARGET);
  const races = [];
  for (const race of ["dwarf", "elf", "other"]) {
    if (p[race]) races.push({ race, count: p[race] });
  }
  const classes = Object.entries(p.cls ?? {}).map(([cls, share]) => ({ class: cls, share }));
  const occupations = Object.entries(p.occ ?? {}).map(([occupation, share]) => ({ occupation, share }));
  return { population, races, classes, occupations };
}

/* ------ NPCs: "Pessoas importantes" from the bible + DLC ------------------- */
// [id, name, districtId|null, factionId|null, role, description]
const NPCS = [
  ["alvessa-cadros", "Terina Alvessa Cadros Vanella", "forte", "regencia", "Regente de Daren", "Assumiu há 9 anos após a renúncia do tio; séria demais, vive inteiramente para o cargo e reluta em preparar sucessão."],
  ["desuno-sevori", "Desuno Sevori", "forte", "regencia", "Vice-regente", "Frio e sério; a regente respeita sua voz mais que a de qualquer outro na cidade."],
  ["bafri-olen", "Bafri Olen", "forte", null, "Tesoureiro", "Halfling há mais de 20 anos no cargo; contabilista exímio, ácido e brincalhão, se intromete na administração e nos preços."],
  ["zael-cadros", "Zael Cadros", "forte", "quadrados", "Conselheiro militar; líder dos Avancistas", "Irmão mais velho de Alvessa, responsável pelo Forte e Quartel do Topo; guarda rancor por não ter sido regente."],
  ["nissa-tevarro", "Nissa Tevarro", "quartel-2", "tevaro", "Conselheira; líder do Quartel Nível 2", "Pragmática e avessa ao jogo político; responsável pelas saídas militares da cidade."],
  ["agran", "Agran", "quartel-selado", null, "Conselheiro; comanda o Quartel Selado", "Draconato amarelo, único conselheiro não humano; combatente temido, visto como herói por muitos."],
  ["brivia-trani", "Brivia Trani", "bazar", "trani", "Cabeça da família Trani", "Lidera os Trani, em desacordo com a Regência; controlam o Bazar e a taxação de mercadorias."],
  ["crassu-depra", "Crassu Depra", "eco", "depra", "Inspetor de qualidade e liderança anã", "Lidera o clã Depra e as forjas do Eco."],
  ["guva", "Guva", "quatro-ceus", "inquisicao", "Inquisidor", "Mágico incomum de íris vermelha; próximo de experimentos estranhos na Ala Fungi e na Brita. Alguns o ligam ao Culto de Melina."],
  ["torenno", "Torenno", "eco", "inquisicao", "Inquisidor", "Anão centenário, mestre da estrutura dos túneis; raramente sobe à superfície."],
  ["cannivra", "Cannivra", "quatro-ceus", "irassi-terina", "Inquisidora de Terina", "Acólita febril de Terina; sua nova atitude fanática desagrada as autoridades locais."],
  ["jandel-medera", "Jandel Medera", "vila-aberta", "medera", "Herdeiro ocioso", "Ganhou uma casa na Vila Aberta do tio Manuel; vive de pensão, caminhadas, sonecas e boemia."],
  ["joao-kapli", "João", "vila-aberta", "kapli", "Gerente dedicado dos Kapli", "23 anos de casa; sonha em se mudar para a Alta Daren e virar sócio do banco Kapli."],
  ["vanessa-gevel", "Vanessa", "vila-aberta", "gevel", "Redatora dos Gevel", "Mora confortável na Vila Aberta e não pretende 'melhorar de posição'."],
];

/* ------ elevators: doc display names for the PSD marker names ------------- */
const ELEVATOR_NAME = {
  Central: "Elevador Central",
  Norte: "Norte Central",
  Sul: "Sul Central",
  Leste: "Leste Central",
  Oeste: "Oeste Central",
  Nordeste: "Periférico Nordeste",
  Noroeste: "Periférico Noroeste",
  Sudeste: "Periférico Sudeste",
};

/* ------ factions: roster distilled from "Grupos e Pessoas" ---------------- */
const FACTIONS = [
  ["sem-cores", "Sem Cores", "SC", "#ffffff", true, "A organização dos jogadores. Oficialmente sem cor — literalmente."],
  ["regencia", "Regência", "RG", "#b23b3b", false, "A regência de Daren: a família regente e seus aliados na administração, no clero e nos juízes. Controla governo, comida, terra e exército há um século; dona da Celestia Maior."],
  ["depra", "Depra", "DE", "#7a6a4f", false, "Clã anão da mineração e das forjas; recusa títulos de nobreza."],
  ["kapli", "Kapli", "KA", "#3f7fb0", false, "Banqueiros e donos da construção/escavação; a família mais rica."],
  ["erius", "Erius", "ER", "#6b5bd6", false, "Magos e pesquisadores; o colégio da Brita, a iluminação e a Siglalística."],
  ["gevel", "Gevel", "GE", "#d98a3f", false, "Jornais, livros e artes; ávidos por poder e monopólio."],
  ["ortar", "Ortar", "OR", "#48a67a", false, "Jogos, vícios e prazeres do Campo Alto; buscam estabilidade."],
  ["medera", "Medera", "ME", "#8a8f5c", false, "Contatos e mercadores; mais informação e acesso a produtos de fora."],
  ["amira", "Amira", "AM", "#d066a0", false, "Teatro e música; muito bem vista pela população."],
  ["dera", "Dera", "DR", "#555a66", false, "Assassinos com fachada militar, próximos à Regência."],
  ["irassi", "Irassi", "IR", "#3fa6a0", false, "Religião de Ikrassi e cura; melhores curandeiros e cultivadores."],
  ["trani", "Trani", "TR", "#a0553f", false, "Mercadores em desacordo com a Regência; controlam o Bazar."],
  ["tevaro", "Tevaro", "TE", "#7a3fb0", false, "Família militar em ascensão que almeja rivalizar com a Regência."],
  ["quadrados", "Avancistas", "AV", "#5f7fae", false, "Facção militar expansionista alinhada a Zael Cadros."],
  ["inquisicao", "Inquisição", "IQ", "#9aa3b8", false, "Ordem de cinco inquisidores com autoridade quase irrestrita."],
  ["irassi-terina", "Culto de Terina", "TN", "#d8c33a", false, "Fé febril da deusa do Segundo Sol; poderosa e temida."],
  ["culto-melina", "Culto de Melina", "M7", "#6a3d6a", false, "Cultistas da mudança e da corrupção, infiltrados na cidade."],
];

/* ------ influence seed: lore-grounded, keyed by "district@level" ---------- */
// [factionId, influence(1-20), power(1-20)]
// Regência (the ruling regency) is the state everywhere: a big core in every
// administration zone, and a strong presence in every area regardless of level.
// Depra (mining/forge clan) runs the works administration from Centro down.
const PRESENCE = {
  // --- Superfície ---
  "forte@level-0": [["regencia", 16, 15], ["tevaro", 5, 9], ["sem-cores", 2, 2]],
  "alta-daren@level-0": [["regencia", 16, 13], ["erius", 8, 5], ["ortar", 4, 3]],
  "campo-alto@level-0": [["ortar", 14, 8], ["regencia", 7, 6], ["amira", 7, 5], ["gevel", 6, 4], ["sem-cores", 3, 3]],
  "brita@level-0": [["regencia", 14, 10], ["erius", 12, 6], ["gevel", 9, 5], ["sem-cores", 4, 3], ["inquisicao", 2, 6]],
  "quartel-topo@level-0": [["quadrados", 12, 13], ["regencia", 7, 9]],
  "vila-aberta@level-0": [["regencia", 12, 10]],
  // --- Nível 1 ---
  "ala-fungi@level-1": [["irassi", 6, 5], ["regencia", 5, 5], ["sem-cores", 4, 3]],
  "brita@level-1": [["regencia", 12, 10]],
  "residencial-1@level-1": [["regencia", 8, 8]],
  // --- Nível 2 ---
  "ala-fungi@level-2": [["irassi", 9, 6], ["regencia", 7, 6], ["erius", 6, 5], ["sem-cores", 5, 4], ["inquisicao", 2, 7]],
  "centro@level-2": [["regencia", 19, 15], ["depra", 12, 11], ["kapli", 6, 6], ["sem-cores", 4, 4], ["inquisicao", 3, 7]],
  "quartel-2@level-2": [["regencia", 9, 11]],
  "refugio@level-2": [["regencia", 7, 7]],
  // --- Nível 3 ---
  "ala-fungi@level-3": [["irassi", 10, 7], ["regencia", 6, 5], ["erius", 5, 4], ["culto-melina", 4, 6]],
  "bazar@level-3": [["trani", 14, 9], ["medera", 8, 7], ["regencia", 7, 7], ["ortar", 6, 5], ["sem-cores", 5, 4]],
  "centro@level-3": [["regencia", 15, 13], ["depra", 13, 12]],
  "quatro-ceus@level-3": [["irassi-terina", 9, 7], ["irassi", 8, 6], ["regencia", 6, 6], ["inquisicao", 5, 6], ["sem-cores", 3, 2]],
  "selado@level-3": [["regencia", 7, 7]],
  "suspensao@level-3": [["regencia", 7, 7]],
  // --- Nível 4 ---
  "eco@level-4": [["depra", 8, 9], ["regencia", 6, 6], ["trani", 5, 4]],
  "quartel-selado@level-4": [["regencia", 9, 13], ["tevaro", 6, 10], ["quadrados", 5, 9]],
  "quatro-ceus@level-4": [["irassi-terina", 10, 8], ["regencia", 6, 6], ["inquisicao", 6, 8], ["irassi", 6, 5]],
  "rebanhos@level-4": [["regencia", 7, 7]],
  "selado@level-4": [["tevaro", 10, 14], ["regencia", 8, 10], ["dera", 7, 9], ["inquisicao", 3, 8]],
  "suspensao@level-4": [["regencia", 7, 7]],
  // --- Nível 5 ---
  "eco@level-5": [["depra", 15, 12], ["kapli", 7, 8], ["regencia", 6, 6]],
  "quartel-selado@level-5": [["regencia", 9, 11]],
  "rebanhos@level-5": [["regencia", 7, 7]],
  "selado@level-5": [["regencia", 7, 7]],
  // --- Nível 6 — O Fundo ---
  "eco@level-6": [["depra", 10, 9], ["regencia", 6, 6], ["kapli", 4, 6]],
  "fundo@level-6": [["depra", 8, 7], ["regencia", 6, 6], ["culto-melina", 5, 8]],
};

/* ------------------------------------------------------------- assemble ---- */
const clean = (n) => n.replace(/\s+/g, " ").trim();
const metaBySlug = new Map(meta.levels.map((l) => [l.slug, l]));

const districtsUsed = new Map(); // id → name
const areas = [];
const elevatorAcc = new Map(); // name → { levelIds:Set, positions:{} }

for (const lvl of LEVELS) {
  const m = metaBySlug.get(lvl.slug);
  if (!m) continue;

  for (const d of m.districts) {
    const entry = DISTRICT_OF[clean(d.name)];
    if (!entry) {
      console.warn(`! unmapped district label "${d.name}" on ${lvl.slug}`);
      continue;
    }
    const [districtId, districtName] = entry;
    districtsUsed.set(districtId, districtName);
    areas.push({
      id: `${districtId}@${lvl.slug}`,
      levelId: lvl.slug,
      districtId,
      name: districtName,
      labelAnchor: { x: d.x, y: d.y },
    });
  }

  for (const e of m.elevators) {
    const name = clean(e.name);
    const acc = elevatorAcc.get(name) ?? { levelIds: new Set(), positions: {} };
    acc.levelIds.add(lvl.slug);
    acc.positions[lvl.slug] = { x: e.x, y: e.y };
    elevatorAcc.set(name, acc);
  }
}

const districts = [...districtsUsed].map(([id, name]) => {
  const dlc = DISTRICT_DLC[id] ?? {};
  const pop = districtPopulation(id);
  return {
    id,
    name,
    description: dlc.description ?? DISTRICT_META[id] ?? "",
    ...(pop.population !== undefined ? { population: pop.population } : {}),
    races: pop.races,
    classes: pop.classes,
    occupations: pop.occupations,
    demographics: dlc.demographics ?? "",
    qualityOfLife: dlc.qualityOfLife ?? "",
    history: dlc.history ?? [],
    events: dlc.events ?? [],
    relations: dlc.relations ?? [],
    rumors: dlc.rumors ?? [],
  };
});

const elevators = [...elevatorAcc]
  .filter(([, v]) => v.levelIds.size >= 2)
  .map(([name, v]) => ({
    id: `elev-${name.toLowerCase()}`,
    name: ELEVATOR_NAME[name] ?? name,
    levelIds: [...v.levelIds],
    positions: v.positions,
  }));

const factions = FACTIONS.map(([id, name, shortName, color, isPlayerOrg, description, infoUrl]) => ({
  id,
  name,
  shortName,
  color,
  isPlayerOrg,
  description,
  ...(infoUrl ? { infoUrl } : {}),
}));

const popTotal = districts.reduce((s, d) => s + (d.population ?? 0), 0);
const raceTotals = {};
for (const d of districts) for (const r of d.races) raceTotals[r.race] = (raceTotals[r.race] ?? 0) + r.count;
console.log(`population: ~${popTotal.toLocaleString("en-US")} total; minorities`, raceTotals);

const areaIds = new Set(areas.map((a) => a.id));
const presence = [];
for (const [key, rows] of Object.entries(PRESENCE)) {
  const [districtId, slug] = key.split("@");
  const areaId = `${districtId}@${slug}`;
  if (!areaIds.has(areaId)) {
    console.warn(`! presence for unknown area "${areaId}" — skipped`);
    continue;
  }
  for (const [factionId, influence, power] of rows) {
    presence.push({ factionId, areaId, influence, power });
  }
}

const world = {
  meta: { city: "Daren", playerOrg: "Sem Cores" },
  levels: LEVELS.map((l) => ({
    id: l.slug,
    name: l.name,
    depth: l.depth,
    image: `levels/${l.slug}.png`,
    viewBox: { width: meta.canvas.width, height: meta.canvas.height },
    blurb: l.blurb,
  })),
  districts,
  areas,
  factions,
  npcs: NPCS.map(([id, name, districtId, factionId, role, description]) => {
    const npc = { id, name, role, description };
    if (districtId) npc.districtId = districtId;
    if (factionId) npc.factionId = factionId;
    return npc;
  }),
  presence,
  elevators,
  projects: [
    { id: "proj-lantern", ownerFactionId: "sem-cores", name: "Operação Lanterna", status: "active", summary: "Estabelecer uma base dos Sem Cores na Ala Fungi.", areaIds: ["ala-fungi@level-2"] },
  ],
  chronicle: [],
};

writeFileSync(
  join(root, "src", "data", "world.generated.json"),
  JSON.stringify(world, null, 2),
);
console.log(
  `world.generated.json: ${world.levels.length} levels, ${districts.length} districts, ` +
    `${areas.length} areas, ${factions.length} factions, ${world.npcs.length} npcs, ` +
    `${elevators.length} elevators, ${presence.length} presence rows`,
);

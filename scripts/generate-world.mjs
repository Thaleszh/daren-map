// Generates src/data/world.generated.json from the PSD-extracted metadata,
// a district registry, a faction roster, and a lore-grounded influence seed.
//
// Re-run after extract-levels.mjs whenever the PSD changes:
//   node scripts/extract-levels.mjs && node scripts/generate-world.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkWorld } from "./lib/check-world.mjs";

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

function districtPopulation(id) {
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

/* ------ NPCs: "Pessoas importantes" from the bible + DLC ------------------- */
// [id, name, districtId|null, factionId|null, role, description]
const NPCS = [
  ["alvessa-cadros", "Terina Alvessa Cadros Vanella", "forte", "cadros", "Regente de Daren", "Assumiu há 9 anos após a renúncia do tio; séria demais, vive inteiramente para o cargo e reluta em preparar sucessão."],
  ["desuno-sevori", "Desuno Sevori", "forte", "sevori", "Vice-regente", "Frio e sério; a regente respeita sua voz mais que a de qualquer outro na cidade."],
  ["bafri-olen", "Bafri Olen", "forte", "administracao", "Tesoureiro", "Halfling há mais de 20 anos no cargo; contabilista exímio, ácido e brincalhão, se intromete na administração e nos preços."],
  ["zael-cadros", "Zael Cadros", "forte", "quadrados", "Conselheiro militar; líder dos Avancistas", "Irmão mais velho de Alvessa, responsável pelo Forte e Quartel do Topo; guarda rancor por não ter sido regente."],
  ["nissa-tevarro", "Nissa Tevarro", "quartel-2", "tevaro", "Conselheira; líder do Quartel Nível 2", "Pragmática e avessa ao jogo político; responsável pelas saídas militares da cidade."],
  ["agran", "Agran", "quartel-selado", null, "Conselheiro; comanda o Quartel Selado", "Draconato amarelo, único conselheiro não humano; combatente temido, visto como herói por muitos."],
  ["brivia-trani", "Brivia Trani", "bazar", "trani", "Cabeça da família Trani", "Lidera os Trani, em desacordo com os Cadros; controlam o Bazar e a taxação de mercadorias."],
  ["crassu-depra", "Crassu Depra", "eco", "depra", "Inspetor de qualidade e liderança anã", "Lidera o clã Depra e as forjas do Eco."],
  ["guva", "Guva", "quatro-ceus", "inquisicao", "Inquisidor", "Mágico incomum de íris vermelha; próximo de experimentos estranhos na Ala Fungi e na Brita. Alguns o ligam ao Culto de Melina."],
  ["torenno", "Torenno", "eco", "inquisicao", "Inquisidor", "Anão centenário, mestre da estrutura dos túneis; raramente sobe à superfície."],
  ["cannivra", "Cannivra", "quatro-ceus", "irassi-terina", "Inquisidora de Terina", "Acólita febril de Terina; sua nova atitude fanática desagrada as autoridades locais."],
  ["aissa", "Aissa", "quatro-ceus", "inquisicao", "Inquisidora", "Manifesta o poder de Siarel de forma consistente; trabalha como pentegar fora de Daren. Foi por ela que a guilda soube a verdade sobre a missão do trio."],
  ["zacras", "Zacras", "quatro-ceus", "inquisicao", "Inquisidor", "Veterano que quer evitar conflitos entre os habitantes; sai muito em expedições com o exército."],
  ["ejura-tarvos", "Ejura Tarvos", "forte", "casa-real", "Conselheiro real; filho do rei e da rainha", "Vigia as famílias que tentam desestabilizar a cidade; age como um inquisidor, como se nada o pudesse parar. Favorece os Cadros, mas às vezes age contra a regência."],
  ["jandel-medera", "Jandel Medera", "vila-aberta", "medera", "Herdeiro ocioso", "Ganhou uma casa na Vila Aberta do tio Manuel; vive de pensão, caminhadas, sonecas e boemia."],
  ["joao-kapli", "João", "vila-aberta", "kapli", "Gerente dedicado dos Kapli", "23 anos de casa; sonha em se mudar para a Alta Daren e virar sócio do banco Kapli."],
  ["vanessa-gevel", "Vanessa", "vila-aberta", "gevel", "Redatora dos Gevel", "Mora confortável na Vila Aberta e não pretende 'melhorar de posição'."],
  // --- companions who traveled with the guild (see EXPEDITIONS) ---
  ["tinha", "Tinha", null, null, "Estudiosa de demônios", "De chapéu pontudo e lâmina na cintura; corta demônios-tocha e diz ter influência sobre demônios. Entrou na caverna do Keruga com a guilda e, depois, deu a notícia de que o trio da Guarda estava morto."],
  ["von", "Von", null, null, "Entregador da bruxa de Ikvar", "Meio desajeitado; trouxe a encomenda da bruxa e acompanhou a guilda até a sala do Keruga."],
  ["inelissa", "Inelissa", null, "irassi-terina", "Devota de Terina", "Luta com cajado e magia de fogo. Acompanhou a missão do Monumento Vrock e reconheceu a torre como um templo de Terina em construção."],
  ["antonio-medera", "Antônio", null, "medera", "Mercador; contatos no pântano", "Contratou a escolta ao pântano; costuma trabalhar para a Rainha do Pântano, inimiga do Rei Seco. Preferiu fugir a arriscar a vida quando o emissário foi assassinado."],
  ["fazio", "Fazio", null, "medera", "Guia a serviço dos Medera", "Conhece os caminhos pela Floresta dos Encantados e pelo pântano; guiou a escolta até Inarai."],
  ["mali", "Mali", null, null, "Mercadora", "Humana elitista que carrega uma espada só de enfeite; foi com a escolta ao pântano e vendeu o violão por lá."],
  ["ilian", "Ilian", null, null, "Batedor independente", "Mora em Daren e tem família em Langriz; usa lança e um anel que o protege de Terina. Juntou-se ao resgate da caravana no sudeste."],
  ["selpo", "Selpo", null, null, "Líder dos pioneiros", "O mais experiente do grupo, grisalho; guiou a expedição atrás do maringo e ensinou rapel a todos."],
  ["tania", "Tânia", null, null, "Pioneira; entende de plantas", "Jovem e nervosa; era quem ia identificar a fruta. Adoeceu com as picadas de vespa na floresta dos homens baixos."],
  ["mave", "Mave", null, null, "Escalador dos pioneiros", "Ótimo escalador, traça as rotas difíceis; feriu a perna na subida do penhasco."],
  ["teodorico", "Teodorico", null, null, "Batedor dos pioneiros", "Vai à frente batendo terreno; faz um pouco de magia e some por horas à noite."],
  ["revon", "Revon", null, null, "Cartógrafo dos pioneiros", "Mapeia a região, mas o mapa é exclusivo da família Ortar. Quer entrar para a guilda."],
  ["celember-tevaru", "Celember Androssi Tevaru", null, null, "Capitão da Guarda", "Nobre sério e desanimado, de equipamento bonito; comanda o treinamento de campo da Guarda, mas deixa quase tudo com Pirália."],
  ["piralia", "Pirália", null, null, "Segunda em comando na Guarda", "Mais enérgica que o capitão e atolada na burocracia que ele não faz; quer muito investigar a árvore do não-morto."],
  ["querissi", "Querissi", null, null, "Maga da expedição da Guarda", "Rica e fechada; não gosta dos Sem Cores e culpa a guilda pelos assassinatos no colégio da Brita e pela torre de pesquisa destruída."],
  ["oizin", "Oizin", null, null, "Cuida dos animais da Guarda", "Destoa dos soldados e parece ansioso; vende comida melhor a quem pede e fala mal da maga."],
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
// The old single "Regência" is split into the powers behind it (Cadros, Sevori,
// Administração); "Regência" comes back later as a *grouping*, not a faction.
// The Guarda is likewise not a faction: it's the rank and file of the military.
const FACTIONS = [
  ["sem-cores", "Sem Cores", "SC", "#ffffff", true, "A organização dos jogadores. Oficialmente sem cor — literalmente."],
  // --- a Regência ---
  ["cadros", "Cadros", "CA", "#b23b3b", false, "A família regente há quase um século: controla a administração, quase toda a comida e a terra, e pode tomar o exército. Aliada da casa real de Tarvos e bem vista pelos inquisidores."],
  ["sevori", "Sevori", "SE", "#c7cdd8", false, "Família aliada aos Cadros e a única em pé de igualdade com eles: administração, clero e juízes. Dona da Celestia Maior. Sino em cor de prata."],
  ["administracao", "Administração", "AD", "#8e4a4a", false, "A máquina que administra a cidade (a Regência rege): produção de comida e animais, água, refúgio, fiscalização e cortes menores."],
  // --- militares ---
  ["quadrados", "Avancistas", "AV", "#5f7fae", false, "Os 'quadrados': facção militar expansionista liderada por Zael Cadros; querem o poder completo da cidade para fins militares."],
  ["exploradores", "Exploradores", "EX", "#7fb04f", false, "Os 'explorados': militares que querem descobrir o que acontece lá fora e estudar as maldições; contra a expansão da cidade, indiferentes aos jogos internos."],
  ["reclusos", "Reclusos", "RE", "#2f4a6e", false, "Militares voltados para dentro: marcados pela Segunda Daren, querem fortificar a cidade e esperar que as maldições se destruam entre si."],
  ["tevaro", "Tevaro", "TE", "#7a3fb0", false, "Família militar recente e em ascensão; já tem um general e almeja igualar e superar os Cadros."],
  ["dera", "Dera", "DR", "#555a66", false, "A família de assassinos da cidade, com fachada militar e muito próxima aos Cadros."],
  ["dufey", "Dufey", "DF", "#9b4fd0", false, "Magos militares da alta classe desde antes das maldições; acham a política perda de tempo, nem aliados nem inimigos dos Cadros."],
  // --- grandes famílias ---
  ["depra", "Depra", "DE", "#7a6a4f", false, "Clã anão da mineração e das forjas; recusa títulos de nobreza."],
  ["kapli", "Kapli", "KA", "#3f7fb0", false, "Banqueiros e donos da construção/escavação; a família mais rica."],
  ["erius", "Erius", "ER", "#6b5bd6", false, "Magos e pesquisadores; o colégio da Brita, a iluminação e a Siglalística."],
  ["gevel", "Gevel", "GE", "#d98a3f", false, "Jornais, livros e artes; ávidos por poder e monopólio."],
  ["ortar", "Ortar", "OR", "#48a67a", false, "Jogos, vícios e prazeres do Campo Alto; buscam estabilidade."],
  ["medera", "Medera", "ME", "#8a8f5c", false, "Contatos e mercadores; mais informação e acesso a produtos de fora."],
  ["amira", "Amira", "AM", "#d066a0", false, "Teatro e música; muito bem vista pela população."],
  ["trani", "Trani", "TR", "#a0553f", false, "Mercadores em desacordo com os Cadros, que tomaram suas terras; controlam o Bazar."],
  ["irassi", "Irassi", "IR", "#3fa6a0", false, "Religião de Ikrassi e cura; melhores curandeiros e cultivadores. Em desacordo com os Cadros."],
  // --- grupos menores ---
  ["magos", "Magos", "MG", "#a58bd9", false, "Os magos sem nome de família da Brita: professores, estudantes e pesquisadores fora da nobreza. Somam aos Erius no poder arcano da cidade."],
  ["circo", "Circo", "CI", "#c23b7a", false, "Os donos e artistas do Circo Suspenso — ninguém sabe direito quem são. Performances ditas fantásticas, às vezes perturbadoras; espalhados pela Suspensão e pelo Bazar."],
  // --- trabalhadores: a força de trabalho organizada de cada bairro ---
  ["produtores", "Produtores", "PR", "#6b8e23", false, "Quem produz a comida da cidade: cultivadores de fungos e plantas da Ala Fungi e do Campo Alto, e criadores e abatedores dos Rebanhos."],
  ["artesaos", "Artesãos", "AR", "#8a5a8a", false, "A indústria miúda e grossa da cidade: oficinas de sabão, velas, tochas, tecidos e couro, ferreiros e forjas, e as expedições de mineração às minas de Oudá. Muitos dormem nos próprios ateliês; estão em todo bairro."],
  ["operarios", "Operários", "OP", "#5c7a8a", false, "A mão de obra da infraestrutura: água, esgoto, ventilação e manutenção dos níveis residenciais."],
  ["comerciantes", "Comerciantes", "CO", "#c9a227", false, "Lojistas e mercadores independentes do Bazar, do Centro e das galerias residenciais."],
  // --- fé e ordens ---
  ["inquisicao", "Inquisição", "IQ", "#9aa3b8", false, "Ordem de cinco inquisidores com autoridade quase irrestrita."],
  // --- os inquisidores, um a um: cada um age por conta própria com seu círculo de
  // confiança, e a guilda lida com cada um em separado. Sem presença no mapa (a
  // presença é da Inquisição); existem pelas relações.
  ["inq-guva", "Inquisidor Guva", "IG", "#b84a4a", false, "Íris vermelha, alto, pálido, braço enfaixado; age sozinho, cura e destrói com magia. Próximo de experimentos estranhos na Ala Fungi e na Brita — há quem o ligue ao Culto de Melina."],
  ["inq-torenno", "Inquisidor Torenno", "IT", "#8a6a3a", false, "Anão centenário, mestre dos túneis — que usa tanto para colapsá-los quanto para fortificá-los. Respeitado pelos anões; raramente sobe e recusa missões na superfície."],
  ["inq-aissa", "Inquisidora Aissa", "IA", "#d9a441", false, "Uma das poucas que manifesta o poder de Siarel de forma consistente; trabalha como pentegar e sai de Daren com frequência. Lança longa vermelha."],
  ["inq-zacras", "Inquisidor Zacras", "IZ", "#a0784f", false, "Veterano gigante de escudo imenso e tatuagens tribais; quer evitar qualquer conflito entre os habitantes e acha as intrigas um desperdício. Sai muito com o exército."],
  ["inq-cannivra", "Inquisidora Cannivra", "IC", "#e0c020", false, "Antiga devota de Crastus, hoje uma das primeiras acólitas de Terina; espalha a fé de maneira febril, para desgosto das autoridades."],
  // --- a coroa
  ["casa-real", "Casa Real de Tarvos", "RT", "#3b3f8f", false, "A família real de Tarvel, que rege a capital. Daren nasceu como defesa contra Irvantir e hoje é o refúgio possível da coroa; um conselheiro real (Ejura Tarvos) garante que a regência esteja alinhada — e é o único com controle sobre os inquisidores."],
  ["siarel", "Fé de Siarel", "SI", "#e8d8a8", false, "Deusa da salvação e da força; cultuada mais por tradição que por efeito. Templo Comunal e Palco de Siarel."],
  ["crastus", "Fé de Crastus", "CR", "#e0552a", false, "Deus do fogo e da renovação; favorece quem persiste e quem se arrepende. Templo Comunal."],
  ["ganvartel", "Fé de Ganvartel", "GV", "#5a7a3a", false, "Deus do conhecimento: procura, ensino e paciência. Templo Comunal e Biblioteca de Ganvartel."],
  ["eihla", "Fé de Eihla", "EI", "#4ab0e8", false, "Deusa da magia, do canto e da honestidade; em atrito com os magos. Templo Comunal."],
  ["irassi-terina", "Culto de Terina", "TN", "#d8c33a", false, "Fé febril da deusa do Segundo Sol; poderosa e temida."],
  ["culto-melina", "Culto de Melina", "M7", "#6a3d6a", false, "Cultistas da mudança e da corrupção, infiltrados na cidade."],
];

/* ------ groupings: ways of bundling factions into blocs -------------------- */
// Within one grouping a faction sits in at most one group (so shares still sum
// to 100%); factions left out show as themselves. Group ids share the faction
// id space, so they must not reuse one.
const GROUPINGS = [
  {
    id: "esfera",
    name: "Esfera",
    description: "O que cada facção faz na cidade.",
    groups: [
      ["g-regencia", "Regência", "RG", "#b23b3b", "Quem rege e administra: a família regente, seus aliados e a máquina administrativa.", ["cadros", "sevori", "administracao"]],
      ["g-guarda", "Guarda", "GU", "#5f7fae", "A força militar de Daren: as correntes do exército e as famílias militares. A massa da guarda se divide entre elas.", ["quadrados", "exploradores", "reclusos", "tevaro", "dera", "dufey"]],
      ["g-industria", "Indústria", "IN", "#8a5a8a", "Forjas, oficinas, mineração e a infraestrutura da cidade — os Depra à frente.", ["artesaos", "depra", "operarios"]],
      ["g-producao", "Produção", "PD", "#6b8e23", "A comida da cidade: fungos, plantações e rebanhos.", ["produtores"]],
      ["g-comercio", "Comércio e Finanças", "CF", "#c9a227", "Bancos, casas mercantis, caravanas e lojistas.", ["comerciantes", "trani", "medera", "kapli"]],
      ["g-magia", "Magia e Saber", "MS", "#6b5bd6", "O poder arcano e acadêmico: os Erius e os magos da Brita.", ["erius", "magos"]],
      ["g-cultura", "Cultura e Lazer", "CL", "#d066a0", "Jornais, teatro, música, jogos e espetáculos.", ["gevel", "amira", "ortar", "circo"]],
      ["g-fe", "Fé", "FE", "#d8c33a", "Religiões e cultos, dos templos comunais ao Segundo Sol — e o que se esconde por baixo.", ["irassi", "irassi-terina", "siarel", "crastus", "ganvartel", "eihla", "culto-melina"]],
      ["g-ordens", "Ordens", "OD", "#9aa3b8", "Ordens com autoridade própria que cruzam a cidade.", ["inquisicao", "inq-guva", "inq-torenno", "inq-aissa", "inq-zacras", "inq-cannivra"]],
    ],
  },
  {
    id: "posicao",
    name: "Posição social",
    description: "De onde vem cada facção: nobreza, casas mercantes ou trabalhadores.",
    groups: [
      ["g-nobreza", "Nobreza", "NB", "#c9a24b", "As famílias nobres de Daren, com assento na corte ou ambição de tê-lo.", ["casa-real", "cadros", "sevori", "kapli", "erius", "gevel", "ortar", "amira", "irassi", "tevaro", "dera", "dufey"]],
      ["g-mercantes", "Mercantes", "MC", "#3f7fb0", "Casas de banco e comércio e os lojistas: o dinheiro que não vem do sangue.", ["medera", "trani", "comerciantes"]],
      ["g-trabalhadores", "Trabalhadores", "TB", "#7a8a5f", "Quem não vem de berço nem de fortuna: quem produz, fabrica, serve, guarda e reza — a massa que mantém Daren de pé.", ["produtores", "artesaos", "operarios", "magos", "depra", "administracao", "quadrados", "exploradores", "reclusos", "inquisicao", "circo", "siarel", "crastus", "ganvartel", "eihla", "irassi-terina", "culto-melina"]],
    ],
  },
  {
    id: "postura",
    name: "Postura",
    description: "Onde cada facção está em relação aos Cadros e à Regência.",
    groups: [
      ["g-leais", "Leais", "LE", "#3f7fb0", "Sustentam a Regência: os Cadros, seus aliados e quem depende deles.", ["casa-real", "cadros", "sevori", "administracao", "dera", "medera", "kapli", "inquisicao"]],
      ["g-postura-neutras", "Neutras", "NE", "#8a8f99", "Cuidam dos próprios interesses; apoiam a estabilidade enquanto ela lhes serve.", ["depra", "erius", "ortar", "amira", "dufey", "exploradores", "reclusos", "circo", "magos", "produtores", "artesaos", "operarios", "comerciantes", "siarel", "crastus", "ganvartel", "eihla"]],
      ["g-rivais", "Rivais", "RV", "#d98a3f", "Disputam ou minam o poder dos Cadros por dentro — por terra, fé, glória ou monopólio.", ["trani", "irassi", "irassi-terina", "tevaro", "quadrados", "gevel"]],
      ["g-subversivas", "Subversivas", "SB", "#6a3d6a", "Querem ver a cidade mudar por baixo, custe o que custar.", ["culto-melina"]],
    ],
  },
  {
    // Campaign state, not lore: everyone starts neutral; move factions between
    // groups in the annotate tool as play goes (see annotations "memberships").
    // Only real organizations sit here — the workforce blocs (produtores,
    // artesãos, operários, comerciantes) and the unaffiliated Brita mages are
    // the general population, not a party the guild deals with, so they're left
    // out and the Relações view skips them.
    id: "relacao",
    name: "Relação com os Sem Cores",
    description: "Como cada facção vê a organização dos jogadores.",
    groups: [
      ["g-aliadas", "Aliadas", "AL", "#48a67a", "Trabalham com os Sem Cores.", []],
      ["g-relacao-neutras", "Neutras", "NT", "#8a8f99", "Ainda não tomaram partido.", ["cadros", "sevori", "quadrados", "exploradores", "reclusos", "tevaro", "dera", "dufey", "depra", "kapli", "erius", "gevel", "ortar", "medera", "amira", "trani", "irassi", "circo", "inquisicao", "casa-real", "irassi-terina"]],
      ["g-hostis", "Hostis", "HO", "#b23b3b", "Veem os Sem Cores como ameaça.", []],
      // Each inquisitor deals with the guild on their own terms; the Relações
      // view lists this group apart, after everyone else.
      ["g-inquisidores", "Inquisidores", "IQ", "#9aa3b8", "Os cinco inquisidores, cada um com sua própria relação com a guilda.", ["inq-guva", "inq-torenno", "inq-aissa", "inq-zacras", "inq-cannivra"]],
    ],
  },
];

/* ------ influence seed: lore-grounded, keyed by "district@level" ---------- */
// [factionId, influence(0-20), power(0-20)]
// Administração is the everyday state everywhere; Cadros and Sevori concentrate
// where the regency actually sits (Forte, Alta Daren, the courts, the clergy).
// Worker factions (Produtores, Artesãos, Operários, Comerciantes) are the mass
// of the city but hold few of its levers: low influence, power kept for numbers.
// Each quartel leans to its military currents: Topo → Avancistas + Exploradores,
// Nível 2 → Reclusos + Exploradores, Selado → Reclusos. Worker factions
// carry the labour-heavy districts; Depra runs the works below.
const PRESENCE = {
  // --- Superfície ---
  "forte@level-0": [["cadros", 14, 13], ["quadrados", 8, 12], ["sevori", 6, 5], ["tevaro", 4, 8], ["administracao", 4, 4], ["dera", 3, 7], ["artesaos", 1, 2], ["sem-cores", 2, 2]],
  "alta-daren@level-0": [["cadros", 10, 9], ["sevori", 8, 6], ["kapli", 7, 6], ["erius", 7, 5], ["ortar", 4, 3], ["medera", 4, 3], ["tevaro", 3, 5], ["dufey", 3, 4], ["gevel", 3, 2], ["amira", 3, 2], ["dera", 2, 5], ["trani", 2, 2], ["irassi", 2, 2], ["artesaos", 1, 1]],
  "campo-alto@level-0": [["ortar", 14, 8], ["amira", 7, 5], ["administracao", 6, 5], ["gevel", 6, 4], ["produtores", 2, 2], ["artesaos", 2, 2], ["sem-cores", 3, 3]],
  "brita@level-0": [["erius", 12, 6], ["gevel", 9, 5], ["magos", 8, 5], ["administracao", 7, 5], ["cadros", 4, 5], ["dufey", 3, 4], ["inquisicao", 2, 6], ["artesaos", 2, 2], ["culto-melina", 1, 3], ["sem-cores", 4, 3]],
  "quartel-topo@level-0": [["quadrados", 11, 13], ["exploradores", 9, 10], ["cadros", 4, 6], ["administracao", 2, 3], ["artesaos", 2, 2]],
  "vila-aberta@level-0": [["administracao", 7, 6], ["medera", 4, 3], ["kapli", 4, 3], ["cadros", 3, 4], ["gevel", 3, 2], ["artesaos", 2, 2]],
  // --- Nível 1 ---
  "ala-fungi@level-1": [["irassi", 6, 5], ["produtores", 5, 5], ["administracao", 5, 5], ["artesaos", 2, 2], ["sem-cores", 4, 3]],
  "brita@level-1": [["erius", 8, 5], ["administracao", 7, 6], ["magos", 4, 3], ["gevel", 4, 3], ["artesaos", 2, 2]],
  "residencial-1@level-1": [["administracao", 7, 7], ["operarios", 3, 3], ["kapli", 3, 3], ["comerciantes", 2, 2], ["artesaos", 2, 2]],
  // --- Nível 2 ---
  "ala-fungi@level-2": [["irassi", 9, 6], ["administracao", 7, 6], ["produtores", 6, 6], ["erius", 6, 5], ["inquisicao", 2, 7], ["artesaos", 2, 2], ["sem-cores", 5, 4]],
  "centro@level-2": [["administracao", 14, 11], ["depra", 12, 11], ["sevori", 7, 6], ["kapli", 6, 6], ["cadros", 5, 7], ["inquisicao", 3, 7], ["comerciantes", 3, 4], ["artesaos", 3, 3], ["gevel", 3, 2], ["siarel", 2, 2], ["sem-cores", 4, 4]],
  "quartel-2@level-2": [["reclusos", 9, 11], ["exploradores", 8, 10], ["tevaro", 5, 8], ["administracao", 2, 3], ["artesaos", 1, 2]],
  "refugio@level-2": [["administracao", 9, 8], ["irassi", 3, 2], ["artesaos", 2, 2]],
  // --- Nível 3 ---
  "ala-fungi@level-3": [["irassi", 10, 7], ["produtores", 6, 6], ["administracao", 6, 5], ["erius", 5, 4], ["culto-melina", 4, 6], ["artesaos", 2, 2]],
  "bazar@level-3": [["trani", 14, 9], ["medera", 8, 7], ["ortar", 6, 5], ["comerciantes", 5, 6], ["administracao", 5, 5], ["circo", 4, 6], ["artesaos", 3, 3], ["sem-cores", 5, 4]],
  "centro@level-3": [["depra", 13, 12], ["administracao", 11, 10], ["sevori", 4, 4], ["cadros", 3, 4], ["comerciantes", 3, 3], ["artesaos", 2, 2]],
  "quatro-ceus@level-3": [["irassi-terina", 9, 7], ["irassi", 8, 6], ["inquisicao", 5, 6], ["sevori", 5, 4], ["siarel", 3, 3], ["crastus", 3, 3], ["ganvartel", 3, 2], ["administracao", 2, 3], ["eihla", 2, 2], ["artesaos", 1, 1], ["sem-cores", 3, 2]],
  "selado@level-3": [["administracao", 5, 5], ["reclusos", 3, 5], ["dera", 2, 5], ["artesaos", 2, 2]],
  "suspensao@level-3": [["circo", 6, 7], ["administracao", 6, 6], ["artesaos", 3, 3], ["comerciantes", 2, 3], ["operarios", 2, 2]],
  // --- Nível 4 ---
  "eco@level-4": [["depra", 8, 9], ["artesaos", 5, 6], ["administracao", 5, 5], ["trani", 5, 4]],
  "quartel-selado@level-4": [["reclusos", 8, 11], ["tevaro", 5, 9], ["exploradores", 5, 8], ["quadrados", 4, 8], ["cadros", 2, 4], ["depra", 2, 3], ["artesaos", 1, 2]],
  "quatro-ceus@level-4": [["irassi-terina", 10, 8], ["inquisicao", 6, 8], ["irassi", 6, 5], ["sevori", 4, 4], ["crastus", 4, 4], ["siarel", 4, 3], ["ganvartel", 4, 3], ["eihla", 3, 3], ["administracao", 2, 2], ["artesaos", 1, 1]],
  "rebanhos@level-4": [["administracao", 8, 7], ["produtores", 6, 6], ["artesaos", 3, 3], ["operarios", 2, 3]],
  "selado@level-4": [["tevaro", 10, 14], ["dera", 7, 9], ["reclusos", 5, 8], ["administracao", 5, 6], ["inquisicao", 3, 8], ["culto-melina", 2, 4], ["artesaos", 2, 2]],
  "suspensao@level-4": [["administracao", 7, 7], ["circo", 3, 4], ["artesaos", 3, 3], ["operarios", 2, 2]],
  // --- Nível 5 ---
  "eco@level-5": [["depra", 15, 12], ["artesaos", 7, 9], ["kapli", 7, 8], ["administracao", 5, 5]],
  "quartel-selado@level-5": [["reclusos", 7, 9], ["exploradores", 6, 9], ["administracao", 2, 3], ["artesaos", 1, 2]],
  "rebanhos@level-5": [["administracao", 7, 7], ["produtores", 5, 5], ["operarios", 2, 3], ["artesaos", 2, 2]],
  "selado@level-5": [["administracao", 5, 5], ["reclusos", 3, 5], ["artesaos", 2, 2]],
  // --- Nível 6 — O Fundo ---
  "eco@level-6": [["depra", 10, 9], ["artesaos", 6, 7], ["administracao", 5, 5], ["kapli", 4, 6]],
  "fundo@level-6": [["depra", 8, 7], ["administracao", 7, 7], ["culto-melina", 5, 8], ["operarios", 5, 5], ["artesaos", 2, 3]],
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

const resTotal = districts.reduce((s, d) => s + (d.population?.residents ?? 0), 0);
const workTotal = districts.reduce((s, d) => s + (d.population?.workers ?? 0), 0);
const occTotals = {};
for (const d of districts) {
  for (const o of d.occupations) occTotals[o.occupation] = Math.round((occTotals[o.occupation] ?? 0) + o.share * (d.population?.workers ?? 0));
}
console.log("occupations:", occTotals);
const raceTotals = {};
for (const d of districts) for (const r of d.races) raceTotals[r.race] = (raceTotals[r.race] ?? 0) + r.count;
console.log(
  `population: ~${resTotal.toLocaleString("en-US")} residents, ~${workTotal.toLocaleString("en-US")} daytime workers; minorities`,
  raceTotals,
);

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

/* ------ expeditions: the guild's arcs, from the session notes ------------- */
// Distilled from docs/Anotações - Os Sem-Cores.pdf (private, gitignored). Dates
// are the real first/last session dates. Members are the guild members who
// went; companions and contacts are roster NPCs (see NPCS), linked by npcIds.
const EXPEDITIONS = [
  {
    id: "exp-forte-mortos-vivos",
    name: "Assalto ao forte dos mortos-vivos",
    contractor: "Guva (Inquisição), com a Guarda acampada perto do forte",
    contractorFactionId: "inquisicao",
    destination: "Forte dos mortos-vivos, na floresta",
    mission: "Eliminar o não-morto que controlava o forte e seu exército de mortos-vivos.",
    members: ["Âncora", "Emeria", "Súre", "Kaz", "Patri", "Kinnan", "Zygmunt", "Nivy", "Josh", "Nosk", "Zaruni", "Valorie", "Rimut", "Miri", "Aiden", "Gael"],
    npcIds: ["guva"],
    result: "success",
    outcome: "O não-morto foi eliminado e o forte destruído, com a ajuda de orcs do sul, a quem devolveram o orc runado. Guva pediu sigilo sobre o que se aprendeu do não-morto, em troca de conhecimento.",
    summary: "O arco mais longo da guilda: meses de cerco, dois grupos de ataque, os raios do Gael e o sangue enfeitiçado do forte.",
    startDate: "2022-01-24",
    endDate: "2023-01-11",
    sessions: 17,
  },
  {
    id: "exp-demonios",
    name: "Missão demônios",
    contractor: "Guva (Inquisição)",
    contractorFactionId: "inquisicao",
    destination: "Caverna do Keruga, nas montanhas perto de Ikvar",
    mission: "Investigar a caverna tomada pela corte do Keruga e deter seus demônios.",
    members: ["Âncora", "Nosk", "Zaruni", "Kinnan", "Zygmunt", "Colliva", "Nevali"],
    npcIds: ["guva", "cannivra", "tinha", "von"],
    result: "unknown",
    outcome: "Com ajuda de uma bruxa de Ikvar e de Tinha, libertaram a fada presa e chegaram à sala do Keruga, onde Iliana dormia com a aura dele. As notas terminam no meio do combate.",
    summary: "Passagem por Ikvar, a fada acorrentada e o sono do Keruga.",
    startDate: "2023-03-01",
    endDate: "2023-05-31",
    sessions: 9,
  },
  {
    id: "exp-monumento-vrock",
    name: "Missão Monumento Vrock",
    contractor: "Família Erius, com acordo de repassar informações à Guarda",
    contractorFactionId: "erius",
    destination: "Beira do Rio Naufrágio, planície de Mavros",
    mission: "Levantar informações sobre uma construção avistada à beira do rio.",
    members: ["Josh", "Nivy", "Emeria", "Thomas", "Aiden"],
    npcIds: ["inelissa"],
    result: "partial",
    outcome: "Descobriram que era um templo de Terina em construção pelos Vrocks. Depois de um confronto com os Vrocks, recuaram e voltaram com a informação.",
    summary: "Acompanhados de Inelissa, devota de Terina; ajudaram um monstro do tamanho de um ônibus atacado por Vrocks.",
    startDate: "2023-10-02",
    endDate: "2023-10-30",
    sessions: 4,
  },
  {
    id: "exp-escolta-pantano",
    name: "Escolta no pântano",
    contractor: "Antônio (família Medera)",
    contractorFactionId: "medera",
    destination: "Inarai, no reino do Rei Seco (pântano)",
    mission: "Escoltar Antônio numa negociação com os goblins do pântano.",
    members: ["Âncora", "Emeria", "Cithria", "Nosk", "Zaruni"],
    npcIds: ["antonio-medera", "fazio", "mali"],
    result: "failure",
    outcome: "O emissário do Rei Seco foi assassinado e o grupo virou suspeito. Entre guerra, julgamento ou fuga, fugiram: voltaram escoltados a Daren.",
    summary: "Viagem de barco pelo pântano com Mali e Fazio; a cidade de goblins, orcs e trolls, as tábuas escritas e a forja.",
    startDate: "2023-11-20",
    endDate: "2024-04-04",
    sessions: 8,
  },
  {
    id: "exp-fugitivos",
    name: "Missão dos fugitivos",
    contractor: "Guarda (Savar)",
    destination: "Montanhas a caminho de Langris",
    mission: "Capturar os fugitivos Nevez, contrabandista, e Trimas, que matou magos e roubou pesquisas sobre runas.",
    members: ["Nivy", "Kaz", "Valorie", "Rimut", "Zygmunt"],
    npcIds: [],
    result: "partial",
    outcome: "Encontraram os fugitivos (Miguel, Lizara, Neves e Gantu), mas não os entregaram. Mentiram à Guarda sobre o motivo e receberam 4 moedas de prata. Ganharam um contato em Daren: Lautano.",
    summary: "Uma pedra que esquenta perto do alvo, uma roca gigante e um acordo por fora da lei.",
    startDate: "2024-04-18",
    endDate: "2024-07-25",
    sessions: 5,
  },
  {
    id: "exp-carroca-desaparecida",
    name: "A carroça desaparecida",
    contractor: "Família Medera",
    contractorFactionId: "medera",
    destination: "Antrus, pela rota de Langriz",
    mission: "Encontrar uma carroça desaparecida na estrada.",
    members: ["Cithria", "Kaz", "Nevali", "Miri", "Thomas"],
    npcIds: [],
    result: "failure",
    outcome: "O rastro levou a Antrus, infestada de mortos-vivos. Cithria foi ferida e envenenada, um cavaleiro morto-vivo os perseguiu, e o grupo recuou para Daren.",
    summary: "A descoberta de que Zygmunt ajudava Ikvar mudou quem foi; o cavalo Oswaldo foi junto.",
    startDate: "2024-08-31",
    endDate: "2024-09-26",
    sessions: 3,
  },
  {
    id: "exp-resgate-trio",
    name: "Resgate do trio",
    contractor: "Guarda (tenente Gilberto Alvares Cabral)",
    destination: "Alto das montanhas, vila dos Kalppi",
    mission: "Resgatar um trio da Guarda (Juno, Mevissa e Circo) em missão sigilosa de negociação com os Kalppi.",
    members: ["Cithria", "Taarak", "Aiden", "Valorie", "Rimut"],
    npcIds: ["tinha"],
    result: "failure",
    outcome: "Depois de sobreviver aos yetis, Tinha disse que os três estavam mortos e o grupo voltou. Mais tarde descobriram que a missão envolvia Ikvar e que 'Circo' era um nome falso — suspeita de armação contra a guilda.",
    summary: "Geleiras, uma inquisidora solitária, um totem de osso e yetis.",
    startDate: "2025-01-09",
    endDate: "2025-03-29",
    sessions: 4,
  },
  {
    id: "exp-caravana-sudeste",
    name: "Resgate de uma caravana desaparecida no sudeste",
    contractor: "",
    destination: "Cidade murada e castelo no sudeste",
    mission: "Resgatar uma caravana desaparecida.",
    members: ["Josh", "Nosk", "Nevali", "Miri", "Thomas"],
    npcIds: ["ilian"],
    result: "failure",
    outcome: "Invadiram a cidade murada e o castelo e enfrentaram uma armadura gigante. Fugiram pela muralha, feridos e com Thomas e Nevali envenenados.",
    summary: "Um prisioneiro dizia saber derrotar o demônio mantido por orbes; o grupo decidiu não libertá-lo.",
    startDate: "2025-04-03",
    endDate: "2025-05-15",
    sessions: 4,
  },
  {
    id: "exp-irvantir",
    name: "Exploração de Irvantir",
    contractor: "Os Sem Cores, patrocinados pela Inquisição",
    contractorFactionId: "sem-cores",
    destination: "Irvantir — Iruzitar",
    mission: "Cruzar o túnel e o deserto até Iruzitar, explorar Irvantir e vender informações a quem se interessasse (Medera, Guarda, Gevel, Erius, Irassi).",
    members: ["RhodD", "Emeria", "Âncora", "Aiden", "Taarak"],
    npcIds: [],
    result: "failure",
    outcome: "Desastre: RhodD morreu, Âncora se afogou no lago, Taarak se matou ao perceber que virava um Encrustado, e Emeria e Aiden se perderam em Irvantir. Última sessão da mesa.",
    summary: "Cidades abandonadas, a lua de Terina de dia, uma música que ninguém mais ouvia e Encrustados cada vez mais perto.",
    startDate: "2025-09-16",
    endDate: "2025-12-16",
    sessions: 6,
  },
  {
    id: "exp-pioneiros-frutas",
    name: "Pioneiros das Frutas do Leste",
    contractor: "Pioneiros de Selpo, ligados à família Ortar",
    contractorFactionId: "ortar",
    destination: "Floresta dos homens baixos, a leste",
    mission: "Escoltar pioneiros atrás do maringo, uma fruta roxa do leste.",
    members: ["Thomas", "Kaz", "Cithria", "Zaruni", "Nevali", "Josh (parte do caminho)"],
    npcIds: ["selpo", "tania", "mave", "teodorico", "revon"],
    result: "success",
    outcome: "Acharam e colheram as frutas, apesar dos lagartos e da magia desgastada da região, e escaparam subindo o penhasco. Mave feriu a perna.",
    summary: "Descida noturna ao desfiladeiro, os homens baixos e seus sons de madeira, e buracos que deixam quem desce tonto.",
    startDate: "2026-01-06",
    endDate: "2026-06-23",
    sessions: 8,
  },
  {
    id: "exp-arco-iris",
    name: "Arco-íris",
    contractor: "",
    destination: "Cevaral fora de Daren",
    mission: "Estudar a Golota, uma criatura amorfa e mágica, e coletar uma amostra.",
    members: ["Josh", "Miri", "Nosk", "Valorie", "Nevali"],
    npcIds: [],
    result: "partial",
    outcome: "Testaram como a Golota reage a fogo e magia e conseguiram uma amostra do líquido dela antes de fugir de volta a Daren.",
    summary: "Experimentos com fogo, fogo de Terina e bicarbonato; a tatuagem de Miri reage à criatura.",
    startDate: "2026-07-28",
    endDate: "2026-09-01",
    sessions: 3,
  },
  {
    id: "exp-escolinha-guarda",
    name: "Escolinha da guarda",
    contractor: "Guarda (capitão Celember Androssi Tevaru)",
    destination: "Floresta dos Encantados, depois leste e as montanhas ao norte",
    mission: "Acompanhar uma expedição de treinamento de 10 dias da Guarda: tirar os soldados da cidade, treinar comando e montar acampamentos rápidos.",
    members: ["Thomas", "Ellan", "Edochi", "Draco", "Maiari"],
    npcIds: ["celember-tevaru", "piralia", "querissi", "oizin"],
    result: "ongoing",
    outcome: "",
    summary: "Cinco esquadrões de soldados que nunca saíram da cidade, uma maga que odeia a guilda e um Encrustado prateado no rio.",
    startDate: "2026-09-06",
    endDate: "2026-09-06",
    sessions: 1,
  },
];

/* ------ relations: the guild's history with each faction ------------------ */
// Distilled from the session notes (docs/Anotações - Os Sem-Cores.pdf). Effects
// are a first-pass read (−5..+5) the GM tunes in the annotate tool's "Relações";
// 0 = worth remembering, didn't move anything. Stance lives in GROUPINGS.relacao.
const RELATIONS = [
  {
    factionId: "inquisicao",
    summary: "A ordem como um todo; na prática a guilda lida com cada inquisidor em separado.",
    events: [
      { date: "2023-02-15", title: "Que inquisidor apoiaria a revolução", effect: 0, description: "A guilda discutiu qual dos inquisidores a ajudaria na revolução e como saber mais sobre eles." },
      { date: "2025-09-16", title: "Patrocínio da exploração de Irvantir", effect: 1, expeditionId: "exp-irvantir", description: "A Inquisição bancou a expedição da própria guilda — que terminou em desastre." },
      { date: "", title: "RhodD, membro da guilda", effect: 2, description: "RhodD era membro dos Sem Cores e o elo da guilda com a Inquisição. Morreu em Irvantir; o efeito deve expirar em breve." },
    ],
  },
  {
    factionId: "inq-guva",
    summary: "O contratante mais antigo da guilda: paga bem e cobra sigilo — e conta com ela para falar com Ikvar.",
    events: [
      { date: "2023-01-11", title: "O forte dos mortos-vivos cai", effect: 2, expeditionId: "exp-forte-mortos-vivos", description: "O não-morto foi eliminado e o forte destruído. Guva, impressionado, pediu sigilo sobre o que se aprendeu, em troca de conhecimento." },
      { date: "2023-02-15", title: "O que contar ao Guva", effect: 0, description: "A guilda filtrou o que passaria ao Guva sobre o não-morto e escondeu os poderes do Gael." },
      { date: "2023-05-31", title: "A caverna do Keruga", effect: 0, expeditionId: "exp-demonios", description: "Outra missão do Guva — que, segundo Nevali, costuma dar soluções tortas." },
      { date: "2025-06-17", title: "A missão do trio era com Ikvar", effect: -2, expeditionId: "exp-resgate-trio", description: "Cithria descobriu que 'Circo' era um nome falso e foi tirar satisfação com o Guva: a missão do trio era com Ikvar, não com os Kalppi. A guilda suspeita de uma armação da cidade." },
      { date: "2025-09-16", title: "Rumo a Irvantir", effect: 1, expeditionId: "exp-irvantir", description: "Guva aprova o movimento da guilda em direção a Irvantir." },
      { date: "", title: "A Torre dos Demônios", effect: 3, description: "A guilda ajudou o Guva com a Torre dos Demônios." },
      { date: "", title: "Velhos conhecidos", effect: 2, description: "Guva já tinha contato com membros da guilda — Nevali e Kinnan." },
      { date: "", title: "Ponte com Ikvar", effect: 2, description: "Guva vê a guilda ajudando na comunicação com Ikvar, sem sabotá-la." },
      { date: "", title: "Recusa aos contatos de Ikvar", effect: -1, description: "A guilda se recusou a cooperar com os contatos do Guva em Ikvar." },
    ],
  },
  {
    factionId: "inq-aissa",
    summary: "Gosta da Nivy e do torneio, aprova o trabalho na cidade — mas acha a guilda política demais.",
    events: [
      { date: "", title: "Gosta da Nivy", effect: 2, description: "Aissa gosta da Nivy, uma das líderes da guilda." },
      { date: "", title: "A guilda no torneio de Siarel", effect: 2, description: "A guilda participou do torneio anual que Aissa realiza no coliseu em nome de Siarel." },
      { date: "", title: "Bom trabalho pela cidade", effect: 1, description: "Aissa reconhece o trabalho que a guilda faz pela cidade." },
      { date: "", title: "Política demais", effect: -2, description: "Para o gosto dela, a guilda se mete demais em política." },
    ],
  },
  {
    factionId: "inq-cannivra",
    summary: "Sente a animosidade da guilda contra o culto — mas vê esperança no Josh.",
    events: [
      { date: "2023-02-08", title: "As crianças de Iliana", effect: -2, description: "Cannivra matou Iliana; três crianças morreram e onze chegaram, e ficaram com a igreja de Terina. Ela reclamou dos relatórios da guilda e recusou o pedido de RhodD para cuidar das crianças." },
      { date: "", title: "Animosidade contra o culto", effect: -3, description: "A guilda tem animosidade contra o culto de Terina." },
      { date: "", title: "Esperança no Josh", effect: 2, description: "Com Josh, devoto de Terina, na guilda, Cannivra vê esperança." },
    ],
  },
  {
    factionId: "irassi-terina",
    summary: "Inelissa lutou ao lado da guilda, e Josh é devoto; a inquisidora Cannivra é outra história.",
    events: [
      { date: "2023-10-30", title: "Inelissa no Monumento Vrock", effect: 1, expeditionId: "exp-monumento-vrock", description: "A devota Inelissa lutou ao lado da guilda e reconheceu a torre como um templo de Terina em construção." },
      { date: "", title: "Josh, devoto de Terina", effect: 2, description: "Josh é membro ativo dos Sem Cores e devoto de Terina." },
    ],
  },
  {
    factionId: "erius",
    summary: "Parceiros de pesquisa: túneis, Encrustados e Jorbe — embora achem a guilda presa a coisas mundanas.",
    events: [
      { date: "", title: "Pesquisa nos túneis", effect: 2, description: "A guilda fez trabalhos de pesquisa nos túneis para os Erius." },
      { date: "", title: "Tentativa de capturar um Encrustado", effect: 1, description: "A guilda tentou capturar um Encrustado para eles." },
      { date: "", title: "Pesquisa do Encrustado de Jorbe", effect: 4, description: "A guilda pesquisou o Encrustado de Jorbe junto com os Erius." },
      { date: "2023-10-30", title: "Informações sobre o Monumento Vrock", effect: 1, expeditionId: "exp-monumento-vrock", description: "A guilda voltou sabendo que era um templo de Terina em construção, apesar do confronto com os Vrocks." },
      { date: "2025-09-16", title: "A guilda vai a Irvantir", effect: 1, expeditionId: "exp-irvantir", description: "Os Erius têm a ida a Irvantir em alta conta." },
      { date: "", title: "Preocupados com coisas mundanas", effect: -2, description: "Para os Erius, a guilda se preocupa demais com coisas mundanas." },
    ],
  },
  {
    factionId: "medera",
    summary: "Antônio gosta da guilda: abriu com ela o contato com os goblins, e as missões contam como sucesso para eles.",
    events: [
      { date: "", title: "Primeiro contato com os goblins", effect: 2, description: "Numa missão mais antiga no pântano, a guilda levou os Medera ao primeiro contato com os goblins." },
      { date: "2024-04-04", title: "Escolta no pântano", effect: 0, expeditionId: "exp-escolta-pantano", description: "O emissário do Rei Seco foi assassinado e a guilda fugiu com Antônio — mas os Medera não guardam isso contra ela." },
      { date: "2024-09-26", title: "A carroça perdida em Antrus", effect: 2, expeditionId: "exp-carroca-desaparecida", description: "O rastro levou a Antrus, infestada de mortos-vivos. A guilda recuou sem a carroça, mas para os Medera a missão foi um sucesso." },
      { date: "2025-08-12", title: "Querem informação de Irvantir", effect: 1, description: "A família de Antônio pagaria por informação privilegiada sobre Irvantir por um tempo." },
      { date: "", title: "Antônio gosta deles", effect: 1, description: "Antônio gosta da guilda." },
    ],
  },
  {
    factionId: "ortar",
    summary: "Os pioneiros de Selpo voltaram com o maringo — e falam bem da guilda.",
    events: [
      { date: "2026-06-23", title: "Os pioneiros voltam com o maringo", effect: 2, expeditionId: "exp-pioneiros-frutas", description: "Frutas colhidas apesar dos lagartos e da magia desgastada; fuga pelo penhasco. O mapa de Revon segue exclusivo dos Ortar." },
      { date: "2026-06-23", title: "Os pioneiros falam bem da guilda", effect: 1, expeditionId: "exp-pioneiros-frutas", description: "Os trabalhadores que foram na expedição do maringo voltaram falando muito bem dos Sem Cores." },
    ],
  },
  {
    factionId: "gevel",
    summary: "Gostam de ver a guilda peitar a liderança da cidade e ensinar o povo a ler.",
    events: [
      { date: "2025-08-12", title: "Interesse em Irvantir", effect: 0, description: "Os Gevel queriam informações de Irvantir para o jornal." },
      { date: "", title: "Antagonizam a liderança da cidade", effect: 2, description: "A guilda bate de frente com a liderança da cidade — o que agrada os Gevel." },
      { date: "", title: "Ensinar a ler", effect: 2, description: "Os esforços da guilda para alfabetizar a população (veja a iniciativa Distribuição e oficina de Leitura)." },
    ],
  },
  {
    factionId: "irassi",
    summary: "Querem reconectar-se com os templos do outro lado — e não gostam que a guilda acolha seus antigos membros.",
    events: [
      { date: "2025-08-12", title: "Interesse em Irvantir", effect: 0, description: "Os Irassi, com um pé em Terina, queriam a expedição para reconectar com os templos de Irvantir." },
      { date: "", title: "Acolhendo antigos membros", effect: -2, description: "A guilda abriga — e desencaminha — antigos membros dos Irassi." },
    ],
  },
  {
    factionId: "tevaro",
    summary: "Uma força armada que não é a Guarda não deveria existir — mas ao menos não se curva aos Cadros.",
    events: [
      { date: "", title: "Uma organização militar fora da Guarda", effect: -4, description: "Os Sem Cores são uma organização militar que não é a Guarda. Na visão dos Tevaro, isso não deveria ser permitido." },
      { date: "", title: "Não se alinha aos Cadros", effect: 1, description: "A guilda não se alinha aos Cadros nem à Regência — o que agrada uma família que quer superá-los." },
    ],
  },
  {
    factionId: "amira",
    summary: "Boa relação: a guilda já recuperou peças culturais para eles e participou da Aurora dos Mares.",
    events: [
      { date: "", title: "Resgates culturais nos túneis do nordeste", effect: 2, description: "A guilda fez trabalhos de recuperação de peças culturais para os Amira nos túneis do nordeste." },
      { date: "", title: "Aurora dos Mares", effect: 3, description: "A guilda participou do evento Aurora dos Mares, dos Amira." },
    ],
  },
  {
    factionId: "quadrados",
    summary: "Uma força armada fora da Guarda incomoda — mas ao menos a guilda se submete à força local.",
    events: [
      { date: "", title: "Uma organização militar fora da Guarda", effect: -4, description: "Os Sem Cores são uma organização militar que não é a Guarda; para os Avancistas, isso não deveria ser permitido." },
      { date: "", title: "Submetidos à força local", effect: 2, description: "Os Avancistas acham que a guilda se submete à força local." },
    ],
  },
  {
    factionId: "cadros",
    summary: "Gostam do trabalho da guilda nos arredores, mas não de ver gente perigosa organizada.",
    events: [
      { date: "", title: "Bom trabalho nos arredores", effect: 4, description: "A guilda fez bons trabalhos nos arredores da cidade." },
      { date: "", title: "Gente perigosa organizada", effect: -4, description: "Os Sem Cores reúnem indivíduos ameaçadores de forma organizada." },
    ],
  },
  {
    factionId: "casa-real",
    summary: "Vê a guilda como os Cadros a veem — com o crédito extra de RhodD na Inquisição.",
    events: [
      { date: "", title: "Bom trabalho nos arredores", effect: 4, description: "A guilda fez bons trabalhos nos arredores da cidade." },
      { date: "", title: "Gente perigosa organizada", effect: -4, description: "Os Sem Cores reúnem indivíduos ameaçadores de forma organizada." },
      { date: "", title: "RhodD na Inquisição", effect: 2, description: "RhodD, membro da guilda, trabalhava na Inquisição. Morreu em Irvantir; o efeito deve expirar em breve." },
    ],
  },
  {
    factionId: "circo",
    summary: "Desconfiam que a guilda possa disputar o controle deles sobre a Suspensão.",
    events: [
      { date: "", title: "Ameaça à Suspensão", effect: -2, description: "O Circo acha que a guilda pode contestar o controle deles sobre a Suspensão." },
    ],
  },
  {
    factionId: "exploradores",
    summary: "Respeitam o trabalho da guilda fora dos muros.",
    events: [
      { date: "", title: "Trabalho fora dos muros", effect: 4, description: "Os Exploradores têm a guilda em alta conta pelo trabalho que ela faz fora dos muros da cidade." },
    ],
  },
  {
    factionId: "kapli",
    summary: "Desconfiam das ideias da guilda sobre sacudir a sociedade.",
    events: [
      { date: "", title: "Ideias de sacudir a sociedade", effect: -2, description: "Os Kapli não gostam do que a guilda pensa sobre sacudir a ordem social." },
    ],
  },
  {
    factionId: "reclusos",
    summary: "A guilda sai da cidade demais para o gosto deles, embora ajude por dentro.",
    events: [
      { date: "", title: "Sempre fora da cidade", effect: -4, description: "Os Sem Cores saem da cidade demais — o oposto do que os Reclusos defendem." },
      { date: "", title: "Ajuda na cidade", effect: 1, description: "Reconhecem a ajuda geral que a guilda dá à cidade." },
    ],
  },
  {
    factionId: "sevori",
    summary: "Não aceitaram a ideia de atentar contra Cannivra.",
    events: [
      { date: "", title: "O atentado contra Cannivra", effect: -1, description: "Os Sevori não aceitam a tentativa de assassinato contra a inquisidora Cannivra." },
    ],
  },
  {
    factionId: "trani",
    summary: "Gostam de ver a guilda em desacordo com os Cadros.",
    events: [
      { date: "", title: "Em desacordo com os Cadros", effect: 1, description: "A guilda é vista em desacordo com os Cadros — inimigos dos Trani." },
    ],
  },
  {
    factionId: "inq-zacras",
    summary: "Lutou ao lado da guilda na ponte para Tarvos — mas detesta grupos políticos.",
    events: [
      { date: "", title: "A ponte para Tarvos", effect: 4, description: "A guilda e Zacras libertaram juntos a ponte para Tarvos da ocupação goblin." },
      { date: "", title: "Um grupo político", effect: -5, description: "Zacras quer evitar conflitos entre os habitantes e acha as intrigas um desperdício; a guilda é política demais." },
    ],
  },
];

// Brita spans two levels; Maringo and Jorbe aren't pinned to either slice.
const BRITA = ["brita@level-0", "brita@level-1"];

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
  groupings: GROUPINGS.map(({ groups, ...g }) => ({
    ...g,
    groups: groups.map(([id, name, shortName, color, description, members]) => ({
      id,
      name,
      shortName,
      color,
      description,
      members,
    })),
  })),
  npcs: NPCS.map(([id, name, districtId, factionId, role, description]) => {
    const npc = { id, name, role, description };
    if (districtId) npc.districtId = districtId;
    if (factionId) npc.factionId = factionId;
    return npc;
  }),
  presence,
  elevators,
  // Initiatives are always the guild's (the player org). Owner isn't stored per
  // row; the view resolves it from meta.playerOrg. See schema InitiativeSchema.
  initiatives: [
    ["init-maringo", "Entender Maringo", "Entender Maringo e estudá-lo. Rimut, Valorie, Cithria.", BRITA],
    ["init-orfanato-escola", "Orfanato / Escola dos Sem Cores", "", ["refugio@level-2"], ["lm-orfanato-de-daren"]],
    ["init-leitura", "Distribuição e oficina de Leitura", ""],
    ["init-magica-para-todos", "Mágica para todos", ""],
    ["init-reconstruir-jorbe", "Reconstruir Jorbe", "", BRITA],
    ["init-memorial", "Memorial", ""],
    // Installed and running for good: fully set up (100%), but never "completed".
    ["init-aulas-criancas", "Aulas e treinamentos para crianças", "", ["refugio@level-2"], ["lm-orfanato-de-daren"], "active", ["init-orfanato-escola"], 100],
  ].map(([id, name, summary, areaIds = [], landmarkIds = [], status = "planned", relatedInitiativeIds = [], progress = 0]) => ({
    id,
    name,
    status,
    progress,
    summary,
    outcome: "",
    areaIds,
    landmarkIds,
    relatedInitiativeIds,
  })),
  expeditions: EXPEDITIONS,
  relations: RELATIONS,
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

// Gate: validate the freshly-written file through the real schema + integrity
// pipeline, merged with annotations exactly as the app does — so schema drift
// fails here at generation time instead of only in the browser at runtime.
try {
  const stats = await checkWorld();
  console.log("✓ schema + integrity OK (merged with annotations):", JSON.stringify(stats));
} catch (err) {
  console.error(
    "✗ generated world FAILED validation:\n",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

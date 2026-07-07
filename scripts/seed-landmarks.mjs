// Seeds src/data/annotations.json with a first batch of landmarks distilled from
// the worldbuilding bible. Positions are derived from each district's PSD label
// anchor (fanned out when a district has several), so they land roughly in the
// right place for the GM to fine-tune in the annotate tool.
//   node scripts/seed-landmarks.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(
  readFileSync(join(root, "src", "data", "psd-metadata.json"), "utf8"),
);
const annPath = join(root, "src", "data", "annotations.json");
const existing = JSON.parse(readFileSync(annPath, "utf8"));

// anchor lookup: `${slug}::${label}` → {x,y}
const anchor = new Map();
for (const lvl of meta.levels) {
  for (const d of lvl.districts) {
    anchor.set(`${lvl.slug}::${d.name.replace(/\s+/g, " ").trim()}`, { x: d.x, y: d.y });
  }
}

// [name, level, districtLabel, districtId, category, factionId|null, description]
const SEED = [
  // ---- Forte (superfície)
  ["Castelo Central", "level-0", "Forte", "forte", "civic", "cadros", "Abriga o alto oficial militar, juízes e toda a regência superior da cidade."],
  ["A Corte", "level-0", "Forte", "forte", "civic", "cadros", "Sala de corte oficial, usada em julgamentos de larga escala ou para intimidar."],
  ["O Campanário", "level-0", "Forte", "forte", "military", null, "Torre de vigia de ~80m; os sinos sinalizam alerta, perigo iminente ou colapso."],
  ["Os Calabouços", "level-0", "Forte", "forte", "danger", null, "As prisões mais reforçadas de Daren, com uma sala de tortura pouco discreta."],
  ["A Grande Oficina", "level-0", "Forte", "forte", "military", null, "Oficina de armas pesadas, sob poder direto dos militares."],

  // ---- Alta Daren
  ["O Topo", "level-0", "Alta Daren", "alta-daren", "noble", "ortar", "O terreno mais exclusivo da cidade; festas da alta classe em noites especiais."],
  ["Teatro de Sanvil", "level-0", "Alta Daren", "alta-daren", "culture", "amira", "Enorme ópera e teatro; a construção mais antiga da Alta Daren."],
  ["Celestia Maior", "level-0", "Alta Daren", "alta-daren", "culture", "sevori", "A escola mais estrita e prestigiada da cidade, da jovem elite."],
  ["As Águas do Alto", "level-0", "Alta Daren", "alta-daren", "noble", "kapli", "Casa de banho de extremo luxo oferecida pela casa Kapli."],

  // ---- Campo Alto
  ["A Praça Celeste", "level-0", "Campo Alto", "campo-alto", "civic", null, "A maior praça da cidade, com um palco geral para eventos públicos."],
  ["Colégio das Belas Artes", "level-0", "Campo Alto", "campo-alto", "culture", "gevel", "Escola de artes plásticas, teatro e música, regida pelos Gevel e Amira."],
  ["As Plantações", "level-0", "Campo Alto", "campo-alto", "other", null, "Quase um sexto da superfície: cultivos que não crescem no subterrâneo."],

  // ---- Brita
  ["Colégio de Barisson", "level-0", "Brita", "brita", "culture", "erius", "Universidade-escola aberta e receptiva; o coração do bairro da Brita."],
  ["Brita Viva", "level-0", "Brita", "brita", "culture", null, "Grande praça cinza de estudantes e intelectuais, cercada de oficinas."],

  // ---- Quartel do Topo
  ["Portão Oeste", "level-0", "Quartel do Topo", "quartel-topo", "military", "quadrados", "O portão oeste da cidade; treino intenso e algumas forjas."],

  // ---- Refúgio (nível 2)
  ["Orfanato de Daren", "level-2", "Refugio", "refugio", "civic", null, "O orfanato oficial; serve de escola sem custo aos desamparados."],
  ["Central de Distribuição", "level-2", "Refugio", "refugio", "commerce", null, "Distribuição de alimentos e recursos básicos ao refúgio e aos quartéis."],

  // ---- Centro (nível 2)
  ["Fórum Central", "level-2", "Centro", "centro", "civic", null, "Onde resoluções, opiniões e problemas da cidade são debatidos."],
  ["Centro Administrativo", "level-2", "Centro", "centro", "civic", "cadros", "O bloco de construções que contém toda a administração da cidade."],
  ["Biblioteca Central", "level-2", "Centro", "centro", "culture", null, "A maior biblioteca de Daren; acesso restrito à administração."],
  ["Palco de Siarel", "level-2", "Centro", "centro", "culture", null, "Coliseu de duelos 'civilizados' em homenagem a Siarel."],

  // ---- Bazar (nível 3)
  ["Os Quatro Pilares", "level-3", "Bazar", "bazar", "other", null, "Pilares naturais que sustentam a maior caverna do subterrâneo."],
  ["A Queda", "level-3", "Bazar", "bazar", "danger", null, "O túnel de queda mais alta; eventos estranhos acontecem em seu fim."],

  // ---- Suspensão (nível 3)
  ["O Circo Suspenso", "level-3", "Suspenção", "suspensao", "culture", null, "Globo de tecido e madeira suspenso, com performances ditas perturbadoras."],

  // ---- Quatro Céus (nível 4)
  ["O Céu de Terina", "level-4", "Quatro Céus", "quatro-ceus", "religious", "irassi-terina", "O maior templo de Terina; cultos de sacrifício nas luas cheias."],
  ["A Casa da Inquisição", "level-4", "Quatro Céus", "quatro-ceus", "danger", "inquisicao", "Casa pequena e isolada onde se reúnem os cinco inquisidores da cidade."],

  // ---- Bairro Selado (nível 4)
  ["A Saída Selada", "level-4", "Bairro Selado", "selado", "danger", "tevaro", "A saída vigiada rumo aos Vrocks e a um extenso complexo de túneis."],

  // ---- Eco (nível 5)
  ["As Forjas do Eco", "level-5", "Bairro do Eco", "eco", "commerce", "depra", "Metalurgia e o maquinário dos elevadores, junto a uma fonte de calor."],

  // ---- DLC "lugares de importância"
  ["Monumento aos Combatentes", "level-4", "Bairro Selado", "selado", "culture", null, "Estátuas de pessoas comuns e um guarda impedindo um Vrock de sair da pedra."],
  ["Forjas Bélicas", "level-5", "Bairro do Eco", "eco", "military", null, "Forjas militares dedicadas do bairro do Eco."],
  ["Geotérmica Natural", "level-5", "Bairro do Eco", "eco", "other", null, "Fonte de aquecimento geotérmico intenso que move as forjas."],
  ["Subbairro Anão", "level-5", "Bairro do Eco", "eco", "other", "depra", "Onde o clã Depra se instala, próximo ao limite leste."],
  ["Centro de Tratamento", "level-6", "Fundo", "fundo", "civic", null, "Onde a água da cidade é tratada."],
  ["Poço Subterrâneo", "level-6", "Fundo", "fundo", "other", null, "A fonte de água profunda que abastece a cidade."],
  ["Templo Comunal", "level-4", "Quatro Céus", "quatro-ceus", "religious", null, "Templo compartilhado por Siarel, Crastus, Ganvartel, Eihla e cultos menores."],
  ["Biblioteca de Ganvartel", "level-4", "Quatro Céus", "quatro-ceus", "culture", null, "Biblioteca dedicada ao deus do conhecimento, no bairro dos templos."],
];

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// group by district to fan landmarks out around the shared anchor
const groups = new Map();
for (const row of SEED) {
  const key = `${row[1]}::${row[2]}`;
  (groups.get(key) ?? groups.set(key, []).get(key)).push(row);
}

const landmarks = [];
const missing = [];
for (const [key, rows] of groups) {
  const a = anchor.get(key);
  if (!a) {
    missing.push(key);
    continue;
  }
  const n = rows.length;
  const R = n === 1 ? 0 : n <= 4 ? 42 : 52;
  rows.forEach((row, i) => {
    const [name, level, , districtId, category, factionId, description] = row;
    // start at top, go clockwise; single item sits a touch above the anchor
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pos =
      n === 1
        ? { x: a.x, y: a.y - 34 }
        : { x: Math.round(a.x + R * Math.cos(angle)), y: Math.round(a.y + R * Math.sin(angle)) };
    const lm = {
      id: `lm-${slugify(name)}`,
      levelId: level,
      districtId,
      name,
      category,
      position: pos,
      description,
    };
    if (factionId) lm.factionId = factionId;
    landmarks.push(lm);
  });
}

if (missing.length) console.warn("! no anchor for:", missing.join(", "));

writeFileSync(
  annPath,
  JSON.stringify({ polygons: existing.polygons ?? {}, landmarks }, null, 2) + "\n",
);
console.log(`seeded ${landmarks.length} landmarks across ${groups.size} districts`);

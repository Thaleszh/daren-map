/* ------ members: the guild roster ------------------------------------------ */
// Started from the names on the expedition crews (docs/Anotações - Os Sem-Cores.pdf).
// [id, name, aliases, kind, status, description, statusNote]. kind is "mercenary"
// (goes out on jobs) or "civil" (usually stays); everyone starts as a mercenary
// since the crews are all we have — the GM reclassifies in the annotate tool.
// Dead/missing follow the Irvantir disaster (exp-irvantir) plus Kinnan; "left" = ex-members.
// Keruga was Kinnan's old name, so the early crews that say Keruga resolve to him.
export const MEMBERS = [
  ["nivy", "Nivy"],
  [
    "aiden",
    "Aiden",
    [],
    "mercenary",
    "missing",
    "",
    "Perdido em Irvantir com Emeria, na última sessão da mesa.",
  ],
  ["tristan", "Tristan", [], "mercenary", "left"],
  ["josh", "Josh"],
  ["zyra", "Zyra"],
  ["brin", "Brin", [], "mercenary", "left"],
  [
    "rhodd",
    "RhodD",
    ["Rhodd"],
    "mercenary",
    "dead",
    "Elo da guilda com a Inquisição, onde trabalhava. Venceu uma bruxa no soco.",
    "Morreu em Irvantir.",
  ],
  ["rimut", "Rimut"],
  ["nessy", "Nessy"],
  ["violetta", "Violetta"],
  ["nosk", "Nosk"],
  ["zaruni", "Zaruni"],
  ["elan", "Elan", [], "mercenary", "active", "Perdeu um braço na retomada da ponte dos Goblins."],
  [
    "kinnan",
    "Kinnan",
    ["Keruga", "Kinna"],
    "mercenary",
    "dead",
    "Keruga era o nome antigo dele (e também o de um demônio); nas primeiras expedições aparece como Keruga.",
  ],
  ["valorie", "Valorie"],
  [
    "jorbe",
    "Jorbe",
    ["Jorb"],
    "mercenary",
    "active",
    "Virou Encrustado na captura; a guilda o pesquisa e tenta reconstruí-lo.",
  ],
  ["miri", "Miri"],
  ["kaz", "Kaz"],
  [
    "emeria",
    "Emeria",
    [],
    "mercenary",
    "missing",
    "",
    "Perdida em Irvantir com Aiden, na última sessão da mesa.",
  ],
  ["ancora", "Âncora", [], "mercenary", "dead", "", "Afogou-se no lago em Irvantir."],
  ["sure", "Súre", [], "mercenary", "left"],
  ["patri", "Patri"],
  ["zygmunt", "Zygmunt", [], "mercenary", "left"],
  ["gael", "Gael"],
  ["colliva", "Colliva"],
  ["nevali", "Nevali"],
  ["thomas", "Thomas"],
  ["cithria", "Cithria"],
  [
    "taarak",
    "Taarak",
    [],
    "mercenary",
    "dead",
    "",
    "Matou-se em Irvantir ao perceber que virava um Encrustado.",
  ],
  ["ellan", "Ellan"],
  ["edochi", "Edochi"],
  [
    "draco",
    "Draco",
    [],
    "mercenary",
    "active",
    "Tem uma rede de parentes, comerciantes e contatos pessoais em Tarvos.",
  ],
  ["maiari", "Maiari"],
].map(
  ([
    id,
    name,
    aliases = [],
    kind = "mercenary",
    status = "active",
    description = "",
    statusNote = "",
  ]) => ({
    id,
    name,
    aliases,
    kind,
    status,
    description,
    statusNote,
  }),
);

// Crews are written by name above; resolve them to member ids (aliases included)
// and fail loudly on a name that isn't on the roster.
const memberIdByName = new Map(
  MEMBERS.flatMap((m) => [m.name, ...m.aliases].map((n) => [n.toLowerCase(), m.id])),
);
export const memberId = (name) => {
  const id = memberIdByName.get(name.toLowerCase());
  if (!id) throw new Error(`unknown member "${name}"`);
  return id;
};

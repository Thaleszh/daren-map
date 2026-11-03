// Brita spans two levels; Maringo and Jorbe aren't pinned to either slice.
const BRITA = ["brita@level-0", "brita@level-1"];

  // Initiatives are always the guild's (the player org). Owner isn't stored per
  // row; the view resolves it from meta.playerOrg. See schema InitiativeSchema.
export const INITIATIVES = [
  [
    "init-maringo",
    "Entender Maringo",
    "Entender Maringo e estudá-lo. Rimut, Valorie, Cithria.",
    BRITA,
    [],
    "active",
    [],
    50,
    "",
    [
      {
        title: "Revestimento tóxico descoberto",
        description:
          "A parte externa do fruto tem um revestimento tóxico, que filtra o que entra e absorve no interior. O fruto fica exposto a um gás com essas propriedades, difícil de reproduzir fora do ambiente dele.",
        progress: 50,
      },
      {
        title: "Próximos passos",
        description: "Plantá-los mesmo assim; tentar entender o brilho de magia.",
      },
    ],
    ["Rimut", "Valorie", "Cithria"],
  ],
  [
    "init-orfanato-escola",
    "Orfanato / Escola dos Sem Cores",
    "",
    ["refugio@level-2"],
    ["lm-orfanato-de-daren"],
  ],
  ["init-leitura", "Distribuição e oficina de Leitura", ""],
  ["init-magica-para-todos", "Mágica para todos", ""],
  // Superseded by init-pesquisa-jorbe; halted for lack of the metal.
  [
    "init-reconstruir-jorbe",
    "Reconstruir Jorbe",
    "Reconstruir o Jorbe.",
    BRITA,
    [],
    "paused",
    ["init-pesquisa-jorbe"],
    10,
    "",
    [
      {
        title: "Substituída pela pesquisa de Jorbe com a slime",
        description: 'Passa a ser tocada pela iniciativa "Reativar pesquisa do Jorbe".',
        progress: 10,
      },
      {
        title: "Pausada: falta metal",
        description: "Precisam de mais do metal, uma liga específica infundida com magia.",
        status: "paused",
      },
    ],
  ],
  [
    "init-memorial",
    "Memorial",
    "Planejar e realizar o memorial.",
    [],
    [],
    "active",
    [],
    40,
    "",
    [
      {
        title: "Planejamento e agenda",
        description: "Estão planejando e agendando o memorial.",
        progress: 40,
      },
    ],
  ],
  [
    "init-pesquisa-jorbe",
    "Reativar pesquisa do Jorbe",
    "Retomar a pesquisa do Jorbe junto com a da slime adjacente. Kaz e Rimut direcionam.",
    BRITA,
    [],
    "active",
    ["init-reconstruir-jorbe"],
    20,
    "",
    [
      {
        title: "Semelhanças entre o metal e a slime",
        description:
          "Descobriram semelhanças entre a magia que infundiu o metal de Jorbe e a pele da slime.",
        progress: 20,
      },
    ],
    ["Kaz", "Rimut"],
  ],
  [
    "init-avaliar-recrutas",
    "Avaliar candidatos à guilda",
    "Avaliar a série de pessoas que querem entrar na guilda. Draco, Josh e Zaruni participam.",
    [],
    [],
    "active",
    [],
    25,
    "",
    [
      {
        title: "Triagem em andamento",
        description: "Há muita gente para filtrar, entre veteranos e testes.",
        progress: 25,
      },
      {
        title: "Eline nos testes",
        description:
          "Eline, a inquisidora, é refinada no florete e não se importa em vencer, mas exibiu o 'tiro de florete' como truque.",
      },
    ],
    ["Draco", "Josh", "Zaruni"],
  ],
  [
    "init-rede-tarvos",
    "Rede de informação e comunicação em Tarvos",
    "Rede de informação e comunicação em Tarvos.",
    [],
    [],
    "active",
    ["init-rede-langriz"],
    100,
    "Por ora, a rede é confiável para informações comuns.",
    [
      {
        title: "Rede montada",
        description: "Parentes, comerciantes e contatos pessoais de Draco.",
        progress: 100,
        status: "active",
      },
    ],
  ],
  [
    "init-rede-langriz",
    "Rede de informação e comunicação em Langriz",
    "Rede de informação e comunicação em Langriz.",
    [],
    [],
    "active",
    ["init-rede-tarvos"],
    100,
    "Dá acesso a informações comuns.",
    [
      {
        title: "Rede montada",
        description: "Contatos de pessoas que vivem na cidade.",
        progress: 100,
        status: "active",
      },
    ],
  ],
  // Installed and running for good: fully set up (100%), but never "completed".
  [
    "init-aulas-criancas",
    "Aulas e treinamentos para crianças",
    "",
    ["refugio@level-2"],
    ["lm-orfanato-de-daren"],
    "active",
    ["init-orfanato-escola"],
    100,
  ],
];

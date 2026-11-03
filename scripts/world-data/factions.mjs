/* ------ factions: roster distilled from "Grupos e Pessoas" ---------------- */
// The old single "Regência" is split into the powers behind it (Cadros, Sevori,
// Administração); "Regência" comes back later as a *grouping*, not a faction.
// The Guarda is likewise not a faction: it's the rank and file of the military.
export const FACTIONS = [
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
  ["foragidos-leste", "Foragidos do Leste", "FL", "#9c7a5a", false, "Fugitivos das montanhas a caminho de Langris — Miguel, Lizara, Neves e Gantu e quem mais os acompanha. A guilda os encontrou e não os entregou à Guarda."],
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
  ["inq-eline", "Inquisidora Eline", "IE", "#c0c8d8", false, "Inquisidora vinda de Tarvos; luta com um florete. Está preenchendo os formulários e o pedido para entrar na guilda como mercenária."],
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
export const GROUPINGS = [
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
      ["g-ordens", "Ordens", "OD", "#9aa3b8", "Ordens com autoridade própria que cruzam a cidade.", ["inquisicao", "inq-guva", "inq-torenno", "inq-aissa", "inq-zacras", "inq-cannivra", "inq-eline"]],
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
    // artesãos, operários, comerciantes) are the general population, not a
    // party the guild deals with, so they're left out and the Relações view
    // skips them. The Brita mages (magos) joined once the guild worked for them.
    id: "relacao",
    name: "Relação com os Sem Cores",
    description: "Como cada facção vê a organização dos jogadores.",
    groups: [
      ["g-aliadas", "Aliadas", "AL", "#48a67a", "Trabalham com os Sem Cores.", []],
      ["g-relacao-neutras", "Neutras", "NT", "#8a8f99", "Ainda não tomaram partido.", ["cadros", "sevori", "quadrados", "exploradores", "reclusos", "tevaro", "dera", "dufey", "depra", "kapli", "erius", "gevel", "ortar", "medera", "amira", "trani", "irassi", "circo", "inquisicao", "casa-real", "irassi-terina", "magos", "foragidos-leste"]],
      ["g-hostis", "Hostis", "HO", "#b23b3b", "Veem os Sem Cores como ameaça.", []],
      // Each inquisitor deals with the guild on their own terms; the Relações
      // view lists this group apart, after everyone else.
      ["g-inquisidores", "Inquisidores", "IQ", "#9aa3b8", "Os inquisidores, cada um com sua própria relação com a guilda.", ["inq-guva", "inq-torenno", "inq-aissa", "inq-zacras", "inq-cannivra", "inq-eline"]],
    ],
  },
];

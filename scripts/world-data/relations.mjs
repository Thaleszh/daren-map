/* ------ relations: the guild's history with each faction ------------------ */
// Distilled from the session notes (docs/Anotações - Os Sem-Cores.pdf). Effects
// are a first-pass read (−5..+5) the GM tunes in the annotate tool's "Relações";
// 0 = worth remembering, didn't move anything. Stance lives in GROUPINGS.relacao.
export const RELATIONS = [
  {
    factionId: "inq-eline",
    summary: "Inquisidora de Tarvos que quer entrar na guilda como mercenária.",
    events: [
      { date: "", title: "Pedido para entrar na guilda", effect: 0, description: "Eline está preenchendo os formulários e o pedido para se juntar aos Sem Cores como mercenária." },
    ],
  },
  {
    factionId: "foragidos-leste",
    summary: "Devem à guilda por não terem sido entregues à Guarda — mas o contato morreu depois disso.",
    events: [
      { date: "2024-07-25", title: "Não foram entregues", effect: 3, expeditionId: "exp-fugitivos", description: "A guilda os encontrou na missão dos fugitivos, mentiu à Guarda sobre o motivo e não os entregou." },
      { date: "", title: "Sem contato desde então", effect: -1, description: "Não houve mais contato com eles depois da missão." },
    ],
  },
  {
    factionId: "magos",
    summary: "Os magos da Brita já chegam desconfiando dos Sem Cores, mas a guilda lhes prestou um bom serviço nas montanhas.",
    events: [
      { date: "", title: "Rumores ruins", effect: -5, description: "Começam com má fama ao redor dos Sem Cores, por rumores ruins." },
      { date: "", title: "Vigia nas montanhas do leste", effect: 2, expeditionId: "exp-vigia-magos", description: "A guilda instalou o bastão de previsão do tempo e observação no topo da montanha." },
    ],
  },
  {
    factionId: "inquisicao",
    summary: "A ordem como um todo; na prática a guilda lida com cada inquisidor em separado.",
    events: [
      { date: "2025-09-16", title: "Patrocínio da exploração de Irvantir", effect: 1, expeditionId: "exp-irvantir", description: "A Inquisição bancou a expedição da própria guilda — que terminou em desastre." },
      { date: "", title: "RhodD, membro da guilda", effect: 2, description: "RhodD era membro dos Sem Cores e o elo da guilda com a Inquisição. Morreu em Irvantir; o efeito deve expirar em breve." },
    ],
  },
  {
    factionId: "inq-guva",
    summary: "O contratante mais antigo da guilda: acha os Sem Cores fortes e úteis.",
    events: [
      { date: "2023-01-11", title: "O forte dos mortos-vivos cai", effect: 2, expeditionId: "exp-forte-mortos-vivos", description: "O não-morto foi eliminado e o forte destruído. Guva saiu impressionado." },
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
    summary: "Gosta do Nivy e do torneio, aprova o trabalho na cidade — mas acha a guilda política demais.",
    events: [
      { date: "", title: "Gosta do Nivy", effect: 2, description: "Aissa gosta do Nivy, um dos líderes da guilda." },
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
    summary: "Inelissa lutou ao lado da guilda e Josh é devoto — mas boa parte da guilda é abertamente hostil a Terina.",
    events: [
      { date: "2023-10-30", title: "Inelissa no Monumento Vrock", effect: 1, expeditionId: "exp-monumento-vrock", description: "A devota Inelissa lutou ao lado da guilda e reconheceu a torre como um templo de Terina em construção." },
      { date: "", title: "Josh, devoto de Terina", effect: 2, description: "Josh é membro ativo dos Sem Cores e devoto de Terina." },
      { date: "", title: "Hostilidade aberta a Terina", effect: -3, description: "Outros membros da guilda são abertamente hostis a Terina." },
    ],
  },
  {
    factionId: "erius",
    summary: "Parceiros de pesquisa: túneis, Encrustados e Jorbe — embora achem a guilda presa a coisas mundanas.",
    events: [
      { date: "", title: "Pesquisa nos túneis", effect: 2, description: "A guilda fez trabalhos de pesquisa nos túneis para os Erius." },
      { date: "", title: "Tentativa de capturar um Encrustado", effect: 1, expeditionId: "exp-capturar-encrustado", description: "A guilda tentou capturar um Encrustado para eles." },
      { date: "", title: "Pesquisa do Encrustado de Jorbe", effect: 4, description: "A guilda pesquisou o Encrustado de Jorbe junto com os Erius." },
      { date: "2023-10-30", title: "Informações sobre o Monumento Vrock", effect: 1, expeditionId: "exp-monumento-vrock", description: "A guilda voltou sabendo que era um templo de Terina em construção, apesar do confronto com os Vrocks." },
      { date: "2025-09-16", title: "A guilda vai a Irvantir", effect: 1, expeditionId: "exp-irvantir", description: "Os Erius têm a ida a Irvantir em alta conta." },
      { date: "", title: "Preocupados com coisas mundanas", effect: -2, description: "Para os Erius, a guilda se preocupa demais com coisas mundanas." },
    ],
  },
  {
    factionId: "medera",
    summary: "Antônio gosta da guilda: o pântano foi um sucesso para ele, e a carroça ainda está para ser terminada.",
    events: [
      { date: "", title: "Escolta do Antônio ao pântano", effect: 2, expeditionId: "exp-antonio-pantano", description: "Antônio foi levado às autoridades do pântano, em meio a uma guerra, e a guilda aceitou um assassinato improvisado que não deu muito certo. Este bônus saiu do que Antônio já gostava da guilda." },
      { date: "2024-04-04", title: "Escolta no pântano", effect: 2, expeditionId: "exp-escolta-pantano", description: "O primeiro contato dos Medera com os goblins. O emissário do Rei Seco foi assassinado e a guilda fugiu com Antônio — mas, para ele, a missão foi um grande sucesso." },
      { date: "2024-09-26", title: "A carroça perdida em Antrus", effect: 0, expeditionId: "exp-carroca-desaparecida", description: "O rastro levou a Antrus, infestada de mortos-vivos, e a guilda recuou sem a carroça. Os Medera não veem como fracasso — querem que o trabalho seja terminado." },
      { date: "2025-08-12", title: "Querem informação de Irvantir", effect: 1, description: "A família de Antônio pagaria por informação privilegiada sobre Irvantir por um tempo." },
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
      { date: "", title: "A ponte para Tarvos", effect: 2, expeditionId: "exp-ponte-goblins", description: "A guilda retomou a ponte dos Goblins, que liga Daren a Tarvos." },
      { date: "", title: "Bom trabalho nos arredores", effect: 2, description: "A guilda fez bons trabalhos nos arredores da cidade." },
      { date: "", title: "Gente perigosa organizada", effect: -4, description: "Os Sem Cores reúnem indivíduos ameaçadores de forma organizada." },
    ],
  },
  {
    factionId: "casa-real",
    summary: "Vê a guilda como os Cadros a veem — com o crédito extra de RhodD na Inquisição.",
    events: [
      { date: "", title: "A ponte para Tarvos", effect: 2, expeditionId: "exp-ponte-goblins", description: "A guilda retomou a ponte dos Goblins, que liga Daren a Tarvos." },
      { date: "", title: "Bom trabalho nos arredores", effect: 2, description: "A guilda fez bons trabalhos nos arredores da cidade." },
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
    summary: "Não se importariam se a guilda desse fim a Cannivra — e a guilda não o fez.",
    events: [
      { date: "", title: "Cannivra segue viva", effect: -1, description: "Os Sevori disseram que não se importariam se a guilda matasse a inquisidora Cannivra, mas a guilda não agiu." },
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
      { date: "", title: "A ponte para Tarvos", effect: 4, expeditionId: "exp-ponte-goblins", description: "A guilda e Zacras libertaram juntos a ponte para Tarvos da ocupação goblin." },
      { date: "", title: "Um grupo político", effect: -5, description: "Zacras quer evitar conflitos entre os habitantes e acha as intrigas um desperdício; a guilda é política demais." },
    ],
  },
];

/* ------ DLC "por bairro": filled-in districts from DLC Daren --------------- */
// id → { description?, demographics?, qualityOfLife?, history[], events[], relations[], rumors[] }
export const DISTRICT_DLC = {
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

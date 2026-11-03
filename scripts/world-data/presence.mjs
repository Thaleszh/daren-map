/* ------ influence seed: lore-grounded, keyed by "district@level" ---------- */
// [factionId, influence(0-20), power(0-20)]
// Administração is the everyday state everywhere; Cadros and Sevori concentrate
// where the regency actually sits (Forte, Alta Daren, the courts, the clergy).
// Worker factions (Produtores, Artesãos, Operários, Comerciantes) are the mass
// of the city but hold few of its levers: low influence, power kept for numbers.
// Each quartel leans to its military currents: Topo → Avancistas + Exploradores,
// Nível 2 → Reclusos + Exploradores, Selado → Reclusos. Worker factions
// carry the labour-heavy districts; Depra runs the works below.
export const PRESENCE = {
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

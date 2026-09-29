import type { SocialClass } from "@/domain/schema";

/** Label (pt-BR) + color per social class. */
export const CLASS_META: Record<SocialClass, { label: string; color: string }> = {
  elite: { label: "Elite / Nobreza", color: "#c9a24b" },
  media: { label: "Classe média", color: "#5f8fb0" },
  trabalhadora: { label: "Trabalhadora", color: "#7a8a5f" },
  pobre: { label: "Pobre / Marginal", color: "#9a6a6a" },
};

/** Fixed colors for the common occupations; anything else falls back by hash. */
const OCCUPATION_COLORS: Record<string, string> = {
  Guarda: "#b23b3b",
  Produção: "#6b8e23",
  "Artesanato e Minas": "#c9773f",
  Obras: "#5c7a8a",
  Comércio: "#c9a227",
  Serviços: "#6fae7a",
  Administração: "#3f7fb0",
  "Saber e Magia": "#6b5bd6",
  Fé: "#d8c33a",
  "Cultura e Lazer": "#d066a0",
};

const FALLBACK = ["#7f8ca3", "#a0785f", "#5f9a8a", "#9a7fb0", "#b0925f"];

export function occupationColor(name: string): string {
  const hit = OCCUPATION_COLORS[name];
  if (hit) return hit;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length]!;
}

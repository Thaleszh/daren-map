import type { Race } from "@/domain/schema";

/** Label (pt-BR) and color for each ancestry bucket. */
export const RACE_META: Record<Race, { label: string; color: string }> = {
  human: { label: "Humanos", color: "#7d8a5f" },
  dwarf: { label: "Anões", color: "#b6884a" },
  elf: { label: "Elfos", color: "#5fa87a" },
  other: { label: "Outros", color: "#8a7fb0" },
};

/** Format a headcount compactly (1.2k, 130k). */
export function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

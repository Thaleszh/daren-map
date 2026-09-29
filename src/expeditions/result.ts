import type { ExpeditionResult } from "@/domain/schema";

/** Per-result label + color, used for the chip and the card accent. */
export const RESULT_META: Record<ExpeditionResult, { label: string; color: string }> = {
  ongoing: { label: "Em andamento", color: "#e4c65b" },
  success: { label: "Sucesso", color: "#4fb477" },
  partial: { label: "Parcial", color: "#d9a04f" },
  failure: { label: "Fracasso", color: "#d05a5a" },
  unknown: { label: "Sem registro", color: "#6b7488" },
};

/** "2025-09-16" → "16/09/2025"; "" stays "". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** "16/09/2025 – 16/12/2025", collapsing a one-day arc; "" when undated. */
export function formatSpan(start: string, end: string): string {
  if (!start) return formatDate(end);
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

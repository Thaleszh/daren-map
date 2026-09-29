import type { InitiativeStatus } from "@/domain/schema";

/** Per-status label + color, used for the chip and the progress fill. */
export const STATUS_META: Record<InitiativeStatus, { label: string; color: string }> = {
  planned: { label: "Planejada", color: "#6b7488" },
  active: { label: "Em andamento", color: "#e4c65b" },
  completed: { label: "Concluída", color: "#4fb477" },
  failed: { label: "Fracassada", color: "#d05a5a" },
  abandoned: { label: "Abandonada", color: "#8a7bb0" },
};

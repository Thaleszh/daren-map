import type { InitiativeStatus } from "@/domain/schema";

/** Per-status label + color, used for the chip and the progress fill. */
export const STATUS_META: Record<InitiativeStatus, { label: string; color: string }> = {
  planned: { label: "Planejada", color: "#6b7488" },
  active: { label: "Em andamento", color: "#e4c65b" },
  paused: { label: "Pausada", color: "#d98f4e" },
  completed: { label: "Concluída", color: "#4fb477" },
  failed: { label: "Fracassada", color: "#d05a5a" },
  abandoned: { label: "Abandonada", color: "#8a7bb0" },
};

/** Ongoing at 100%: finished and in effect, so it reads differently from "Em andamento". */
export const IN_EFFECT_META = { label: "Em vigor", color: "#4fb477" };

/** Meta for a whole initiative (status + progress); use instead of STATUS_META[status] for chips. */
export function initiativeMeta(i: { status: InitiativeStatus; progress: number }) {
  return i.status === "active" && i.progress >= 100 ? IN_EFFECT_META : STATUS_META[i.status];
}

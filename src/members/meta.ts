import type { MemberKind, MemberStatus } from "@/domain/schema";

export const KIND_META: Record<MemberKind, { label: string; plural: string; hint: string }> = {
  mercenary: { label: "Mercenário", plural: "Mercenários", hint: "Sai em missões" },
  civil: { label: "Civil", plural: "Civis", hint: "Costuma ficar na guilda" },
};

/** Everyone but the active gets a colored chip. */
export const STATUS_META: Record<MemberStatus, { label: string; color: string }> = {
  active: { label: "Ativo", color: "#4fb477" },
  left: { label: "Ex-membro", color: "#6b7488" },
  dead: { label: "Morto", color: "#d05a5a" },
  missing: { label: "Desaparecido", color: "#d9a04f" },
};

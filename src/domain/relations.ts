import type { Atlas } from "./selectors";
import type { Faction, FactionGroup, FactionRelation, RelationEvent } from "./schema";
import type { FactionId, GroupingId } from "./ids";

/**
 * The guild's standing with every other faction — derived, never stored. Each
 * event's effect moves a balance graded from −10 to +10, and the balance falls
 * in a named tier (Aliado, Simpatizante…). Who is a party to relations at all
 * comes from the "Relação com os Sem Cores" grouping.
 */

/** The grouping whose members are the factions the guild has relations with. */
export const RELATION_GROUPING_ID = "relacao" as GroupingId;

/**
 * The group of that grouping listed apart, after everyone else: the inquisitors
 * are individuals with their own terms, not blocs to rank alongside the rest.
 */
export const RELATION_APART_GROUP_ID = "g-inquisidores" as FactionId;

export const RELATION_MIN = -10;
export const RELATION_MAX = 10;

export interface RelationTier {
  label: string;
  color: string;
  /** Lowest balance in this tier (inclusive). */
  min: number;
}

/**
 * Each half of the scale is split in quarters (2.5 points), warmest first. The
 * positive names are the table's; the negative ones mirror them. Neutro spans
 * both sides of zero.
 */
export const RELATION_TIERS: readonly RelationTier[] = [
  { label: "Aliado", color: "#4fb477", min: 8 },
  { label: "Simpatizante", color: "#7fbf6a", min: 5 },
  { label: "Em boa imagem", color: "#b5c46a", min: 3 },
  { label: "Neutro", color: "#8a8f99", min: -2 },
  { label: "Mal visto", color: "#d9a04f", min: -4 },
  { label: "Hostil", color: "#d9774f", min: -7 },
  { label: "Inimigo", color: "#d05a5a", min: RELATION_MIN },
];

export function relationTier(balance: number): RelationTier {
  return RELATION_TIERS.find((t) => balance >= t.min) ?? RELATION_TIERS.at(-1)!;
}

/** The guild's standing with one faction, as the Relações view lists it. */
export interface RelationRow {
  faction: Faction;
  /** Where the history has pushed the relation, within −10..+10. */
  balance: number;
  tier: RelationTier;
  relation: FactionRelation | undefined;
  /** Set when the faction belongs to the group listed apart (the inquisitors). */
  apart: FactionGroup | undefined;
}

/** A history event plus the balance (and tier) it left the relation at. */
export interface RelationStep {
  event: RelationEvent;
  balance: number;
  tier: RelationTier;
}

/**
 * A faction's history oldest first, each event with the balance it left the
 * relation at. The balance saturates at the ends of the scale: past +10 a
 * favor banks nothing, so the next slight costs from 10. Undated events keep
 * their authored order, after the dated ones.
 */
export function relationTimeline(atlas: Atlas, id: FactionId): RelationStep[] {
  return relationSteps(atlas.relation(id)?.events ?? []);
}

/** {@link relationTimeline} over a bare event list (e.g. an unsaved edit). */
export function relationSteps(events: readonly RelationEvent[]): RelationStep[] {
  const sorted = [...events].sort(
    (a, b) => Number(!a.date) - Number(!b.date) || a.date.localeCompare(b.date),
  );
  let balance = 0;
  return sorted.map((event) => {
    balance = Math.max(RELATION_MIN, Math.min(RELATION_MAX, balance + event.effect));
    return { event, balance, tier: relationTier(balance) };
  });
}

/**
 * The factions the guild deals with — members of the relation grouping — with
 * their graded balance. Factions left out of it (the workforce blocs, the
 * general population) aren't a party to relations and are skipped, unless a
 * history was recorded for them anyway, so none is ever hidden. The apart group
 * comes last; within each part, warmest first, then by name.
 */
export function relationRows(atlas: Atlas): RelationRow[] {
  const groups = atlas.world.groupings.find((g) => g.id === RELATION_GROUPING_ID)?.groups ?? [];
  const placed = new Set(groups.flatMap((g) => g.members));
  const apartGroup = groups.find((g) => g.id === RELATION_APART_GROUP_ID);
  return atlas.world.factions
    .filter((f) => !f.isPlayerOrg)
    .map((faction) => {
      const balance = relationTimeline(atlas, faction.id).at(-1)?.balance ?? 0;
      return {
        faction,
        balance,
        tier: relationTier(balance),
        relation: atlas.relation(faction.id),
        apart: apartGroup?.members.includes(faction.id) ? apartGroup : undefined,
      };
    })
    .filter((r) => placed.has(r.faction.id) || r.relation)
    .sort(
      (a, b) =>
        Number(Boolean(a.apart)) - Number(Boolean(b.apart)) ||
        b.balance - a.balance ||
        a.faction.name.localeCompare(b.faction.name),
    );
}

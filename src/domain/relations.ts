import type { Atlas } from "./selectors";
import type { Faction, FactionGroup, FactionRelation, RelationEvent } from "./schema";
import type { FactionId, GroupingId } from "./ids";

/**
 * The guild's standing with every other faction — derived, never stored. Stance
 * comes from the "Relação com os Sem Cores" grouping (so the map's grouped lens
 * and the Relações view agree); the balance is the sum of the history's effects.
 */

/** The grouping whose groups are the guild's stance buckets (Aliadas/Neutras/Hostis). */
export const RELATION_GROUPING_ID = "relacao" as GroupingId;

/** The guild's standing with one faction, as the Relações view lists it. */
export interface RelationRow {
  faction: Faction;
  /** Its group in the "Relação com os Sem Cores" grouping, if placed in one. */
  stance: FactionGroup | undefined;
  /** Σ event effects — where the history has pushed the relation. */
  balance: number;
  relation: FactionRelation | undefined;
}

/** A history event plus the running balance right after it. */
export interface RelationStep {
  event: RelationEvent;
  balance: number;
}

/**
 * The factions the guild deals with — those placed in the stance grouping —
 * with their stance and history balance. Factions left out of it (the workforce
 * blocs, the general population) aren't a party to relations and are skipped,
 * unless a history was recorded for them anyway, so none is ever hidden. Ordered
 * by stance (in the grouping's group order, unplaced last), then warmest
 * balance first, then name.
 */
export function relationRows(atlas: Atlas): RelationRow[] {
  const groups = atlas.world.groupings.find((g) => g.id === RELATION_GROUPING_ID)?.groups ?? [];
  const order = new Map(groups.map((g, i) => [g.id, i]));
  const rank = (r: RelationRow) => (r.stance ? order.get(r.stance.id)! : order.size);
  return atlas.world.factions
    .filter((f) => !f.isPlayerOrg)
    .map((faction) => {
      const relation = atlas.relation(faction.id);
      return {
        faction,
        stance: groups.find((g) => g.members.includes(faction.id)),
        balance: relation?.events.reduce((sum, e) => sum + e.effect, 0) ?? 0,
        relation,
      };
    })
    .filter((r) => r.stance || r.relation)
    .sort(
      (a, b) =>
        rank(a) - rank(b) || b.balance - a.balance || a.faction.name.localeCompare(b.faction.name),
    );
}

/**
 * A faction's history oldest first, each event with the balance it left the
 * relation at. Undated events keep their authored order, after the dated ones.
 */
export function relationTimeline(atlas: Atlas, id: FactionId): RelationStep[] {
  const events = atlas.relation(id)?.events ?? [];
  const sorted = [...events].sort(
    (a, b) => Number(!a.date) - Number(!b.date) || a.date.localeCompare(b.date),
  );
  let balance = 0;
  return sorted.map((event) => ({ event, balance: (balance += event.effect) }));
}

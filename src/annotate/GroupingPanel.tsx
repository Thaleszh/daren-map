import { useState } from "react";
import type { Atlas } from "@/domain/selectors";
import type { Faction } from "@/domain/schema";
import type { useAnnotations } from "./useAnnotations";
import { mergedFactions } from "./PresencePanel";

interface GroupingPanelProps {
  atlas: Atlas;
  ann: ReturnType<typeof useAnnotations>;
}

const NO_GROUP = "";

/**
 * Move factions between the groups of a grouping (e.g. Neutras → Aliadas in
 * "Relação com os Sem Cores"). Groups themselves come from the generator; only
 * who sits where is authored here.
 */
export function GroupingPanel({ atlas, ann }: GroupingPanelProps) {
  const groupings = atlas.world.groupings;
  const [groupingId, setGroupingId] = useState<string>(groupings[0]?.id ?? "");
  const grouping = groupings.find((g) => g.id === groupingId);

  if (!grouping) {
    return (
      <>
        <div className="panel__section-title">Agrupamentos</div>
        <p className="annot-note">Nenhum agrupamento definido no gerador.</p>
      </>
    );
  }

  // Current group = session override if any, else the loaded (file-merged) world.
  const loadedGroupOf = new Map<string, string>();
  for (const g of grouping.groups) for (const m of g.members) loadedGroupOf.set(m, g.id);
  function current(factionId: string): { groupId: string; edited: boolean } {
    const o = ann.annotations.memberships.find(
      (m) => m.groupingId === grouping!.id && m.factionId === factionId,
    );
    if (o) return { groupId: o.groupId ?? NO_GROUP, edited: true };
    return { groupId: loadedGroupOf.get(factionId) ?? NO_GROUP, edited: false };
  }

  const factions = mergedFactions(atlas, ann.annotations.factions);
  const sections: { id: string; name: string; color?: string; factions: Faction[] }[] = [
    ...grouping.groups.map((g) => ({
      id: g.id as string,
      name: g.name,
      color: g.color,
      factions: [] as Faction[],
    })),
    { id: NO_GROUP, name: "Sem grupo (aparece como ela mesma)", factions: [] },
  ];
  for (const f of factions) {
    sections.find((s) => s.id === current(f.id).groupId)?.factions.push(f);
  }

  return (
    <>
      <div className="panel__section-title">Agrupamentos</div>
      <label className="annot-field">
        Agrupamento
        <select value={grouping.id} onChange={(e) => setGroupingId(e.target.value)}>
          {groupings.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {grouping.description && <p className="annot-note">{grouping.description}</p>}

      {sections.map((section) => (
        <div key={section.id || "none"}>
          <div className="panel__subtitle grouping-head">
            {section.color && (
              <span className="standing__swatch" style={{ background: section.color }} />
            )}
            {section.name} ({section.factions.length})
          </div>
          {section.factions.map((f) => {
            const { groupId, edited } = current(f.id);
            return (
              <div
                key={f.id}
                className={"presence-row grouping-row" + (edited ? " presence-row--edited" : "")}
              >
                <div className="presence-row__name">
                  <span className="standing__swatch" style={{ background: f.color }} />
                  {f.name}
                </div>
                <select
                  aria-label={`Grupo de ${f.name}`}
                  value={groupId}
                  onChange={(e) => ann.setMembership(grouping.id, f.id, e.target.value || null)}
                >
                  {grouping.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  <option value={NO_GROUP}>— sem grupo —</option>
                </select>
                {edited ? (
                  <button
                    type="button"
                    className="grouping-row__revert"
                    title="Voltar ao grupo gerado"
                    onClick={() => ann.clearMembership(grouping.id, f.id)}
                  >
                    ↺
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

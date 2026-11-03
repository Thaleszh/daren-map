import type { Atlas } from "@/domain/selectors";
import type { MemberId } from "@/domain/ids";
import { STATUS_META } from "./meta";

/** † for the dead, ? for the missing — so a crew list shows who didn't come back. */
const MARK = { active: "", left: "", dead: "†", missing: "?" } as const;

/**
 * A row of member chips, each a link into the Membros view. Shared by the
 * expedition and initiative details so a name reads the same everywhere.
 */
export function MemberChips({
  atlas,
  ids,
  onOpenMember,
}: {
  atlas: Atlas;
  ids: readonly MemberId[];
  onOpenMember: (id: MemberId) => void;
}) {
  return (
    <div>
      {ids.map((id) => {
        const member = atlas.member(id);
        if (!member) return null;
        const meta = STATUS_META[member.status];
        return (
          <button
            type="button"
            key={id}
            className="chip chip--link"
            title={member.status === "active" ? undefined : meta.label}
            onClick={() => onOpenMember(id)}
          >
            {member.name}
            {MARK[member.status] && (
              <span className="chip__mark" style={{ color: meta.color }}>
                {MARK[member.status]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

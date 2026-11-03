import { useCallback } from "react";
import type { Member } from "@/domain/schema";
import type { MemberId } from "@/domain/ids";
import { uniqueId, type SetAnnotations } from "./useAnnotationEdits";

export type NewMember = Omit<Member, "id">;

export function useMemberEdits(setAnnotations: SetAnnotations) {
  const addMember = useCallback(
    (member: NewMember, takenIds: string[]): string => {
      const id = uniqueId(member.name, "membro", new Set(takenIds));
      setAnnotations((a) => ({ ...a, members: [...a.members, { ...member, id: id as MemberId }] }));
      return id;
    },
    [setAnnotations],
  );

  /** Override a generated (or annotation) member by writing an entry with its id. */
  const upsertMember = useCallback(
    (member: Member) => {
      setAnnotations((a) => {
        const exists = a.members.some((m) => m.id === member.id);
        return {
          ...a,
          members: exists
            ? a.members.map((m) => (m.id === member.id ? member : m))
            : [...a.members, member],
        };
      });
    },
    [setAnnotations],
  );

  /** Drop a member override (reverts a generated one; removes a new one). */
  const removeMember = useCallback(
    (id: string) => {
      setAnnotations((a) => ({ ...a, members: a.members.filter((m) => m.id !== id) }));
    },
    [setAnnotations],
  );

  return { addMember, upsertMember, removeMember };
}

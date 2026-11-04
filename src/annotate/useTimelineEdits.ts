import { useCallback } from "react";
import type { TimelineEvent } from "@/domain/schema";
import type { TimelineEventId } from "@/domain/ids";
import { uniqueId, type SetAnnotations } from "./useAnnotationEdits";

export type NewTimelineEvent = Omit<TimelineEvent, "id">;

export function useTimelineEdits(setAnnotations: SetAnnotations) {
  const addTimelineEvent = useCallback(
    (ev: NewTimelineEvent, takenIds: string[]): string => {
      const id = uniqueId(`tl ${ev.title}`, "tl", new Set(takenIds));
      setAnnotations((a) => ({
        ...a,
        timeline: [...a.timeline, { ...ev, id: id as TimelineEventId }],
      }));
      return id;
    },
    [setAnnotations],
  );

  /** Override a generated (or annotation) event by writing an entry with its id. */
  const upsertTimelineEvent = useCallback(
    (ev: TimelineEvent) => {
      setAnnotations((a) => {
        const exists = a.timeline.some((t) => t.id === ev.id);
        return {
          ...a,
          timeline: exists ? a.timeline.map((t) => (t.id === ev.id ? ev : t)) : [...a.timeline, ev],
        };
      });
    },
    [setAnnotations],
  );

  /** Drop an event override (reverts a generated one; removes a new one). */
  const removeTimelineEvent = useCallback(
    (id: string) => {
      setAnnotations((a) => ({ ...a, timeline: a.timeline.filter((t) => t.id !== id) }));
    },
    [setAnnotations],
  );

  return { addTimelineEvent, upsertTimelineEvent, removeTimelineEvent };
}

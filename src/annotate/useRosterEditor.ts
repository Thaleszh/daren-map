import { useState } from "react";

/** Sentinel id for the "composing a brand-new entry" mode. */
export const NEW = "__new__";

/**
 * The edit-one-or-create-new state machine shared by the faction / npc roster
 * panels: which row is open (`NEW` while composing a fresh entry) and its form.
 * Callers map their entity into the form shape when they open an edit.
 */
export function useRosterEditor<F>(empty: F) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<F>(empty);
  return {
    editingId,
    form,
    setForm,
    startEdit: (id: string, f: F) => {
      setEditingId(id);
      setForm(f);
    },
    startNew: () => {
      setEditingId(NEW);
      setForm(empty);
    },
    cancel: () => {
      setEditingId(null);
      setForm(empty);
    },
  };
}

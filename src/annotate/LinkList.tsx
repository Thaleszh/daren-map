/** Generated/file entities overlaid with session edits + additions, by id. */
export function mergeById<T extends { id: unknown }>(
  base: readonly T[],
  session: readonly T[],
): T[] {
  const map = new Map<string, T>();
  for (const x of base) map.set(String(x.id), x);
  for (const x of session) map.set(String(x.id), x);
  return [...map.values()];
}

export interface LinkOption {
  id: string;
  label: string;
}

/** A set of links: current picks with a remove button, plus a picker for the rest. */
export function LinkList({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: LinkOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const available = options.filter((o) => !value.includes(o.id));
  return (
    <div className="annot-field">
      <span>{label}</span>
      {value.map((id) => (
        <div key={id} className="init-linkrow">
          <span>{byId.get(id)?.label ?? id}</span>
          <button
            type="button"
            className="init-linkrow__remove"
            aria-label={`Remover ${byId.get(id)?.label ?? id}`}
            onClick={() => onChange(value.filter((v) => v !== id))}
          >
            ×
          </button>
        </div>
      ))}
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
        disabled={available.length === 0}
      >
        <option value="">+ adicionar…</option>
        {available.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * `useState` mirrored to `localStorage` under `key` — a plain client preference,
 * never world data. The stored JSON is accepted only if `isValid` passes, so a
 * stale or hand-corrupted value falls back to `initial` instead of poisoning the
 * UI (e.g. a lens key that was renamed since the value was written).
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid?: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      if (isValid && !isValid(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — the value still lives for this session */
    }
  }, [key, value]);

  return [value, setValue];
}

import { useEffect, useState } from "react";

/**
 * Display-font presets. Each swaps the `--font-display` (and, for "immersive",
 * body) family via a `data-font` attribute on <html>; see index.css. Kept as a
 * plain client preference in localStorage — no world data involved.
 */
const STYLES = [
  { key: "fantasy", label: "Fantasia (Cinzel)" },
  { key: "medieval", label: "Medieval" },
  { key: "immersive", label: "Fantasia total" },
  { key: "plain", label: "Padrão" },
] as const;

type StyleKey = (typeof STYLES)[number]["key"];
const LS_KEY = "daren-font-style";
const DEFAULT: StyleKey = "fantasy";

function apply(style: StyleKey) {
  document.documentElement.dataset.font = style;
}

export function FontStyleSelect() {
  const [style, setStyle] = useState<StyleKey>(() => {
    const stored = localStorage.getItem(LS_KEY) as StyleKey | null;
    return STYLES.some((s) => s.key === stored) ? (stored as StyleKey) : DEFAULT;
  });

  useEffect(() => {
    apply(style);
    try {
      localStorage.setItem(LS_KEY, style);
    } catch {
      /* storage unavailable — the attribute is still applied for this session */
    }
  }, [style]);

  return (
    <label className="app__fontstyle" title="Estilo de fonte">
      <span aria-hidden>✦</span>
      <select value={style} onChange={(e) => setStyle(e.target.value as StyleKey)}>
        {STYLES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

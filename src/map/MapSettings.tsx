import { useEffect, useId, useRef, useState } from "react";
import type { Atlas } from "@/domain/selectors";
import type { FactionId } from "@/domain/ids";
import { LENSES, type MapLens } from "./lenses";
import {
  STREET_NETWORKS,
  TEXTURE_STYLES,
  type StreetNetwork,
  type TextureStyle,
} from "./cityscape";
import type { MapPrefs } from "./mapPrefs";

interface MapSettingsProps {
  atlas: Atlas;
  prefs: MapPrefs;
  onChange: (patch: Partial<MapPrefs>) => void;
}

/** Gear button + popover holding every persisted map display option. */
export function MapSettings({ atlas, prefs, onChange }: MapSettingsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Dismiss on outside click or Escape while open.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="map__settings" ref={rootRef}>
      <button
        type="button"
        className="map__settings-btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        title="Configurações do mapa"
      >
        <span aria-hidden>⚙</span>
        <span className="sr-only">Configurações do mapa</span>
      </button>

      {open && (
        <div
          className="map__settings-panel"
          id={panelId}
          role="group"
          aria-label="Configurações do mapa"
        >
          <label className="map__control">
            <span>Colorir por</span>
            <select
              value={prefs.lens}
              onChange={(e) => onChange({ lens: e.target.value as MapLens })}
            >
              {LENSES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          {prefs.lens === "faction" && (
            <label className="map__control">
              <span>Facção</span>
              <select
                value={prefs.focusFactionId ?? ""}
                onChange={(e) =>
                  onChange({ focusFactionId: (e.target.value || null) as FactionId | null })
                }
              >
                <option value="">— escolha —</option>
                {atlas.world.factions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="map__control">
            <span>Textura</span>
            <select
              value={prefs.texture}
              onChange={(e) => onChange({ texture: e.target.value as TextureStyle })}
            >
              {TEXTURE_STYLES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {prefs.texture !== "off" && (
            <label className="map__control">
              <span>Ruas</span>
              <select
                value={prefs.network}
                onChange={(e) => onChange({ network: e.target.value as StreetNetwork })}
              >
                {STREET_NETWORKS.map((n) => (
                  <option key={n.key} value={n.key}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="map__control map__control--check">
            <span>Elevadores</span>
            <input
              type="checkbox"
              checked={prefs.showElevators}
              onChange={(e) => onChange({ showElevators: e.target.checked })}
            />
          </label>

          <label className="map__control map__control--check">
            <span>Pergaminho</span>
            <input
              type="checkbox"
              checked={prefs.parchment}
              onChange={(e) => onChange({ parchment: e.target.checked })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

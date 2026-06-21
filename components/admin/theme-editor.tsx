"use client";

import { useState, type CSSProperties } from "react";
import { saveThemeAction } from "@/lib/admin/design-actions";
import type { ThemeTokens } from "@/lib/cms/types";
import styles from "@/components/admin/design-manager.module.css";

const colorFields = [
  ["colorBg", "Background"],
  ["colorBgSoft", "Soft background"],
  ["colorPanel", "Cards"],
  ["colorText", "Primary text"],
  ["colorTextMuted", "Muted text"],
  ["colorTextSoft", "Soft text"],
  ["colorAccent", "Accent"],
  ["colorAccentStrong", "Strong accent"],
  ["colorBorder", "Borders"],
  ["colorSuccess", "Success"],
  ["colorDanger", "Danger"]
] as const;

export function ThemeEditor({
  mode,
  seasonId,
  themeId,
  initialTokens
}: {
  mode: "global" | "season";
  seasonId?: string;
  themeId?: string;
  initialTokens: ThemeTokens;
}) {
  const [colors, setColors] = useState(() =>
    Object.fromEntries(colorFields.map(([key]) => [key, initialTokens[key]])) as Record<
      (typeof colorFields)[number][0],
      string
    >
  );
  const [radiusCard, setRadiusCard] = useState(parsePixels(initialTokens.radiusCard, 6));
  const [radiusButton, setRadiusButton] = useState(parsePixels(initialTokens.radiusButton, 6));
  const [buttonTransform, setButtonTransform] = useState(
    initialTokens.buttonTransform === "none" ? "none" : "uppercase"
  );

  const previewStyle = {
    "--preview-bg": colors.colorBg,
    "--preview-panel": colors.colorPanel,
    "--preview-text": colors.colorText,
    "--preview-muted": colors.colorTextMuted,
    "--preview-accent": colors.colorAccent,
    "--preview-border": colors.colorBorder,
    "--preview-card-radius": `${radiusCard}px`,
    "--preview-button-radius": `${radiusButton}px`,
    "--preview-transform": buttonTransform
  } as CSSProperties;

  return (
    <div className={styles.editorGrid}>
      <form action={saveThemeAction} className={styles.panel}>
        <input name="mode" type="hidden" value={mode} />
        <input name="seasonId" type="hidden" value={seasonId ?? ""} />
        <input name="themeId" type="hidden" value={themeId ?? ""} />

        <header>
          <div>
            <small>{mode === "global" ? "Platform" : "Season override"}</small>
            <h2>{mode === "global" ? "Global theme" : "Season theme"}</h2>
          </div>
          <button className={styles.primary} type="submit">Save theme</button>
        </header>

        <div className={styles.colorGrid}>
          {colorFields.map(([key, label]) => (
            <label className={styles.colorField} key={key}>
              <span>{label}</span>
              <span className={styles.colorControl}>
                <input
                  name={key}
                  onChange={(event) =>
                    setColors((current) => ({ ...current, [key]: event.target.value }))
                  }
                  type="color"
                  value={colors[key]}
                />
                <code>{colors[key]}</code>
              </span>
            </label>
          ))}
        </div>

        <div className={styles.optionsGrid}>
          <label>
            Card corners
            <span>
              <input
                max="20"
                min="0"
                name="radiusCard"
                onChange={(event) => setRadiusCard(Number(event.target.value))}
                type="range"
                value={radiusCard}
              />
              <output>{radiusCard}px</output>
            </span>
          </label>
          <label>
            Button corners
            <span>
              <input
                max="20"
                min="0"
                name="radiusButton"
                onChange={(event) => setRadiusButton(Number(event.target.value))}
                type="range"
                value={radiusButton}
              />
              <output>{radiusButton}px</output>
            </span>
          </label>
          <label>
            Button text
            <select
              name="buttonTransform"
              onChange={(event) => setButtonTransform(event.target.value)}
              value={buttonTransform}
            >
              <option value="uppercase">Uppercase</option>
              <option value="none">Normal</option>
            </select>
          </label>
        </div>
      </form>

      <section className={styles.preview} style={previewStyle}>
        <small>Live preview</small>
        <div className={styles.previewNavigation}>
          <strong>AMS</strong>
          <span>Teams</span>
          <span>Schedule</span>
          <span>Bracket</span>
        </div>
        <div className={styles.previewBody}>
          <p>ALLIANCE MASTER SERIES</p>
          <h2>Season identity</h2>
          <span>Colors and component styles update here immediately.</span>
          <button type="button">Primary action</button>
        </div>
      </section>
    </div>
  );
}

function parsePixels(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

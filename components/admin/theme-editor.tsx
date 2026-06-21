"use client";

import { useState, type CSSProperties } from "react";
import { saveThemeAction } from "@/lib/admin/design-actions";
import type { ThemeTokens } from "@/lib/cms/types";
import styles from "@/components/admin/design-manager.module.css";

const colorFields = [
  ["colorBg", "Background"],
  ["colorBgSoft", "Soft background"],
  ["colorPanel", "Cards"],
  ["colorPanelStrong", "Strong cards"],
  ["colorText", "Primary text"],
  ["colorTextMuted", "Muted text"],
  ["colorTextSoft", "Soft text"],
  ["colorAccent", "Accent"],
  ["colorAccentStrong", "Strong accent"],
  ["colorBorder", "Borders"],
  ["colorSuccess", "Success"],
  ["colorDanger", "Danger"]
] as const;

type ColorKey = (typeof colorFields)[number][0];

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
  const [colors, setColors] = useState(
    () =>
      Object.fromEntries(
        colorFields.map(([key]) => [key, normalizeHex(initialTokens[key])])
      ) as Record<ColorKey, string>
  );
  const [radiusCard, setRadiusCard] = useState(parsePixels(initialTokens.radiusCard, 6));
  const [radiusButton, setRadiusButton] = useState(parsePixels(initialTokens.radiusButton, 6));
  const [buttonTransform, setButtonTransform] = useState(
    initialTokens.buttonTransform === "none" ? "none" : "uppercase"
  );

  const previewStyle = {
    "--preview-bg": validHex(colors.colorBg),
    "--preview-panel": validHex(colors.colorPanel),
    "--preview-text": validHex(colors.colorText),
    "--preview-muted": validHex(colors.colorTextMuted),
    "--preview-accent": validHex(colors.colorAccent),
    "--preview-border": validHex(colors.colorBorder),
    "--preview-card-radius": `${radiusCard}px`,
    "--preview-button-radius": `${radiusButton}px`,
    "--preview-transform": buttonTransform
  } as CSSProperties;

  function updateColor(key: ColorKey, value: string) {
    setColors((current) => ({ ...current, [key]: value.toUpperCase() }));
  }

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
          <button className={styles.primary} type="submit">
            Save and publish
          </button>
        </header>

        <div className={styles.colorGrid}>
          {colorFields.map(([key, label]) => (
            <label className={styles.colorField} key={key}>
              <span>{label}</span>
              <span className={styles.colorControl}>
                <input
                  aria-label={`${label} color picker`}
                  onChange={(event) => updateColor(key, event.target.value)}
                  type="color"
                  value={validHex(colors[key])}
                />
                <input
                  aria-label={`${label} hex value`}
                  className={styles.hexInput}
                  maxLength={7}
                  name={key}
                  onChange={(event) => updateColor(key, event.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  required
                  spellCheck={false}
                  type="text"
                  value={colors[key]}
                />
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

function validHex(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

function normalizeHex(value: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();

  const shortHex = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`.toUpperCase();
  }

  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return `#${[rgb[1], rgb[2], rgb[3]]
      .map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
  }

  return "#000000";
}

function parsePixels(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

import type { ThemeRecord, ThemeStyle, ThemeTokens } from "@/lib/cms/types";

export function mergeThemes(globalTheme: ThemeRecord, seasonTheme?: ThemeRecord): ThemeRecord {
  if (!seasonTheme) return globalTheme;

  return {
    ...globalTheme,
    ...seasonTheme,
    tokens: {
      ...globalTheme.tokens,
      ...seasonTheme.tokens
    }
  };
}

export function themeToStyle(tokens: ThemeTokens): ThemeStyle {
  return {
    "--color-bg": tokens.colorBg,
    "--color-bg-soft": tokens.colorBgSoft,
    "--color-panel": tokens.colorPanel,
    "--color-panel-strong": tokens.colorPanelStrong,
    "--color-text": tokens.colorText,
    "--color-text-muted": tokens.colorTextMuted,
    "--color-text-soft": tokens.colorTextSoft,
    "--color-accent": tokens.colorAccent,
    "--color-accent-strong": tokens.colorAccentStrong,
    "--color-border": tokens.colorBorder,
    "--color-success": tokens.colorSuccess,
    "--color-danger": tokens.colorDanger,
    "--font-display": tokens.fontDisplay,
    "--font-body": tokens.fontBody,
    "--radius-card": tokens.radiusCard,
    "--radius-button": tokens.radiusButton,
    "--shadow-panel": tokens.shadowPanel,
    "--button-transform": tokens.buttonTransform
  };
}

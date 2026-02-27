export const THEMES = ["fresh", "ocean"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "fresh";
export const THEME_STORAGE_KEY = "knowledge-graph-theme";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "fresh" || value === "ocean";
}

export function normalizeTheme(value: string | null | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function nextTheme(theme: Theme): Theme {
  return theme === "fresh" ? "ocean" : "fresh";
}

export function readThemeFromDocument(): Theme {
  if (typeof document === "undefined") {
    return DEFAULT_THEME;
  }

  return normalizeTheme(document.documentElement.dataset.theme);
}

export function writeThemeToDocument(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const storageKey = "${THEME_STORAGE_KEY}";
  const fallbackTheme = "${DEFAULT_THEME}";

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const theme = storedTheme === "fresh" || storedTheme === "ocean" ? storedTheme : fallbackTheme;
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = fallbackTheme;
  }
})();`;

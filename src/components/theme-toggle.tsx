"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_THEME,
  readThemeFromDocument,
  THEME_STORAGE_KEY,
  THEMES,
  type Theme,
  writeThemeToDocument,
} from "@/lib/theme";

const THEME_LABELS: Record<Theme, string> = {
  fresh: "清爽青绿",
  ocean: "海盐蓝橙",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const current = readThemeFromDocument();
    setTheme(current);
  }, []);

  function applyTheme(next: Theme) {
    writeThemeToDocument(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setTheme(next);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      {THEMES.map((item) => {
        const active = item === theme;
        return (
          <button
            key={item}
            type="button"
            className={`h-9 rounded-lg px-3 text-xs transition-colors xs:text-sm ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-strong hover:bg-surface-soft"
            }`}
            aria-pressed={active}
            onClick={() => applyTheme(item)}
          >
            {THEME_LABELS[item]}
          </button>
        );
      })}
    </div>
  );
}

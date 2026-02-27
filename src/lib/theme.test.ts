import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  isTheme,
  nextTheme,
  normalizeTheme,
} from "@/lib/theme";

describe("theme helpers", () => {
  it("accepts only supported theme names", () => {
    expect(isTheme("fresh")).toBe(true);
    expect(isTheme("ocean")).toBe(true);
    expect(isTheme("dark")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("falls back to default theme for invalid input", () => {
    expect(normalizeTheme("fresh")).toBe("fresh");
    expect(normalizeTheme("ocean")).toBe("ocean");
    expect(normalizeTheme("unknown")).toBe(DEFAULT_THEME);
    expect(normalizeTheme(undefined)).toBe(DEFAULT_THEME);
  });

  it("toggles themes deterministically", () => {
    expect(nextTheme("fresh")).toBe("ocean");
    expect(nextTheme("ocean")).toBe("fresh");
  });

  it("contains storage key and supported theme guards in bootstrap script", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('storedTheme === "fresh"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('storedTheme === "ocean"');
  });
});

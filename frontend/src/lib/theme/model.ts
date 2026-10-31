// The theme choice and how it is stored. A person picks light, dark or auto; light and dark
// are kept in the browser under one key, and auto removes the key so the device decides. The
// key and the two stored values must stay in step with public/theme.js, which reads them
// before first paint. Only these exact values are ever trusted on read.

export const THEME_STORAGE_KEY = "drop-theme";
export const THEME_PREFERENCES = ["light", "dark", "auto"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type Theme = "light" | "dark";

// one of the two values the storage key may hold
export function isStoredTheme(value: unknown): value is Theme {
    return value === "light" || value === "dark";
}

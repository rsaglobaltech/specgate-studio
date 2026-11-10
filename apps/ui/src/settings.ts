import { firstLanguage, type Lang } from "./i18n.js";

export type Theme = "dark" | "light";
const KEY = "specgate-studio.settings";

/** Language and theme, remembered per Developer on this machine (A10); dark first (REQ-034). */
export function loadSettings(): { lang: Lang; theme: Theme } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as {
      lang?: Lang;
      theme?: Theme;
    } | null;
    if (
      saved &&
      (saved.lang === "en" || saved.lang === "es") &&
      (saved.theme === "dark" || saved.theme === "light")
    ) {
      return { lang: saved.lang, theme: saved.theme };
    }
  } catch {
    // A private window or blocked storage: the defaults.
  }
  return { lang: firstLanguage(navigator.languages ?? [navigator.language]), theme: "dark" };
}

export function saveSettings(s: { lang: Lang; theme: Theme }): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not remembered; the studio still works.
  }
}

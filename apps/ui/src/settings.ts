import { firstLanguage, type Lang } from "./i18n.js";

export type Theme = "dark" | "light";
const KEY = "specgate-studio.settings";

export interface Settings {
  lang: Lang;
  theme: Theme;
  /**
   * The Developer pays per use of the API (demo-findings REQ-211): the
   * agent's dollars read as "Coste". Off by default — on a subscription they
   * are only what the work would cost at API prices, and specgate's events do
   * not say which (A1).
   */
  perUse: boolean;
}

/** Language, theme and billing, remembered per Developer on this machine (A10); dark first (REQ-034). */
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as {
      lang?: Lang;
      theme?: Theme;
      perUse?: boolean;
    } | null;
    if (
      saved &&
      (saved.lang === "en" || saved.lang === "es") &&
      (saved.theme === "dark" || saved.theme === "light")
    ) {
      return { lang: saved.lang, theme: saved.theme, perUse: saved.perUse === true };
    }
  } catch {
    // A private window or blocked storage: the defaults.
  }
  return {
    lang: firstLanguage(navigator.languages ?? [navigator.language]),
    theme: "dark",
    perUse: false,
  };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not remembered; the studio still works.
  }
}

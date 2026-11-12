import type { Lang } from "./i18n.js";

/**
 * What the agent spent, as the studio writes it (demo-findings REQ-211):
 * tokens, turns, and the dollar figure Claude Code reports — on a
 * subscription what the work would cost at API prices, not a charge, so it
 * reads "≈ … precio de API" unless the Developer set that they pay per use.
 * specgate's events do not say how the agent is billed (A1).
 */

const WORDS: Record<
  Lang,
  {
    usage: string;
    apiPrice: string;
    cost: string;
    turns: (n: string) => string;
    tokens: (n: string) => string;
    k: (n: string) => string;
    m: (n: string) => string;
  }
> = {
  en: {
    usage: "Usage",
    apiPrice: "≈ {money} API price",
    cost: "Cost {money}",
    turns: (n) => `${n} turns`,
    tokens: (n) => `${n} tokens`,
    k: (n) => `${n} k tokens`,
    m: (n) => `${n} M tokens`,
  },
  es: {
    usage: "Uso",
    apiPrice: "≈ {money} precio de API",
    cost: "Coste {money}",
    turns: (n) => `${n} turnos`,
    tokens: (n) => `${n} tokens`,
    k: (n) => `${n} k tokens`,
    m: (n) => `${n} M tokens`,
  },
};

/** Dollars as the board writes them: "1,10 $" in Spanish, "$1.10" in English. */
export function money(lang: Lang, n: number): string {
  const v = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return lang === "es" ? `${v} $` : `$${v}`;
}

/** Tokens: "182 k tokens", "11,8 M tokens" past a million. */
export function tokens(lang: Lang, n: number): string {
  const w = WORDS[lang];
  if (n >= 1_000_000)
    return w.m(new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(n / 1_000_000));
  if (n < 1000) return w.tokens(String(n));
  return w.k(new Intl.NumberFormat(lang).format(Math.round(n / 1000)));
}

export function turns(lang: Lang, n: number): string {
  return WORDS[lang].turns(new Intl.NumberFormat(lang).format(n));
}

/** The dollar figure: "≈ 1,10 $ precio de API", or "Coste 1,10 $" when the Developer pays per use. */
export function price(lang: Lang, dollars: number, perUse: boolean): string {
  const w = WORDS[lang];
  return (perUse ? w.cost : w.apiPrice).replace("{money}", money(lang, dollars));
}

/** The figure alone, for a short line: "≈ 0,57 $", or "0,57 $" when paying per use. */
export function priceShort(lang: Lang, dollars: number, perUse: boolean): string {
  return perUse ? money(lang, dollars) : `≈ ${money(lang, dollars)}`;
}

/**
 * The status bar's usage: "Uso 182 k tokens · ≈ 1,10 $ precio de API", or
 * "Cost $1.10 · 182 k tokens" when paying per use; "Uso —" before any.
 */
export function statusUsage(
  lang: Lang,
  u: { tokens: number; dollars: number | null } | null,
  perUse: boolean,
): string {
  const w = WORDS[lang];
  if (!u || (u.tokens === 0 && u.dollars === null)) return `${w.usage} —`;
  if (perUse && u.dollars !== null)
    return `${price(lang, u.dollars, true)} · ${tokens(lang, u.tokens)}`;
  return [
    `${w.usage} ${tokens(lang, u.tokens)}`,
    u.dollars !== null ? price(lang, u.dollars, false) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

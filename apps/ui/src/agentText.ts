import type { Lang } from "./i18n.js";

/**
 * How the agent panel writes what the host answers (draft-workbench-v2
 * REQ-181 … REQ-183): presentation only — what "@" offers and every plan
 * come from the host.
 */

/** The "@word" the caret is in, and where it starts; null when the caret is in none. */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|\s)@([^\s@]*)$/.exec(before);
  if (!m) return null;
  return { start: before.length - m[2]!.length - 1, query: m[2]! };
}

/** The text with the "@word" at `start` replaced by the chosen mention, and the caret after it. */
export function withMention(
  text: string,
  at: { start: number; query: string },
  value: string,
): { text: string; caret: number } {
  const end = at.start + 1 + at.query.length;
  const rest = text.slice(end);
  const spaced = rest.startsWith(" ");
  const inserted = `@${value}${spaced ? "" : " "}`;
  return {
    text: text.slice(0, at.start) + inserted + rest,
    caret: at.start + inserted.length + (spaced ? 1 : 0),
  };
}

/** Tokens as the panel says them: `3,1 k` in Spanish, `3.1 k` in English, `850` under a thousand. */
export function tokensShown(n: number, lang: Lang): string {
  if (n < 1000) return String(n);
  const k = (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, "");
  return `${lang === "es" ? k.replace(".", ",") : k} k`;
}

/** What the agent read, as the panel lists it: each file's name, its folders left out. */
export const readShown = (read: readonly string[]) =>
  read.map((r) => r.replace(/^[^ ]*\//, "")).join(", ");

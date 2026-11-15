/**
 * specgate's version against the one the studio needs (REQ-013): numbers
 * compared as numbers, a pre-release before its release.
 */
const parse = (v: string) => {
  const clean = v.trim().replace(/^v/, "").split("+")[0]!;
  const dash = clean.indexOf("-");
  const core = dash === -1 ? clean : clean.slice(0, dash);
  const pre = dash === -1 ? "" : clean.slice(dash + 1);
  return { nums: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
};

/**
 * Two pre-release tags as semver orders them: dot by dot, numbers as numbers
 * (`rc.9` before `rc.12`), a number before a word, the shorter first.
 */
function preOlder(a: string, b: string): boolean {
  const x = a.split(".");
  const y = b.split(".");
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === undefined) return true;
    if (y[i] === undefined) return false;
    if (x[i] === y[i]) continue;
    const xn = /^\d+$/.test(x[i]!);
    const yn = /^\d+$/.test(y[i]!);
    if (xn && yn) return Number(x[i]) < Number(y[i]);
    if (xn !== yn) return xn;
    return x[i]! < y[i]!;
  }
  return false;
}

/** Is `a` older than `b`? */
export function isOlder(a: string, b: string): boolean {
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d) return d < 0;
  }
  if (x.pre && !y.pre) return true;
  if (!x.pre && y.pre) return false;
  return preOlder(x.pre, y.pre);
}

/** The command that installs the version the studio needs. */
export const updateCommand = (needed: string) => `npm i -g @rsaglobaltech/specgate@${needed}`;

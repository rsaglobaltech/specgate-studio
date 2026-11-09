/**
 * specgate's version against the one the studio needs (REQ-013): numbers
 * compared as numbers, a pre-release before its release.
 */
const parse = (v: string) => {
  const [core = "", pre = ""] = v.trim().replace(/^v/, "").split("-", 2);
  return { nums: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
};

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
  return x.pre < y.pre;
}

/** The command that installs the version the studio needs. */
export const updateCommand = (needed: string) => `npm i -g @rsaglobaltech/specgate@${needed}`;

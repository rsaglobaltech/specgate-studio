import { spawn } from "node:child_process";

/** A program's output, run with an argument array and no shell. */
function output(program: string, args: readonly string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(program, args, { shell: false, windowsHide: true });
    let out = "";
    child.stdout.setEncoding("utf8").on("data", (c: string) => (out += c));
    child.stderr.resume();
    child.on("error", () => resolve({ code: 127, out: "" }));
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

/** Every process under `root`, read from `ps` before any is ended: an orphan loses its parent. */
async function descendants(root: number): Promise<number[]> {
  const { code, out } = await output("ps", ["-A", "-o", "pid=,ppid="]);
  if (code !== 0) return [];
  const children = new Map<number, number[]>();
  for (const line of out.split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (!pid || ppid === undefined || Number.isNaN(ppid)) continue;
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  const found: number[] = [];
  const queue = [root];
  while (queue.length) {
    for (const c of children.get(queue.shift()!) ?? []) {
      if (!found.includes(c)) (found.push(c), queue.push(c));
    }
  }
  return found;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

function signal(pid: number, sig: NodeJS.Signals): void {
  try {
    process.kill(pid, sig);
  } catch {
    /* gone already */
  }
}

/**
 * Ends a process and every process it started (draft-build-live REQ-105). On
 * Windows, `taskkill /T /F` ends the tree by its parents. Elsewhere the tree
 * is read first, then its process group and each descendant are asked to
 * end, and whatever is still alive two seconds later is killed.
 */
export async function killTree(pid: number): Promise<void> {
  if (process.platform === "win32") {
    await output("taskkill", ["/pid", String(pid), "/T", "/F"]);
    return;
  }
  const tree = [pid, ...(await descendants(pid))];
  signal(-pid, "SIGTERM");
  for (const p of tree) signal(p, "SIGTERM");
  const end = Date.now() + 2_000;
  while (tree.some(alive) && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
  signal(-pid, "SIGKILL");
  for (const p of tree) if (alive(p)) signal(p, "SIGKILL");
}

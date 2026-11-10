/** The shell a terminal runs: its program, arguments and the name it is listed by. */
export interface Shell {
  file: string;
  args: string[];
  name: string;
}

/**
 * The Developer's shell (draft-terminal A1): their login shell on macOS and
 * Linux, PowerShell on Windows — `pwsh` when installed, else Windows
 * PowerShell. `has` says whether a program is on the PATH.
 */
export function shellFor(
  platform: string,
  env: Record<string, string | undefined>,
  has: (program: string) => boolean,
): Shell {
  if (platform === "win32") {
    return has("pwsh")
      ? { file: "pwsh.exe", args: ["-NoLogo"], name: "pwsh" }
      : { file: "powershell.exe", args: ["-NoLogo"], name: "powershell" };
  }
  const file = env.SHELL || "/bin/sh";
  return { file, args: ["-l"], name: file.split("/").pop() || "sh" };
}

/**
 * A terminal's scrollback (REQ-056): its output as written, the last `lines`
 * lines of it (A7: at least 10,000), a line split across chunks kept whole.
 */
export class Scrollback {
  private chunks: string[] = [];
  private count = 0;

  constructor(private readonly lines: number) {}

  push(data: string): void {
    this.chunks.push(data);
    this.count += (data.match(/\n/g) ?? []).length;
    if (this.count > this.lines * 2) this.trim();
  }

  text(): string {
    this.trim();
    return this.chunks.join("");
  }

  private trim(): void {
    if (this.count <= this.lines) return;
    const all = this.chunks.join("");
    let drop = this.count - this.lines;
    let at = 0;
    while (drop > 0) {
      at = all.indexOf("\n", at) + 1;
      drop--;
    }
    this.chunks = [all.slice(at)];
    this.count = this.lines;
  }
}

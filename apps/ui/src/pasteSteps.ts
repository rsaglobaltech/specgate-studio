/**
 * What the "Paste the client's text" dialog shows while the agent proposes
 * the form (brief-paste-progress REQ-235): three steps, in order — the text
 * kept in a temporary file, the agent proposing and specgate checking it, the
 * proposed form to review. specgate answers only at the end, so the agent's
 * step is shown as under way with its seconds and its command, never as
 * progress it cannot know.
 */
export type PasteStepState = "done" | "now" | "todo" | "failed";

export interface PasteFailure {
  message: string;
  fix: string | null;
}

export interface PasteStep {
  key: "file" | "agent" | "form";
  state: PasteStepState;
  /** The agent's program (`claude`), read from specgate's command; null before it is known. */
  agent: string | null;
  seconds: number | null;
  command: string | null;
  failure: PasteFailure | null;
}

export interface PasteProgress {
  state: "busy" | "failed";
  seconds: number;
  /** specgate's command, as the terminal shows it once it started; null before. */
  command: string | null;
  failure?: PasteFailure;
}

/** The agent's program in `--agent <command>`: its first word, without its folder. */
export function agentIn(command: string | null): string | null {
  const m = command ? /--agent\s+(?:'([^']*)'|"([^"]*)"|(\S+))/.exec(command) : null;
  const agent = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim().split(/\s+/)[0] ?? "";
  return agent ? (agent.split(/[\\/]/).pop() ?? null) : null;
}

export function pasteSteps(p: PasteProgress): PasteStep[] {
  const none = { agent: null, seconds: null, command: null, failure: null };
  return [
    { key: "file", state: "done", ...none },
    {
      key: "agent",
      state: p.state === "failed" ? "failed" : "now",
      agent: agentIn(p.command),
      seconds: p.seconds,
      command: p.command,
      failure: p.state === "failed" ? (p.failure ?? null) : null,
    },
    { key: "form", state: "todo", ...none },
  ];
}

import { useEffect, useRef, useState } from "preact/hooks";
import type { BriefView, CommandEvent, DraftResult, Notice } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { bt } from "./briefText.js";
import { BriefFormPanel } from "./BriefForm.js";
import { draftSteps, moduleOfRun, type DraftEnd } from "../draftSteps.js";

/** The agent's fix passes the host runs on a draft with findings (core FIX_PASSES, REQ-241). */
const FIX_PASSES = 2;

export interface BriefProps {
  rpc: Rpc;
  lang: Lang;
  /** What the view is made of: when one changes, the modules are read again. */
  stamp: readonly unknown[];
  openFile: (path: string) => void;
  /** "Draft the modules": the host drafts each module not drafted yet (REQ-073); its result, or null. */
  onDraft: (label: string) => Promise<DraftResult | null>;
  /** Opens a view: "See it in Changes" (REQ-241). */
  onOpen?: (view: "changes") => void;
  onHelp: (feature: string, requests: HelpRequest[]) => void;
  /** Names the button that runs a command, for the terminal's echo (REQ-053). */
  announce: (label: string) => void;
  /** A notice no command's end carries: a proposal discarded (REQ-074). */
  onNotice: (notice: Record<Lang, Notice>) => void;
}

/**
 * The Brief view (draft-brief): `docs/brief.md` to edit as markdown, whose
 * checks run on every save (REQ-072), and its modules with "Draft the
 * modules" (REQ-073). It renders what the host answers; core decides which
 * modules are drafted and with which agent.
 */
export function Brief(p: BriefProps) {
  const t = (key: Parameters<typeof bt>[1], vars?: Record<string, string | number>) =>
    bt(p.lang, key, vars);
  const [view, setView] = useState<BriefView | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  // "Draft the modules" as it runs (REQ-241): the modules it drafts, the runs started, its end.
  const [todo, setTodo] = useState<string[] | null>(null);
  const [started, setStarted] = useState<string[]>([]);
  const [end, setEnd] = useState<DraftEnd | null>(null);
  const [seconds, setSeconds] = useState(0);
  const running = todo !== null && end === null;
  useEffect(() => {
    if (!running) return;
    const at = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - at) / 1000)), 250);
    return () => clearInterval(tick);
  }, [running]);
  // Listened to from the start: a draft's run can start before a render marks drafting as running.
  const collecting = useRef(false);
  useEffect(
    () =>
      p.rpc.on("command.event", (e: CommandEvent) => {
        const module = e.type === "started" && collecting.current ? moduleOfRun(e.command) : null;
        if (module) setStarted((s) => [...s, module]);
      }),
    [p.rpc],
  );
  const draft = async () => {
    // Pressed again while it runs: the host refuses it (write_busy, REQ-073 SCN-216); the panel stays.
    if (running) {
      await p.onDraft(label);
      return;
    }
    const list = view?.modules.filter((m) => !m.drafted).map((m) => m.module) ?? [];
    setStarted([]);
    setEnd(null);
    setSeconds(0);
    setTodo(list);
    collecting.current = true;
    const r = await p.onDraft(label).finally(() => (collecting.current = false));
    if (r && r.ok) setEnd({ drafted: r.drafted, stopped: r.stopped, findings: r.findings });
    else setTodo(null);
  };

  useEffect(() => {
    let live = true;
    p.rpc.ask("brief.get", {}).then(
      (v) => live && (setView(v), setUnreadable(false)),
      () => live && setUnreadable(true),
    );
    return () => {
      live = false;
    };
  }, [p.rpc, ...p.stamp]);

  const label = t("brief.draft");
  const steps = todo && todo.length > 0 ? draftSteps(todo, started, end) : null;
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const next = view?.modules.find((m) => !m.drafted)?.module;
  return (
    <div class="brief-split">
      <BriefFormPanel
        rpc={p.rpc}
        lang={p.lang}
        stamp={p.stamp}
        announce={p.announce}
        onNotice={p.onNotice}
        onHelp={p.onHelp}
      />
      <div class="brief">
        <h1>Brief</h1>
        <p class="muted">{t("brief.intro")}</p>
        <div class="actions">
          <button type="button" class="btn" onClick={() => p.openFile("docs/brief.md")}>
            {t("brief.open")}
          </button>
        </div>
        <h2>{t("brief.modules")}</h2>
        {unreadable ? (
          <p class="muted">{t("brief.unreadable")}</p>
        ) : view && view.modules.length === 0 ? (
          <p class="muted">{t("brief.none")}</p>
        ) : (
          <ul class="modules">
            {view?.modules.map((m) => (
              <li key={m.module} data-module={m.module} data-drafted={m.drafted ? "yes" : "no"}>
                <b class="mono">{m.module}</b>
                <span class="mono muted">{m.change}</span>
                <span data-part="state">{m.state}</span>
                <span class={m.drafted ? "state ok" : "state muted"}>
                  {m.drafted ? t("brief.drafted") : t("brief.toDraft")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {steps && (
          <section class="drafting" data-testid="drafting" aria-live="polite">
            <div class="drafting-head">
              <b>{t("drafting.head")}</b>
              <span class="muted" data-testid="drafting-count">
                {t("drafting.count", { done: steps.done, total: steps.total })} · {clock}
              </span>
            </div>
            <ol>
              {steps.rows.map((r) => (
                <li key={r.module} data-module={r.module} data-state={r.state}>
                  <span class="drafting-mark" aria-hidden="true">
                    {{ done: "✓", now: "⧗", fixing: "↻", todo: "○", stopped: "✖" }[r.state]}
                  </span>
                  <b class="mono">{r.module}</b>
                  <span class="muted">
                    {r.state === "done"
                      ? t("drafting.done")
                      : r.state === "now"
                        ? t("drafting.now", { agent: view?.agent ?? "agent" })
                        : r.state === "fixing"
                          ? t("drafting.fixing", { pass: r.pass, passes: FIX_PASSES })
                          : r.state === "stopped"
                            ? t("drafting.stopped", { n: r.findings, passes: r.pass })
                            : t("drafting.todo")}
                  </span>
                  {r.state === "stopped" && p.onOpen && (
                    <button
                      type="button"
                      class="btn"
                      data-action="see-changes"
                      onClick={() => p.onOpen?.("changes")}
                    >
                      {t("drafting.see")}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
        {view && (
          <p class="muted" data-part="agent">
            {view.agent ? t("brief.agent", { agent: view.agent }) : t("brief.noAgent")}
          </p>
        )}
        <div class="actions">
          <button
            type="button"
            class="btn pri"
            data-action="draft-modules"
            onClick={() => void draft()}
          >
            {label}
          </button>
          <HelpButton
            label={t("brief.draftHelp")}
            onOpen={() =>
              p.onHelp(label, [
                {
                  action: "draft-modules",
                  feature: label,
                  vars: {
                    ...(next ? { module: next } : {}),
                    ...(view?.agent ? { agent: view.agent } : {}),
                  },
                },
              ])
            }
          />
        </div>
      </div>
    </div>
  );
}

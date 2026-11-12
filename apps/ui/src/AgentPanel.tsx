import { useEffect, useRef, useState } from "preact/hooks";
import type { AgentEntry, AgentView, Mention } from "@specgate-studio/protocol";
import type { Rpc } from "./rpc.js";
import type { Lang } from "./i18n.js";
import { HelpButton, type HelpRequest } from "./Help.js";
import { mentionAt, readShown, tokensShown, withMention } from "./agentText.js";

type Tr = (key: string, vars?: Record<string, string | number>) => string;

export interface AgentPanelProps {
  tr: Tr;
  lang: Lang;
  rpc: Rpc;
  width: number;
  onHide: () => void;
  /** Opens the "?" of the panel: what the agent can do and what not; runs nothing. */
  onHelp: (feature: string, requests: HelpRequest[]) => void;
  /** Names the button that runs a command, for the terminal's echo (REQ-053). */
  announce: (label: string) => void;
}

/**
 * The agent panel on the right, as the board "IDE · Banco de trabajo" draws it
 * (draft-workbench-v2 REQ-181 … REQ-183): "AGENTE · claude · modo spec" with
 * its "?"; each request and, before anything is written, its plan — the files
 * marked M or + with why, and the command after — with "Ver el diff y
 * aplicar" (the diff first, then a confirmation) and "Descartar"; what the
 * agent read and its tokens; and the input, where "@" names a requirement or
 * a file. It renders what the host answers: specgate makes and writes every
 * plan, never the studio. Shown, hidden and resized as REQ-190 says.
 */
export function AgentPanel(props: AgentPanelProps) {
  const { tr, rpc } = props;
  const [view, setView] = useState<AgentView | null>(null);
  const [text, setText] = useState("");
  const [offered, setOffered] = useState<Mention[]>([]);
  const [pick, setPick] = useState(0);
  const [diff, setDiff] = useState<AgentEntry | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const asked = useRef(0);

  useEffect(() => {
    rpc.ask("agent.get", {}).then(setView, () => undefined);
    return rpc.on("agent.changed", setView);
  }, [rpc]);
  // The newest request in sight.
  const last = view?.entries[view.entries.length - 1];
  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [view?.entries.length, last?.state]);

  /** What "@" offers where the caret is (REQ-183, SCN-547). */
  const offer = (value: string, caret: number) => {
    const at = mentionAt(value, caret);
    const mine = ++asked.current;
    if (!at) {
      setOffered([]);
      return;
    }
    rpc.ask("agent.mentions", { query: at.query }).then(
      (list) => {
        if (mine !== asked.current) return;
        setOffered(list);
        setPick(0);
      },
      () => undefined,
    );
  };
  const choose = (m: Mention) => {
    const el = input.current;
    const at = mentionAt(text, el?.selectionStart ?? text.length);
    if (!at) return;
    const next = withMention(text, at, m.value);
    asked.current++;
    setText(next.text);
    setOffered([]);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  };
  const send = () => {
    const request = text.trim();
    if (!request || view?.entries.some((e) => e.state === "asking")) return;
    asked.current++;
    setText("");
    setOffered([]);
    props.announce(tr("agent.send"));
    void rpc.ask("agent.ask", { request }).catch(() => undefined);
  };

  const help = () =>
    props.onHelp(tr("agent.help"), [
      { action: "agent-ask", feature: tr("agent.head") },
      { action: "agent-apply", feature: tr("agent.apply") },
      { action: "agent-discard", feature: tr("agent.discard") },
    ]);

  return (
    <aside
      class="agent"
      data-testid="agent-panel"
      aria-label={tr("agent.title")}
      style={{ flex: `0 0 ${props.width}px` }}
    >
      <div class="shead agent-head">
        <span data-testid="agent-heading">{tr("agent.head")}</span>
        <span class="agent-who" data-testid="agent-who">
          {view?.agent ?? tr("agent.noAgent")} · {tr("agent.mode")}
        </span>
        <span class="agent-tools">
          <HelpButton label={tr("agent.help")} onOpen={help} />
          <button
            type="button"
            class="pnew"
            data-testid="agent-hide"
            aria-label={tr("agent.hide")}
            title={tr("agent.hide")}
            onClick={props.onHide}
          >
            ×
          </button>
        </span>
      </div>
      <div class="agent-body" ref={body}>
        {view && view.entries.length === 0 && (
          <p class="muted agent-intro">
            {view.agent ? tr("agent.intro") : tr("agent.setAgent", { command: view.setAgent })}
          </p>
        )}
        {view?.entries.map((e) => (
          <Entry
            key={e.n}
            entry={e}
            tr={tr}
            lang={props.lang}
            onApply={() => setDiff(e)}
            onDiscard={() => {
              props.announce(tr("agent.discard"));
              void rpc.ask("agent.discard", { n: e.n }).catch(() => undefined);
            }}
          />
        ))}
      </div>
      <form
        class="agent-ask"
        onSubmit={(ev) => {
          ev.preventDefault();
          send();
        }}
      >
        <label for="agent-input">{tr("agent.ask")}</label>
        {offered.length > 0 && (
          <ul class="agent-mentions" role="listbox" aria-label={tr("agent.mentions")}>
            {offered.map((m, i) => (
              <li
                key={`${m.kind}:${m.value}`}
                role="option"
                aria-selected={i === pick}
                data-mention={m.value}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  choose(m);
                }}
              >
                <span class="mono">{m.value}</span>
                {m.title && <span class="muted">{m.title}</span>}
              </li>
            ))}
          </ul>
        )}
        <div class="agent-row">
          <input
            id="agent-input"
            ref={input}
            type="text"
            autocomplete="off"
            data-testid="agent-input"
            placeholder={tr("agent.placeholder")}
            value={text}
            onInput={(ev) => {
              const el = ev.currentTarget;
              setText(el.value);
              offer(el.value, el.selectionStart ?? el.value.length);
            }}
            onKeyDown={(ev) => {
              if (offered.length === 0) return;
              if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
                ev.preventDefault();
                const step = ev.key === "ArrowDown" ? 1 : -1;
                setPick((p) => (p + step + offered.length) % offered.length);
              } else if (ev.key === "Enter" || ev.key === "Tab") {
                ev.preventDefault();
                choose(offered[pick]!);
              } else if (ev.key === "Escape") {
                ev.stopPropagation();
                setOffered([]);
              }
            }}
          />
          <button
            type="submit"
            class="agent-send"
            data-testid="agent-send"
            aria-label={tr("agent.send")}
            title={tr("agent.send")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
      {diff && (
        <DiffDialog
          entry={diff}
          tr={tr}
          onCancel={() => setDiff(null)}
          onConfirm={() => {
            const n = diff.n;
            setDiff(null);
            props.announce(tr("agent.apply"));
            void rpc.ask("agent.apply", { n }).catch(() => undefined);
          }}
        />
      )}
    </aside>
  );
}

/** A request with its @mentions marked. */
function Request(props: { text: string }) {
  const parts = props.text.split(/(@[^\s@]+)/);
  return (
    <div class="agent-req" data-testid="agent-request">
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span key={i} class="mono at">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </div>
  );
}

/** "Después correré <command>. …": the command in mono, wherever the language puts it. */
function Then(props: { tr: Tr; then: string[] }) {
  if (props.then.length === 0) return <>{props.tr("agent.thenNone")}</>;
  const [before, after] = props.tr("agent.then", { command: "\u0000" }).split("\u0000");
  return (
    <>
      {before}
      <span class="mono">{props.then.join(", ")}</span>
      {after}
    </>
  );
}

function Entry(props: {
  entry: AgentEntry;
  tr: Tr;
  lang: Lang;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const { entry: e, tr } = props;
  const plan = e.plan;
  const errors = e.findings.filter((f) => f.severity === "error");
  return (
    <div class="agent-entry" data-entry={e.n} data-state={e.state}>
      <Request text={e.request} />
      {e.state === "asking" && <p class="muted agent-wait">{tr("agent.asking")}</p>}
      {e.state === "failed" && (
        <div class="agent-card failed" data-testid="agent-failed">
          {(errors.length ? errors : e.findings).map((f) => (
            <p key={f.code} data-finding={f.code}>
              {tr("agent.failed", { message: `${f.code} — ${f.message}` })}
              {f.fix && <span class="muted"> {tr("agent.fix", { fix: f.fix })}</span>}
            </p>
          ))}
        </div>
      )}
      {e.state === "empty" && (
        <div class="agent-card" data-testid="agent-empty">
          <p>{tr("agent.empty")}</p>
          <div class="actions">
            <button type="button" class="btn" data-action="agent-discard" onClick={props.onDiscard}>
              {tr("agent.discard")}
            </button>
          </div>
        </div>
      )}
      {plan && ["plan", "applying", "applied", "discarded"].includes(e.state) && (
        <div class="agent-card" data-testid="agent-plan">
          <span class="eyebrow" data-testid="agent-plan-title">
            {e.state === "applied"
              ? tr("agent.applied")
              : e.state === "discarded"
                ? tr("agent.discarded")
                : tr("agent.plan")}
          </span>
          <span>
            {plan.change?.startsWith("draft-") ? tr("agent.planLeadDraft") : tr("agent.planLead")}
          </span>
          <div class="agent-files mono">
            {plan.files.map((f) => (
              <span key={f.path} data-file={f.path} data-change={f.change} title={f.path}>
                <b class={`mark ${f.change}`}>{f.mark}</b> {f.shown}
                {f.why && <span class="muted"> ({f.why})</span>}
              </span>
            ))}
          </div>
          {e.findings
            .filter((f) => f.code === "edit_refused" || f.code === "then_failed")
            .map((f, i) => (
              <span key={i} class="muted small" data-finding={f.code}>
                {f.code}: {f.message}
              </span>
            ))}
          <span class="muted small" data-testid="agent-then">
            <Then tr={tr} then={plan.then} />
          </span>
          {e.state === "plan" && (
            <div class="actions">
              <button
                type="button"
                class="btn pri"
                data-action="agent-apply"
                onClick={props.onApply}
              >
                {tr("agent.apply")}
              </button>
              <button
                type="button"
                class="btn"
                data-action="agent-discard"
                onClick={props.onDiscard}
              >
                {tr("agent.discard")}
              </button>
            </div>
          )}
          {e.state === "applying" && <span class="muted">{tr("agent.applying")}</span>}
          {e.state === "applied" && (
            <>
              <span class="muted small" data-testid="agent-written">
                {tr("agent.wrote", { files: e.written.join(", ") })}
              </span>
              {e.checks.map((c) => (
                <span key={c.command} class="muted small mono">
                  {tr("agent.check", { command: c.command, exit: c.exit })}
                </span>
              ))}
            </>
          )}
        </div>
      )}
      {plan && (
        <div class="agent-read muted" data-testid="agent-read">
          <span class="dot ok" />
          {plan.read.length
            ? tr("agent.read", { files: readShown(plan.read) })
            : tr("agent.noRead")}
          {plan.tokens !== null &&
            ` · ${tr("agent.tokens", { tokens: tokensShown(plan.tokens, props.lang) })}`}
        </div>
      )}
    </div>
  );
}

/** A unified diff's line, by its first character. */
const lineClass = (l: string) =>
  l.startsWith("+++") || l.startsWith("---")
    ? "dh"
    : l.startsWith("+")
      ? "add"
      : l.startsWith("-")
        ? "del"
        : l.startsWith("@@")
          ? "hunk"
          : "";

/** "Ver el diff y aplicar": every file's diff, then the confirmation (REQ-182). */
function DiffDialog(props: {
  entry: AgentEntry;
  tr: Tr;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { tr } = props;
  const files = props.entry.plan?.files ?? [];
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => confirm.current?.focus(), []);
  return (
    <div class="scrim" onClick={props.onCancel}>
      <div
        class="help agent-diff"
        role="dialog"
        aria-modal="true"
        aria-label={tr("agent.diffTitle")}
        data-testid="agent-diff"
        onClick={(ev) => ev.stopPropagation()}
        onKeyDown={(ev) => ev.key === "Escape" && props.onCancel()}
      >
        <h2>{tr("agent.diffTitle")}</h2>
        <p class="muted">{tr("agent.diffBody", { count: files.length })}</p>
        {files.map((f) => (
          <section key={f.path} data-file={f.path}>
            <h3 class="mono">
              <b class={`mark ${f.change}`}>{f.mark}</b> {f.path}
            </h3>
            <pre class="diff">
              {f.diff
                .replace(/\n$/, "")
                .split("\n")
                .filter((l) => !/^(diff --git|index |new file mode|deleted file mode)/.test(l))
                .map((l, i) => (
                  <div key={i} class={lineClass(l)}>
                    {l || " "}
                  </div>
                ))}
            </pre>
          </section>
        ))}
        <div class="actions">
          <button
            type="button"
            class="btn pri"
            ref={confirm}
            data-action="agent-confirm"
            onClick={props.onConfirm}
          >
            {tr("agent.confirm")}
          </button>
          <button type="button" class="btn" data-action="agent-cancel" onClick={props.onCancel}>
            {tr("agent.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

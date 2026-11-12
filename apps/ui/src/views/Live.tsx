import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type {
  LiveAttempt,
  LiveQuestion,
  LiveRequirement,
  LiveStage,
  LiveView,
  LogLine,
  RunResult,
  SpecgateCommand,
} from "@specgate-studio/protocol";
import { HelpButton, type HelpRequest } from "../Help.js";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { bt, type BuildTextKey } from "./buildText.js";
import { price, priceShort, tokens as tokenWords, turns } from "../usage.js";

export interface LiveProps {
  rpc: Rpc;
  lang: Lang;
  /** Runs a command for a button; the terminal's echo names the button (REQ-053). */
  run: (label: string, command: SpecgateCommand) => Promise<RunResult>;
  /** Opens the "?" of a feature: what it does, running nothing. */
  onHelp: (feature: string, requests: HelpRequest[]) => void;
  /** Names the button whose command runs next, in the terminal's echo (REQ-053). */
  announce: (label: string) => void;
  /** The requirements by module, for the tiles (draft-design-conformance REQ-175, A13). */
  modules?: Array<{ name: string; requirements: Array<{ id: string; state: string }> }>;
  /** Titles of the requirements, by id. */
  titles?: ReadonlyMap<string, string>;
  /** The Developer pays per use: the dollars read as cost, not "≈ precio de API" (demo-findings REQ-211). */
  perUse?: boolean;
}

type T = (key: BuildTextKey, vars?: Record<string, string | number>) => string;

/** How far from the log's end still counts as following it, in px (A8). */
const FOLLOW_PX = 24;

/** A time as the board writes it (A2): "0,2 s" under a minute, then "m:ss". */
function duration(lang: Lang, s: number): string {
  if (s < 60) return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(s)} s`;
  return clock(s);
}

/** "m:ss", or "h:mm:ss" past an hour: a running timer. */
function clock(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Tokens as the board writes them: "182 k tokens", "11,8 M tokens" past a million. */
function tokenText(lang: Lang, n: number): string {
  return tokenWords(lang, n);
}

/** An event's time, `HH:MM:SS` in local time (A6). */
function hms(t: number): string {
  const d = new Date(t * 1000);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

const MARK: Record<LiveStage["mark"], string> = {
  done: "✓",
  running: "●",
  waiting: "○",
  failed: "✗",
  skipped: "–",
};

/**
 * Live as the "En vivo" board draws it (draft-live-polish REQ-103, REQ-105,
 * REQ-201): a header with the requirements passed, running and failed, the
 * time elapsed, tokens, cost and the two stops; on the left the modules and
 * the queue with estimates; in the centre the requirement in progress with
 * the harness's stages and SALIDA DEL AGENTE, one line per action, following
 * the end; on the right NECESITA ATENCIÓN — the agent's question, answered
 * here (REQ-104) — and TERMINADOS with time and cost. The host folds the
 * harness's events; this only draws them, counting running timers on the clock.
 */
export function Live(p: LiveProps) {
  const t: T = (key, vars) => bt(p.lang, key, vars);
  const [view, setView] = useState<LiveView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmStop, setConfirmStop] = useState(false);
  const [tab, setTab] = useState<"steps" | "requirement" | "files" | "attempts" | "agent">("steps");

  useEffect(() => {
    let live = true;
    const off = p.rpc.on("live.changed", (v) => setView(v));
    p.rpc.ask("live.get", {}).then(
      (v) => live && setView((old) => old ?? v),
      () => undefined,
    );
    return () => {
      live = false;
      off();
    };
  }, [p.rpc]);

  // Running timers advance every second while a build runs (A4).
  const building = view?.building ?? null;
  useEffect(() => {
    if (!building) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [building]);

  if (!view) return null;
  const nowS = now / 1000;
  const current =
    view.requirements.find((r) => r.req === view.building) ?? view.requirements[0] ?? null;
  const others = view.requirements.filter((r) => r !== current);
  const ended = view.requirements.filter((r) => r.state === "pass" || r.state === "fail");
  const counts = {
    pass: view.requirements.filter((r) => r.state === "pass").length,
    running: view.requirements.filter((r) => r.state === "running").length,
    fail: view.requirements.filter((r) => r.state === "fail").length,
  };
  const title = (req: string) => p.titles?.get(req) ?? "";
  const tokens =
    view.totals.input + view.totals.output + view.totals.cacheRead + view.totals.cacheWrite;
  const elapsed =
    view.since > 0 && view.requirements.length > 0
      ? (view.ended ?? (view.building ? nowS : view.since)) - view.since
      : 0;
  const stopVars = view.building
    ? { req: view.building, queued: view.queue.join(", ") || "—" }
    : undefined;
  return (
    <div class="live live3 lboard" data-building={view.building ?? ""}>
      <header class="lbar" data-testid="live-cost">
        <span class="ok">✓ {t("live.passed", { n: counts.pass })}</span>
        <span class="run">● {t("live.runningN", { n: counts.running })}</span>
        <span class="bad">✗ {t("live.failed", { n: counts.fail })}</span>
        <span class="mono lbar-num">
          <span data-testid="live-elapsed">{clock(elapsed)}</span>
          {" · "}
          <span data-testid="live-tokens" data-tokens={tokens}>
            {tokenText(p.lang, tokens)}
          </span>
          {view.totals.turns !== null && (
            <>
              {" · "}
              <span data-testid="live-turns">{turns(p.lang, view.totals.turns)}</span>
            </>
          )}
          {" · "}
          {/* What Claude Code reports: at API prices, unless the Developer pays per use (REQ-211). */}
          <span data-cost={view.totals.cost ?? ""} data-per-use={p.perUse ? "1" : undefined}>
            {view.totals.cost === null
              ? t("live.noCost")
              : price(p.lang, view.totals.cost, p.perUse === true)}
          </span>
        </span>
        <span class="grow" />
        {view.building && stopVars && (
          <span class="lstop">
            <button
              type="button"
              class="btn"
              data-act="stop-after"
              disabled={view.stopping}
              onClick={() => {
                p.announce(t("live.stopAfter"));
                void p.rpc.ask("build.stop", { now: false });
              }}
            >
              {t("live.stopAfter")}
            </button>
            <HelpButton
              label={`? ${t("live.stopAfter")}`}
              onOpen={() =>
                p.onHelp(t("live.stopAfter"), [
                  { action: "build-stop-after", feature: t("live.stopAfter"), vars: stopVars },
                ])
              }
            />
            <button
              type="button"
              class="btn danger"
              data-act="stop-now"
              onClick={() => setConfirmStop(true)}
            >
              {t("live.stopNow")}
            </button>
            <HelpButton
              label={`? ${t("live.stopNow")}`}
              onOpen={() =>
                p.onHelp(t("live.stopNow"), [
                  { action: "build-stop-now", feature: t("live.stopNow"), vars: stopVars },
                ])
              }
            />
          </span>
        )}
        <HelpButton
          label={t("live.help")}
          onOpen={() =>
            p.onHelp(t("live.help"), [
              {
                action: "build",
                feature: t("live.help"),
                vars: view.building ? { req: view.building } : {},
              },
            ])
          }
        />
      </header>

      <div class="lcols">
        <aside class="side" aria-label={t("live.byModule")}>
          <div class="shead">
            <h1 class="shead-h">{t("live.byModule")}</h1>
          </div>
          <div class="ltiles">
            {(p.modules ?? []).map((m) => (
              <div key={m.name} class="ltile-group" data-module={m.name}>
                <div class="ltile-name">{m.name}</div>
                <div class="ltile-row">
                  {m.requirements.map((r) => (
                    <span
                      key={r.id}
                      class={`ltile ${r.id === view.building ? "building" : r.state}`}
                      title={`${r.id} ${title(r.id)}`}
                      data-req={r.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div class="sgroup">{t("live.queue")}</div>
          <ol class="lqueue" data-testid="live-queue">
            {view.building && (
              <li class="q" data-req={view.building} data-now>
                <span class="mark run">●</span>
                <span class="name">
                  <span class="mono">{view.building}</span> {title(view.building)}
                </span>
                <span class="right">{t("live.now")}</span>
              </li>
            )}
            {view.queue.map((r) => {
              const minutes = view.estimates[r];
              return (
                <li class="q" key={r} data-req={r} data-queued>
                  <span class="mark muted">○</span>
                  <span class="name">
                    <span class="mono">{r}</span> {title(r)}
                  </span>
                  <span class="right muted" data-estimate={minutes ?? ""}>
                    {minutes != null ? `~${t("live.mins", { n: minutes })}` : t("live.noEstimate")}
                  </span>
                </li>
              );
            })}
            {!view.building && view.queue.length === 0 && (
              <li class="muted side-empty">{t("live.queueEmpty")}</li>
            )}
          </ol>
        </aside>

        <div class="detail lmid">
          <div class="lhead" data-testid="live-building">
            {current ? (
              <>
                <div class="v" title={`${current.req} ${title(current.req)}`}>
                  <span class="lreqid mono">{current.req}</span>{" "}
                  <span class="syne">{title(current.req)}</span>
                </div>
                <div class="muted lsub" data-testid="live-attempt">
                  {view.building === current.req && (
                    <span class="sr">{t("live.building", { req: current.req })} · </span>
                  )}
                  {t("live.attemptOf", {
                    n: current.attempt,
                    m: current.maxAttempts,
                    branch: current.branch,
                  })}
                </div>
              </>
            ) : (
              <span class="muted">{t("live.idle")}</span>
            )}
          </div>
          {view.building && view.stopping && (
            <p class="card lstopping" role="status" data-testid="live-stopping">
              {t("live.stopping", { req: view.building, queued: view.queue.join(", ") || "—" })}
            </p>
          )}
          <div class="ltabs" role="tablist">
            {(["steps", "requirement", "files", "attempts", "agent"] as const).map((k) => (
              <button
                type="button"
                role="tab"
                class="ptab"
                key={k}
                data-tab={k}
                aria-selected={tab === k}
                onClick={() => setTab(k)}
              >
                {t(`live.tab.${k}`)}
              </button>
            ))}
          </div>
          {tab === "steps" &&
            (current ? (
              <>
                <Stages r={current} t={t} lang={p.lang} now={nowS} />
                {others.map((r) => (
                  <section class="lreq lother" key={r.req} data-req={r.req} data-state={r.state}>
                    <span class="mono">{r.req}</span>{" "}
                    <span class={`ltag ${r.state}`}>
                      {t(`live.state.${r.state}` as BuildTextKey)}
                    </span>
                  </section>
                ))}
              </>
            ) : (
              <p class="muted">{t("live.noSteps")}</p>
            ))}
          {tab === "requirement" && current && (
            <div class="card" data-tab-body="requirement">
              <b class="mono">{current.req}</b> {title(current.req)}
              <p class="muted">{t("live.attempt", { n: current.attempt })}</p>
            </div>
          )}
          {tab === "files" && current && (
            <ul class="card mono lfiles" data-tab-body="files">
              {[
                ...new Set(
                  view.log
                    .filter(
                      (l) =>
                        l.req === current.req &&
                        (l.verb === "write" || l.verb === "edit" || l.verb === "read"),
                    )
                    .map((l) => l.target)
                    .filter(Boolean),
                ),
              ].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {tab === "attempts" && current && (
            <Attempts attempts={current.attempts} t={t} lang={p.lang} />
          )}
          {tab === "agent" && (
            <ol class="lsay card" data-tab-body="agent" aria-label={t("live.agentText")}>
              {view.output.map((l, i) => (
                <li key={`${l.t}-${i}`} data-kind={l.kind} data-req={l.req}>
                  <span class="muted mono">{hms(l.t)}</span> {l.text}
                </li>
              ))}
              {view.output.length === 0 && <li class="muted">{t("live.noOutput")}</li>}
            </ol>
          )}

          <AgentLog log={view.log} t={t} />
        </div>

        <aside class="side right" aria-label={t("live.attention")}>
          <div class="shead">
            <span>{t("live.attention")}</span>
          </div>
          {view.questions.length === 0 && <p class="muted side-empty">{t("live.noAttention")}</p>}
          {view.questions.map((q) => (
            <Question
              key={`${q.req}/${q.id ?? q.text}`}
              q={q}
              t={t}
              onAnswer={(answer) =>
                q.id &&
                q.change &&
                void p.run(t("live.question.answer"), {
                  name: "answer",
                  q: q.id,
                  answer,
                  change: q.change,
                })
              }
              onHelp={() =>
                p.onHelp(t("live.question.answer"), [
                  {
                    action: "answer",
                    feature: t("live.question.answer"),
                    vars: q.id && q.change ? { q: q.id, change: q.change } : {},
                  },
                ])
              }
            />
          ))}
          <div class="sgroup">{t("live.finished")}</div>
          {ended.length === 0 && <p class="muted side-empty">{t("live.noneFinished")}</p>}
          <ul class="lfinished">
            {ended.map((r) => (
              <li class="q" key={r.req} data-finished={r.req} data-state={r.state}>
                <span class={r.state === "pass" ? "ok" : "bad"}>
                  {r.state === "pass" ? "✓" : "✗"}
                </span>
                <span class="name mono">
                  {[
                    r.req,
                    r.seconds !== null
                      ? t("live.mins", { n: Math.max(1, Math.round(r.seconds / 60)) })
                      : null,
                    r.usage
                      ? tokenText(
                          p.lang,
                          r.usage.input + r.usage.output + r.usage.cacheRead + r.usage.cacheWrite,
                        )
                      : null,
                    r.usage?.cost != null
                      ? priceShort(p.lang, r.usage.cost, p.perUse === true)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {confirmStop && view.building && (
        <div class="scrim" onClick={() => setConfirmStop(false)}>
          <div
            class="help"
            role="dialog"
            data-confirm="stop-now"
            aria-label={t("live.stopNow.title", { req: view.building })}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t("live.stopNow.title", { req: view.building })}</h2>
            <p class="muted">{t("live.stopNow.body")}</p>
            <div class="actions">
              <button
                type="button"
                class="btn pri"
                data-act="confirm"
                onClick={() => {
                  setConfirmStop(false);
                  p.announce(t("live.stopNow.confirm"));
                  void p.rpc.ask("build.stop", { now: true });
                }}
              >
                {t("live.stopNow.confirm")}
              </button>
              <button
                type="button"
                class="btn"
                data-act="cancel"
                onClick={() => setConfirmStop(false)}
              >
                {t("build.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The harness's stages of one requirement (REQ-103): ✓ ● ○ ✗, each with its time or its timer. */
function Stages(props: { r: LiveRequirement; t: T; lang: Lang; now: number }) {
  const { r, t } = props;
  return (
    <section class="lreq" data-req={r.req} data-state={r.state} data-attempt={r.attempt}>
      <ol class="lstages">
        {r.stages.map((s, i) => {
          const time =
            s.mark === "running" && s.since !== null
              ? clock(props.now - s.since)
              : s.seconds !== null
                ? duration(props.lang, s.seconds)
                : s.mark === "skipped"
                  ? t("live.stage.skipped")
                  : // Done with no time of its own from specgate: "—", never a guess (demo-findings REQ-103).
                    s.mark === "done" || s.mark === "failed"
                    ? "—"
                    : "";
          const name =
            s.id === "gate"
              ? t("live.stage.gate", { stage: s.label })
              : t(`live.stage.${s.id}` as BuildTextKey);
          return (
            <li class="lstep" key={`${s.id}-${s.label}-${i}`} data-kind={s.id} data-result={s.mark}>
              <span class={`lmark ${s.mark}`} aria-hidden="true">
                {MARK[s.mark]}
              </span>
              <span class="lname">
                <span class="lstage">{name}</span>
                {s.id === "agent" && <span class="muted"> · {t("live.stage.agent.sub")}</span>}
                {s.id === "setup" && s.label && <span class="muted mono"> · {s.label}</span>}
                {(s.id === "tests" || s.id === "architecture") && s.label && (
                  <span class="muted mono"> · {s.label}</span>
                )}
                {s.pass !== null && (
                  <span class="muted">
                    {" "}
                    · {t("live.passing", { n: s.pass })}
                    {s.fail ? `, ${t("live.failing", { n: s.fail })}` : ""}
                  </span>
                )}
              </span>
              <span class={`ltime mono ${s.mark}`}>{time}</span>
            </li>
          );
        })}
      </ol>
      {r.attempts.length > 1 && (
        <Attempts attempts={r.attempts.slice(0, -1)} t={t} lang={props.lang} compact />
      )}
    </section>
  );
}

/** INTENTOS: each attempt, how it ended, and where a failed one stopped. */
function Attempts(props: { attempts: LiveAttempt[]; t: T; lang: Lang; compact?: boolean }) {
  const { t } = props;
  return (
    <ol class={props.compact ? "lattempts compact" : "card lattempts"} data-tab-body="attempts">
      {props.attempts.map((a) => (
        <li key={a.attempt} data-attempt={a.attempt} data-result={a.result}>
          <span class={a.result === "pass" ? "ok" : a.result === "fail" ? "bad" : "run"}>
            {a.result === "pass" ? "✓" : a.result === "fail" ? "✗" : "●"}
          </span>{" "}
          {t("live.attemptRow", { n: a.attempt })} ·{" "}
          {a.result === "fail"
            ? t("live.attemptFailed", { stage: a.stage ?? "—" })
            : a.result === "pass"
              ? t("live.attemptPassed")
              : a.result === "question"
                ? t("live.attemptQuestion")
                : t("live.attemptRunning")}
          {a.seconds !== null && (
            <span class="muted mono"> · {duration(props.lang, a.seconds)}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * SALIDA DEL AGENTE (REQ-201): one line per action, its time, its verb, its
 * target on one row, the whole of it on hover and below once expanded; the
 * counts specgate's events give. It follows the end until the Developer
 * scrolls up, and offers to go back (A8).
 */
function AgentLog(props: { log: LogLine[]; t: T }) {
  const { t } = props;
  const ref = useRef<HTMLOListElement>(null);
  const [follow, setFollow] = useState(true);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const lines = props.log.length;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && follow) el.scrollTop = el.scrollHeight;
  }, [lines, follow]);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setFollow(el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_PX);
  };
  return (
    <section class="llog" data-testid="live-log" data-following={follow ? "1" : undefined}>
      <div class="llog-h">
        <h2 class="sgroup">{t("live.output")}</h2>
        {follow ? (
          <span class="muted" data-testid="live-follow">
            {t("live.follow")}
          </span>
        ) : (
          <button
            type="button"
            class="cl"
            data-testid="live-follow"
            data-paused="1"
            onClick={() => setFollow(true)}
          >
            {t("live.followBack")}
          </button>
        )}
      </div>
      <ol class="lout mono" data-testid="live-output" ref={ref} onScroll={onScroll}>
        {props.log.map((l, i) => {
          const key = `${l.t}-${i}`;
          const expanded = open.has(key);
          return (
            <li
              key={key}
              data-kind={l.verb}
              data-req={l.req}
              data-result={l.result ?? undefined}
              aria-expanded={expanded}
              title={l.full}
              onClick={() =>
                setOpen((o) => {
                  const next = new Set(o);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
            >
              <div class="lrow">
                <span class="lt muted">{hms(l.t)}</span>
                <span class={`lverb ${l.verb}`}>{l.verb}</span>
                <span class="ltarget">{l.target}</span>
                <LogTail l={l} t={t} />
              </div>
              {expanded && <pre class="lfull">{l.full}</pre>}
            </li>
          );
        })}
        {lines === 0 && <li class="muted">{t("live.noOutput")}</li>}
      </ol>
    </section>
  );
}

/** What follows a line's target: an edit's lines added, a run's result and counts. */
function LogTail(props: { l: LogLine; t: T }) {
  const { l, t } = props;
  if (l.verb === "edit" || l.verb === "write")
    return l.added !== null ? <span class="ladd">+{l.added}</span> : null;
  if (l.verb !== "run") return null;
  const ok = l.result !== "error";
  const n = ok ? l.pass : l.fail;
  return (
    <span class={ok ? "lres ok" : "lres bad"}>
      {ok ? "✓" : "✗"}
      {n !== null ? ` ${t(ok ? "live.passing" : "live.failing", { n })}` : ""}
    </span>
  );
}

/** The agent's question (REQ-104): answered here, or its answer recorded under it. */
function Question(props: {
  q: LiveQuestion;
  t: T;
  onAnswer: (answer: string) => void;
  onHelp: () => void;
}) {
  const { q, t } = props;
  const [chosen, setChosen] = useState("");
  const state = q.answer !== null ? "answered" : q.id ? "open" : "unrecorded";
  return (
    <section
      class="card qcard lquestion"
      data-req={q.req}
      data-question={q.id ?? undefined}
      data-state={state}
    >
      <div class="lq-h">{t("live.question", { req: q.req })}</div>
      <div>
        {q.id && <b>{q.id} </b>}
        {q.text}
      </div>
      {state === "unrecorded" && <p class="muted">{t("live.question.unrecorded")}</p>}
      {state === "answered" && (
        <div class="qanswer">
          {t("live.question.answered")} <b data-answer>{q.answer}</b>
          <span class="muted"> · {t("live.question.review")}</span>
        </div>
      )}
      {state === "open" && (
        <div class="qopts">
          {q.options.length > 0 && <span class="muted">{t("live.question.options")}</span>}
          {q.options.map((o) => (
            <button
              type="button"
              class="btn"
              key={o}
              data-option={o}
              aria-pressed={chosen === o}
              onClick={() => setChosen(o)}
            >
              {o}
            </button>
          ))}
          <input
            class="filter"
            aria-label={t("live.question.other")}
            placeholder={t("live.question.other")}
            onInput={(e) => setChosen((e.target as HTMLInputElement).value)}
          />
          <button
            type="button"
            class="btn pri"
            data-act="answer"
            disabled={!chosen.trim()}
            onClick={() => props.onAnswer(chosen.trim())}
          >
            {t("live.question.answer")}
          </button>
          <HelpButton label={`? ${t("live.question.answer")}`} onOpen={props.onHelp} />
        </div>
      )}
    </section>
  );
}

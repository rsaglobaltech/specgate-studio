import { useEffect, useRef, useState } from "preact/hooks";
import type {
  LiveQuestion,
  LiveRequirement,
  LiveStep,
  LiveView,
  RunResult,
  SpecgateCommand,
} from "@specgate-studio/protocol";
import { HelpButton, type HelpRequest } from "../Help.js";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { bt, type BuildTextKey } from "./buildText.js";

export interface LiveProps {
  rpc: Rpc;
  lang: Lang;
  /** Runs a command for a button; the terminal's echo names the button (REQ-053). */
  run: (label: string, command: SpecgateCommand) => Promise<RunResult>;
  /** Opens the "?" of a feature: what it does, running nothing. */
  onHelp: (feature: string, requests: HelpRequest[]) => void;
  /** Names the button whose command runs next, in the terminal's echo (REQ-053). */
  announce: (label: string) => void;
}

type T = (key: BuildTextKey, vars?: Record<string, string | number>) => string;

/**
 * Live (draft-build-live REQ-103): while a build runs, each requirement's
 * steps with the time each took, the agent's output as it streams, the queue,
 * and the cost and tokens so far. The host folds the harness's events and
 * tells every open UI the same view; this renders it, counting the running
 * step's time on the clock. The agent's question is answered here, through
 * `specgate answer` (REQ-104). Stop after this requirement, or now once
 * confirmed (REQ-105).
 */
export function Live(p: LiveProps) {
  const t: T = (key, vars) => bt(p.lang, key, vars);
  const [view, setView] = useState<LiveView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmStop, setConfirmStop] = useState(false);
  const out = useRef<HTMLOListElement>(null);

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

  // The running step's time, counted while it runs.
  const building = view?.building ?? null;
  useEffect(() => {
    if (!building) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [building]);

  // The output follows what the agent writes, as a terminal does.
  const lines = view?.output.length ?? 0;
  useEffect(() => {
    const el = out.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  if (!view) return null;
  const nf = new Intl.NumberFormat(p.lang);
  return (
    <div class="live" data-building={view.building ?? ""}>
      <p class="muted">{t("live.intro")}</p>
      <div class="cards">
        <div class="card" data-testid="live-building">
          <div class="v" style="font-size:18px">
            {view.building ? (
              t("live.building", { req: view.building })
            ) : (
              <span class="muted">{t("live.idle")}</span>
            )}
          </div>
        </div>
        <div class="card" data-testid="live-queue">
          <div class="k">{t("live.queue")}</div>
          {view.queue.length ? (
            <ol class="lqueue mono">
              {view.queue.map((r) => (
                <li key={r} data-req={r}>
                  {r}
                </li>
              ))}
            </ol>
          ) : (
            <div class="muted">{t("live.queueEmpty")}</div>
          )}
        </div>
        <div class="card" data-testid="live-cost">
          <div class="k">{t("live.cost")}</div>
          <div class="v" style="font-size:18px" data-cost={view.totals.cost ?? ""}>
            {view.totals.cost === null ? (
              <span class="muted">{t("live.noCost")}</span>
            ) : (
              `$${view.totals.cost.toFixed(2)}`
            )}
          </div>
          <div class="muted" data-testid="live-tokens" style="font-size:12px">
            {t("live.tokensText", {
              input: nf.format(view.totals.input),
              output: nf.format(view.totals.output),
              cache: nf.format(view.totals.cacheRead),
            })}
          </div>
        </div>
      </div>

      {view.building && (
        <div class="actions lstop">
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
                {
                  action: "build-stop-after",
                  feature: t("live.stopAfter"),
                  vars: { req: view.building!, queued: view.queue.join(", ") || "—" },
                },
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
                {
                  action: "build-stop-now",
                  feature: t("live.stopNow"),
                  vars: { req: view.building!, queued: view.queue.join(", ") || "—" },
                },
              ])
            }
          />
        </div>
      )}
      {view.building && view.stopping && (
        <p class="card lstopping" role="status" data-testid="live-stopping">
          {t("live.stopping", { req: view.building, queued: view.queue.join(", ") || "—" })}
        </p>
      )}
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
                  p.announce(t("live.stopNow"));
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

      {view.requirements.map((r) => (
        <Requirement key={r.req} r={r} t={t} now={now} />
      ))}

      <h2 class="qhead">{t("live.output")}</h2>
      <ol class="lout mono" data-testid="live-output" ref={out}>
        {view.output.map((l, i) => (
          <li key={`${l.t}-${i}`} data-kind={l.kind} data-req={l.req}>
            <span class="muted">{l.req}</span> {l.text}
          </li>
        ))}
      </ol>
      {view.output.length === 0 && <p class="muted">{t("live.noOutput")}</p>}
    </div>
  );
}

function Requirement(props: { r: LiveRequirement; t: T; now: number }) {
  const { r, t } = props;
  return (
    <section class="card lreq" data-req={r.req} data-state={r.state}>
      <div class="bline">
        <b class="mono">{r.req}</b>
        <span class={`ltag ${r.state}`}>{t(`live.state.${r.state}` as BuildTextKey)}</span>
        <span class="muted">{t("live.attempt", { n: r.attempt })}</span>
      </div>
      <table class="lsteps">
        <tbody>
          {r.steps.map((s, i) => (
            <Step key={i} s={s} t={t} now={props.now} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Step(props: { s: LiveStep; t: T; now: number }) {
  const { s, t } = props;
  const time =
    s.seconds !== null
      ? `${s.seconds} s`
      : t("live.running", { s: Math.max(0, Math.round(props.now / 1000 - s.since)) });
  return (
    <tr class="lstep" data-kind={s.kind} data-result={s.result}>
      <td class="mono">{s.kind}</td>
      <td class="mono">{s.kind === "agent" ? t("live.agent") : s.label}</td>
      <td class="ltime mono">{time}</td>
      <td class={`ltag ${s.result}`}>{s.result}</td>
    </tr>
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
      <div class="muted">{t("live.question", { req: q.req })}</div>
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

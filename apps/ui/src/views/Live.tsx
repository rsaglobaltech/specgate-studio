import { useEffect, useRef, useState } from "preact/hooks";
import type { LiveRequirement, LiveStep, LiveView } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { bt, type BuildTextKey } from "./buildText.js";

export interface LiveProps {
  rpc: Rpc;
  lang: Lang;
}

type T = (key: BuildTextKey, vars?: Record<string, string | number>) => string;

/**
 * Live (draft-build-live REQ-103): while a build runs, each requirement's
 * steps with the time each took, the agent's output as it streams, the queue,
 * and the cost and tokens so far. The host folds the harness's events and
 * tells every open UI the same view; this renders it, counting the running
 * step's time on the clock.
 */
export function Live(p: LiveProps) {
  const t: T = (key, vars) => bt(p.lang, key, vars);
  const [view, setView] = useState<LiveView | null>(null);
  const [now, setNow] = useState(() => Date.now());
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

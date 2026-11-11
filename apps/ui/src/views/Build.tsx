import { useEffect, useState } from "preact/hooks";
import type { BuildItem, BuildList, Estimate, WaitingItem } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { bt, type BuildTextKey } from "./buildText.js";

export interface BuildProps {
  rpc: Rpc;
  lang: Lang;
  /** The sections Build is made of: when one is read again, so is the list. */
  stamp: readonly unknown[];
  /** The requirement the editor's Build lens opened Build on. */
  focus: string | null;
  /** Opens the "?" of a feature: what it does, running nothing. */
  onHelp: (feature: string, requests: HelpRequest[]) => void;
}

/**
 * Build (draft-build-live): what is ready, its estimate and who codes
 * (REQ-101), and apart, each requirement not ready with why. It renders what
 * the host answers; the core decides what is ready.
 */
export function Build(p: BuildProps) {
  const t = (key: BuildTextKey, vars?: Record<string, string | number>) => bt(p.lang, key, vars);
  const [list, setList] = useState<BuildList | null>(null);
  const [unreadable, setUnreadable] = useState(false);

  useEffect(() => {
    let live = true;
    p.rpc.ask("build.get", {}).then(
      (l) => live && (setList(l), setUnreadable(false)),
      () => live && setUnreadable(true),
    );
    return () => {
      live = false;
    };
  }, [p.rpc, ...p.stamp]);

  if (unreadable) return <p class="muted">{t("build.unreadable")}</p>;
  if (!list) return null;

  const help = (req: string) =>
    p.onHelp(t("build.req", { req }), [
      { action: "build", feature: t("build.req", { req }), vars: { req } },
    ]);

  return (
    <div class="build" data-agent={list.agent ?? ""}>
      <p class="muted">{t("build.intro")}</p>
      <div class="cards">
        <div class="card" data-testid="build-agent">
          <div class="k">{t("build.agent")}</div>
          {list.agent ? (
            <div class="v mono" title={list.agentCommand ?? ""}>
              {list.agent}
            </div>
          ) : (
            <div class="noagent">
              <p style="margin:4px 0">{t("build.noAgent")}</p>
              <span class="muted">{t("build.setAgent")} </span>
              <code class="mono" data-testid="set-agent">
                {list.setAgent}
              </code>
              <HelpButton
                label={`? ${list.setAgent}`}
                onOpen={() =>
                  p.onHelp(list.setAgent, [{ action: "agents-init", feature: list.setAgent }])
                }
              />
            </div>
          )}
        </div>
        <div class="card" data-testid="build-estimate">
          <div class="k">{t("build.estimate")}</div>
          <div class="v" style="font-size:16px">
            <EstimateText estimate={list.estimate} t={t} />
          </div>
          {list.estimate && list.estimate.runs > 0 && (
            <div class="muted" style="font-size:12px">
              {t("build.estimateFrom", { runs: list.estimate.runs })}
            </div>
          )}
        </div>
      </div>

      <h2 class="qhead">{t("build.ready", { n: list.ready.length })}</h2>
      {list.ready.length === 0 && <p class="muted">{t("build.noneReady")}</p>}
      <ul class="breqs" data-group="ready">
        {list.ready.map((r) => (
          <ReadyRow
            key={r.id}
            r={r}
            focus={p.focus === r.id}
            estimate={list.estimate}
            agent={list.agent}
            t={t}
            onHelp={() => help(r.id)}
          />
        ))}
      </ul>

      {list.waiting.length > 0 && (
        <>
          <h2 class="qhead">{t("build.waiting", { n: list.waiting.length })}</h2>
          <ul class="breqs" data-group="waiting">
            {list.waiting.map((w) => (
              <WaitingRow key={w.id} w={w} t={t} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

type T = (key: BuildTextKey, vars?: Record<string, string | number>) => string;

function EstimateText(props: { estimate: Estimate | null; t: T }) {
  const e = props.estimate;
  if (!e || e.minutes === null) return <span class="muted">{props.t("build.noEstimate")}</span>;
  return (
    <span data-estimate={e.minutes}>
      {props.t("build.estimateEach", { minutes: e.minutes })}
      {e.cost !== null && ` · ${props.t("build.estimateCost", { cost: e.cost.toFixed(2) })}`}
    </span>
  );
}

function ReadyRow(props: {
  r: BuildItem;
  focus: boolean;
  estimate: Estimate | null;
  agent: string | null;
  t: T;
  onHelp: () => void;
}) {
  const { r, t } = props;
  return (
    <li class="card breq" data-req={r.id} data-focus={props.focus ? "1" : undefined}>
      <div class="bline">
        <b class="mono">{r.id}</b>
        <span>{r.title}</span>
        {r.change && <span class="muted mono">{r.change}</span>}
      </div>
      <div class="bline muted">
        <span class="best">
          <EstimateText estimate={props.estimate} t={t} />
        </span>
        <span class="bagent mono" data-agent={props.agent ?? ""}>
          {props.agent ?? "—"}
        </span>
        <HelpButton label={`? ${t("build.req", { req: r.id })}`} onOpen={props.onHelp} />
      </div>
    </li>
  );
}

function WaitingRow(props: { w: WaitingItem; t: T }) {
  const { w, t } = props;
  const why =
    w.why === "question"
      ? t("build.why.question", { q: w.question ?? "?" })
      : w.why === "review"
        ? t("build.why.review", { change: w.change ?? "" })
        : t("build.why.scenario");
  return (
    <li class="card breq" data-req={w.id} data-why={w.why} data-question={w.question ?? undefined}>
      <div class="bline">
        <b class="mono">{w.id}</b>
        <span>{w.title}</span>
      </div>
      <div class="muted">{why}</div>
    </li>
  );
}

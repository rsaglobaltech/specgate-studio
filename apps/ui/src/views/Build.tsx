import { useEffect, useRef, useState } from "preact/hooks";
import type {
  BuildItem,
  BuildList,
  BuildStart,
  Estimate,
  RunResult,
  SpecgateCommand,
  Uncommitted,
  WaitingItem,
} from "@specgate-studio/protocol";
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
  /** Names the button whose command runs next, in the terminal's echo (REQ-053). */
  announce: (label: string) => void;
  /** Opens Live. */
  onLive: () => void;
  /** Runs a specgate command for a button, in the terminal (REQ-053): "Configurar agente". */
  run: (label: string, command: SpecgateCommand) => Promise<RunResult>;
}

type Waits = Extract<BuildStart, { code: "build_waits" }>;

/**
 * Build (draft-build-live): what is ready, its estimate and who codes
 * (REQ-101), and apart, each requirement not ready with why. Build on one
 * starts it, or says why it waits on uncommitted work and offers commit,
 * stash or ignore, each confirmed after its files are shown by folder
 * (REQ-102). It renders what the host answers; the core decides.
 */
export function Build(p: BuildProps) {
  const t = (key: BuildTextKey, vars?: Record<string, string | number>) => bt(p.lang, key, vars);
  const [list, setList] = useState<BuildList | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [waits, setWaits] = useState<Waits | null>(null);
  const [confirm, setConfirm] = useState<"commit" | "stash" | "ignore" | null>(null);
  const [started, setStarted] = useState<{ req: string; queued: boolean } | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [setUp, setSetUp] = useState(false);

  useEffect(() => {
    let live = true;
    // REQ-000 is listed only once named: Build opened on it (draft-live-polish REQ-101, A10).
    p.rpc.ask("build.get", { named: p.focus }).then(
      (l) => live && (setList(l), setUnreadable(false)),
      () => live && setUnreadable(true),
    );
    return () => {
      live = false;
    };
  }, [p.rpc, p.focus, ...p.stamp]);

  // Opened on a requirement, it is the one chosen (SCN-609).
  useEffect(() => {
    if (p.focus) (setChosen(new Set([p.focus])), setSelected(p.focus));
  }, [p.focus]);

  if (unreadable) return <p class="muted">{t("build.unreadable")}</p>;
  if (!list) return null;

  const answered = (r: BuildStart) => {
    setConfirm(null);
    if (r.ok) {
      setWaits(null);
      setRefused(null);
      setStarted({ req: r.req, queued: r.queued });
    } else if (r.code === "build_waits") {
      setWaits(r);
      setRefused(null);
    } else setRefused(r.message);
  };
  const start = (req: string) => {
    setStarted(null);
    p.announce(t("build.req", { req }));
    p.rpc.ask("build.start", { req }).then(answered, (e: Error) => setRefused(e.message));
  };
  const resolve = (choice: "commit" | "stash" | "ignore", message: string) => {
    if (!waits) return;
    p.announce(t(`build.${choice}`));
    const params =
      choice === "commit" ? { req: waits.req, choice, message } : { req: waits.req, choice };
    p.rpc.ask("build.resolve", params).then(answered, (e: Error) => setRefused(e.message));
  };

  const help = (req: string) =>
    p.onHelp(t("build.req", { req }), [
      { action: "build", feature: t("build.req", { req }), vars: { req } },
    ]);

  const chosenReady = list.ready.filter((r) => chosen.has(r.id));
  const shown =
    list.ready.find((r) => r.id === (selected ?? p.focus)) ??
    list.waiting.find((w) => w.id === (selected ?? p.focus)) ??
    list.ready[0] ??
    list.waiting[0] ??
    null;
  const buildChosen = () => {
    // One after the other: the host queues them in this order (REQ-101).
    for (const r of chosenReady) start(r.id);
    setChosen(new Set());
  };

  return (
    <div class="split build" data-view="build" data-agent={list.agent ?? ""}>
      <aside class="side" aria-label={t("build.side")}>
        <div class="shead">
          <h1 class="shead-h">{t("build.side")}</h1>
          <HelpButton
            label={t("build.help")}
            onOpen={() =>
              p.onHelp(t("build.feature"), [{ action: "build", feature: t("build.feature") }])
            }
          />
        </div>
        <div class="bwho" data-testid="build-agent">
          <div class="k">{t("build.agent")}</div>
          {list.agent ? (
            <div class="field mono" title={list.agentCommand ?? ""}>
              {list.agent}
            </div>
          ) : (
            <div class="noagent">
              <p style="margin:4px 0">{t("build.noAgent")}</p>
              {/* A button that runs it, after a confirmation (draft-live-polish REQ-203, A13). */}
              <div class="actions">
                <button
                  type="button"
                  class="btn pri"
                  data-act="set-up-agent"
                  onClick={() => setSetUp(true)}
                >
                  {t("build.setUp")}
                </button>
                <HelpButton
                  label={`? ${t("build.setUp")}`}
                  onOpen={() =>
                    p.onHelp(t("build.setUp"), [
                      { action: "agents-init", feature: t("build.setUp") },
                    ])
                  }
                />
              </div>
              <p class="muted bset">
                {t("build.setAgent")}{" "}
                <code class="mono" data-testid="set-agent">
                  {list.setAgent}
                </code>
              </p>
            </div>
          )}
        </div>
        <div class="sgroup">{t("build.readyGroup")}</div>
        {list.ready.length === 0 && <p class="muted side-empty">{t("build.noneReady")}</p>}
        <ul class="breqs" data-group="ready">
          {list.ready.map((r) => (
            <ReadyRow
              key={r.id}
              r={r}
              focus={p.focus === r.id}
              current={shown?.id === r.id}
              chosen={chosen.has(r.id)}
              estimate={list.estimate}
              agent={list.agent}
              t={t}
              onSelect={() => setSelected(r.id)}
              onChoose={(on) =>
                setChosen((c) => {
                  const next = new Set(c);
                  if (on) next.add(r.id);
                  else next.delete(r.id);
                  return next;
                })
              }
              onBuild={() => start(r.id)}
              onHelp={() => help(r.id)}
            />
          ))}
        </ul>
        <div class="sgroup">{t("build.waitingGroup")}</div>
        <ul class="breqs" data-group="waiting">
          {list.waiting.map((w) => (
            <WaitingRow
              key={w.id}
              w={w}
              t={t}
              current={shown?.id === w.id}
              onSelect={() => setSelected(w.id)}
            />
          ))}
        </ul>
        <div class="grow" />
        <div class="bfoot">
          <button
            type="button"
            class="btn pri wide"
            data-act="build-chosen"
            disabled={chosenReady.length === 0 || !list.agent}
            onClick={buildChosen}
          >
            {t(chosenReady.length === 1 ? "build.chosenOne" : "build.chosen", {
              n: chosenReady.length,
            })}
          </button>
          {!list.agent && <p class="warn-text">{t("build.noAgent")}</p>}
        </div>
      </aside>

      <div class="detail">
        {started && (
          <div
            class="card bstarted"
            role="status"
            data-req={started.req}
            data-queued={started.queued ? "1" : undefined}
          >
            {t(started.queued ? "build.queued" : "build.started", { req: started.req })}{" "}
            <button type="button" class="btn" onClick={p.onLive}>
              {t("build.openLive")}
            </button>
          </div>
        )}
        {refused && (
          <p class="setup-problem" role="alert">
            {refused}
          </p>
        )}
        {waits && (
          <WaitsPanel
            waits={waits}
            t={t}
            onChoose={setConfirm}
            onHelp={(action, feature) =>
              p.onHelp(feature, [{ action, feature, vars: { req: waits.req } }])
            }
          />
        )}
        {setUp && (
          <div class="scrim" onClick={() => setSetUp(false)}>
            <div
              class="help"
              role="dialog"
              aria-label={t("build.setUp.title")}
              data-confirm="set-up-agent"
              onClick={(e) => e.stopPropagation()}
            >
              <h2>{t("build.setUp.title")}</h2>
              <p class="muted">{t("build.setUp.body")}</p>
              <p>
                <code class="mono">{list.setAgent}</code>
              </p>
              <div class="actions">
                <button
                  type="button"
                  class="btn pri"
                  data-act="confirm"
                  onClick={() => {
                    setSetUp(false);
                    void p.run(t("build.setUp"), { name: "agents-init", tool: "claude" });
                  }}
                >
                  {t("build.setUp.confirm")}
                </button>
                <button type="button" class="btn" data-act="cancel" onClick={() => setSetUp(false)}>
                  {t("build.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
        {waits && confirm && (
          <Confirm
            kind={confirm}
            waits={waits}
            t={t}
            onCancel={() => setConfirm(null)}
            onConfirm={(message) => resolve(confirm, message)}
          />
        )}
        {shown && (
          <section class="card bplan" data-req={shown.id}>
            <div class="detail-head">
              <h2 class="syne">
                {shown.id} · {shown.title}
              </h2>
              <span class="muted">{t("build.planSub")}</span>
            </div>
            {"why" in shown ? (
              <p class="muted">
                {(shown as WaitingItem).why === "question"
                  ? t("build.why.question", { q: (shown as WaitingItem).question ?? "?" })
                  : (shown as WaitingItem).why === "review"
                    ? t("build.why.review", { change: shown.change ?? "" })
                    : t("build.why.scenario")}
              </p>
            ) : (
              <div class="bsteps">
                {(["branch", "agent", "gate", "apply", "commit"] as const).map((k, i) => (
                  <div class="bstep" key={k} data-step={k}>
                    <div class="mono bstep-k">
                      {i + 1} · {t(`build.step.${k}`)}
                    </div>
                    <div>{t(`build.step.${k}.what`, { req: shown.id })}</div>
                  </div>
                ))}
              </div>
            )}
            <div class="muted best-line" data-testid="build-estimate">
              {t("build.estimate")}:{" "}
              {"estimate" in shown && shown.estimate ? (
                // specgate's own estimate for this requirement (REQ-493).
                <span data-own={shown.estimate.basis}>
                  {shown.estimate.minutes !== null
                    ? t("build.estimateEach", { minutes: shown.estimate.minutes })
                    : t("build.noEstimateOwn")}{" "}
                  ·{" "}
                  {t("build.estimateOwn", {
                    basis: shown.estimate.basis,
                    n: shown.estimate.samples,
                  })}
                </span>
              ) : (
                <>
                  <EstimateText estimate={list.estimate} t={t} />
                  {list.estimate && list.estimate.runs > 0 && (
                    <span> · {t("build.estimateFrom", { runs: list.estimate.runs })}</span>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>
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
  current: boolean;
  chosen: boolean;
  estimate: Estimate | null;
  agent: string | null;
  t: T;
  onSelect: () => void;
  onChoose: (on: boolean) => void;
  onBuild: () => void;
  onHelp: () => void;
}) {
  const { r, t } = props;
  // specgate's own estimate for this requirement (REQ-493), else the average of past builds.
  const own = r.estimate;
  const minutes = own ? own.minutes : props.estimate?.minutes;
  return (
    <li
      class="tr breq bready"
      data-req={r.id}
      data-focus={props.focus ? "1" : undefined}
      aria-current={props.current ? "true" : undefined}
      onClick={props.onSelect}
    >
      <input
        type="checkbox"
        aria-label={t("build.choose", { req: r.id })}
        checked={props.chosen}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => props.onChoose((e.target as HTMLInputElement).checked)}
      />
      <span class="rid">
        <span class="sr">REQ-</span>
        {r.id.replace(/^REQ-/, "")}
      </span>
      {/* The title on the row's width, its estimate below it (draft-live-polish REQ-101, A11). */}
      <span class="bmain">
        <span class="name" title={r.title ?? ""}>
          {r.title}
        </span>
        <span
          class="best"
          data-own={own ? own.basis : undefined}
          title={
            own
              ? t("build.estimateOwn", { basis: own.basis, n: own.samples })
              : minutes == null
                ? t("build.noEstimate")
                : undefined
          }
        >
          {minutes != null ? (
            <>
              <span aria-hidden="true">~{minutes} min</span>
              <span class="sr">
                {own ? (
                  t("build.estimateEach", { minutes })
                ) : (
                  <EstimateText estimate={props.estimate} t={t} />
                )}
              </span>
            </>
          ) : (
            t("build.noEstimateOwn")
          )}
        </span>
      </span>
      <span class="bagent mono" data-agent={props.agent ?? ""} hidden>
        {props.agent ?? "—"}
      </span>
      <button
        type="button"
        class="play"
        data-act="build"
        title={t("build.req", { req: r.id })}
        aria-label={t("build.req", { req: r.id })}
        disabled={!props.agent}
        onClick={(e) => (e.stopPropagation(), props.onBuild())}
      >
        ▶
      </button>
      <HelpButton label={`? ${t("build.req", { req: r.id })}`} onOpen={props.onHelp} />
    </li>
  );
}

function WaitingRow(props: { w: WaitingItem; t: T; current: boolean; onSelect: () => void }) {
  const { w, t } = props;
  const why =
    w.why === "question"
      ? t("build.why.question", { q: w.question ?? "?" })
      : w.why === "review"
        ? t("build.why.review", { change: w.change ?? "" })
        : t("build.why.scenario");
  return (
    <li
      class="tr breq bready"
      data-req={w.id}
      data-why={w.why}
      data-question={w.question ?? undefined}
      aria-current={props.current ? "true" : undefined}
      title={why}
      onClick={props.onSelect}
    >
      <span class="dot waiting" />
      <span class="rid">
        <span class="sr">REQ-</span>
        {w.id.replace(/^REQ-/, "")}
      </span>
      <span class="bmain">
        <span class="name" title={w.title ?? ""}>
          {w.title}
        </span>
        <span class="best">
          {w.why === "question" ? (w.question ?? "?") : t(`build.short.${w.why}`)}
        </span>
      </span>
      <span class="sr">{why}</span>
    </li>
  );
}

/** The files Build shows before anything runs: by folder, the largest first, each opened to its files. */
function Groups(props: { files: Uncommitted; t: T }) {
  return (
    <ul class="bgroups">
      {props.files.groups.map((g) => (
        <li key={g.group} data-group={g.group} data-files={g.files.length}>
          <details>
            <summary class="mono">
              {props.t("build.waits.group", { group: g.group, n: g.files.length })}
            </summary>
            <ul class="mono muted">
              {g.files.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}

/** Why Build waits, and commit, stash or ignore — each with its "?" (REQ-102). */
function WaitsPanel(props: {
  waits: Waits;
  t: T;
  onChoose: (kind: "commit" | "stash" | "ignore") => void;
  onHelp: (action: "build-commit" | "build-stash" | "build-ignore", feature: string) => void;
}) {
  const { waits, t } = props;
  return (
    <section class="card bwaits" data-testid="build-waits" data-req={waits.req}>
      <h2 style="margin:0 0 6px;font-size:15px">
        {t("build.waits.title", { n: waits.waits.total })}
      </h2>
      <p class="muted" style="margin:0 0 8px">
        {t("build.waits.why")}
      </p>
      <Groups files={waits.waits} t={t} />
      <div class="actions">
        <button
          type="button"
          class="btn pri"
          data-act="commit"
          onClick={() => props.onChoose("commit")}
        >
          {t("build.commit")}
        </button>
        <HelpButton
          label={`? ${t("build.commit")}`}
          onOpen={() => props.onHelp("build-commit", t("build.commit"))}
        />
        <button type="button" class="btn" data-act="stash" onClick={() => props.onChoose("stash")}>
          {t("build.stash")}
        </button>
        <HelpButton
          label={`? ${t("build.stash")}`}
          onOpen={() => props.onHelp("build-stash", t("build.stash"))}
        />
        <button
          type="button"
          class="btn"
          data-act="ignore"
          title={t("build.ignore.title")}
          onClick={() => props.onChoose("ignore")}
        >
          {t("build.ignore")}
        </button>
        <HelpButton
          label={`? ${t("build.ignore")}`}
          onOpen={() => props.onHelp("build-ignore", t("build.ignore"))}
        />
      </div>
    </section>
  );
}

/** The confirmation before a commit, a stash or a build that ignores them runs: the files, by folder. */
function Confirm(props: {
  kind: "commit" | "stash" | "ignore";
  waits: Waits;
  t: T;
  onCancel: () => void;
  onConfirm: (message: string) => void;
}) {
  const { kind, waits, t } = props;
  const [message, setMessage] = useState("");
  const empty = kind === "commit" && !message.trim();
  const field = useRef<HTMLTextAreaElement>(null);
  // The message is what is asked: the cursor is in it (A12).
  useEffect(() => field.current?.focus(), []);
  const title = t(`build.confirm.${kind}`, { n: waits.waits.total });
  return (
    <div class="scrim" onClick={props.onCancel}>
      <div
        class="help"
        role="dialog"
        aria-label={title}
        data-confirm={kind}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <p class="muted">{t(`build.confirm.${kind}Body`, { req: waits.req })}</p>
        {/* The message first, labelled, in view (draft-live-polish REQ-102, A12); the files below it scroll. */}
        {kind === "commit" && (
          <div class="bmessage">
            <label for="build-commit-message">{t("build.message")}</label>
            <textarea
              id="build-commit-message"
              class="ask"
              rows={2}
              value={message}
              ref={field}
              onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
            />
          </div>
        )}
        <div class="bconfirm-files">
          <Groups files={waits.waits} t={t} />
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn pri"
            data-act="confirm"
            disabled={empty}
            aria-describedby={empty ? "build-confirm-why" : undefined}
            onClick={() => props.onConfirm(message.trim())}
          >
            {t("build.confirm")}
          </button>
          {empty && (
            <span class="muted bwhy" id="build-confirm-why" data-testid="confirm-why">
              {t("build.needMessage")}
            </span>
          )}
          <button type="button" class="btn" data-act="cancel" onClick={props.onCancel}>
            {t("build.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

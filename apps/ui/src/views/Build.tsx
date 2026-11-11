import { useEffect, useState } from "preact/hooks";
import type {
  BuildItem,
  BuildList,
  BuildStart,
  Estimate,
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
  const [confirm, setConfirm] = useState<"commit" | "stash" | null>(null);
  const [started, setStarted] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

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

  const answered = (r: BuildStart) => {
    setConfirm(null);
    if (r.ok) {
      setWaits(null);
      setRefused(null);
      setStarted(r.req);
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
  const resolve = (choice: "commit" | "stash", message: string) => {
    if (!waits) return;
    p.announce(t(choice === "commit" ? "build.commit" : "build.stash"));
    const params =
      choice === "commit"
        ? { req: waits.req, choice, message }
        : { req: waits.req, choice: "stash" as const };
    p.rpc.ask("build.resolve", params).then(answered, (e: Error) => setRefused(e.message));
  };

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

      {started && (
        <div class="card bstarted" role="status" data-req={started}>
          {t("build.started", { req: started })}{" "}
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
      {waits && confirm && (
        <Confirm
          kind={confirm}
          waits={waits}
          t={t}
          onCancel={() => setConfirm(null)}
          onConfirm={(message) => resolve(confirm, message)}
        />
      )}

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
            onBuild={() => start(r.id)}
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
  onBuild: () => void;
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
        <button
          type="button"
          class="btn pri"
          data-act="build"
          disabled={!props.agent}
          onClick={props.onBuild}
        >
          {t("build.button")}
        </button>
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
  onChoose: (kind: "commit" | "stash") => void;
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
          disabled
          title={t("build.ignore.unsupported")}
        >
          {t("build.ignore")}
        </button>
        <HelpButton
          label={`? ${t("build.ignore")}`}
          onOpen={() => props.onHelp("build-ignore", t("build.ignore"))}
        />
      </div>
      <p class="muted" data-testid="ignore-unsupported" style="margin:6px 0 0;font-size:12px">
        {t("build.ignore")}: {t("build.ignore.unsupported")}
      </p>
    </section>
  );
}

/** The confirmation before a commit or a stash runs: the files it touches, by folder. */
function Confirm(props: {
  kind: "commit" | "stash";
  waits: Waits;
  t: T;
  onCancel: () => void;
  onConfirm: (message: string) => void;
}) {
  const { kind, waits, t } = props;
  const [message, setMessage] = useState("");
  const title = t(kind === "commit" ? "build.confirm.commit" : "build.confirm.stash", {
    n: waits.waits.total,
  });
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
        <p class="muted">
          {t(kind === "commit" ? "build.confirm.commitBody" : "build.confirm.stashBody", {
            req: waits.req,
          })}
        </p>
        <Groups files={waits.waits} t={t} />
        {kind === "commit" && (
          <textarea
            class="ask"
            aria-label={t("build.message")}
            placeholder={t("build.message")}
            value={message}
            onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
          />
        )}
        <div class="actions">
          <button
            type="button"
            class="btn pri"
            data-act="confirm"
            disabled={kind === "commit" && !message.trim()}
            onClick={() => props.onConfirm(message.trim())}
          >
            {t("build.confirm")}
          </button>
          <button type="button" class="btn" data-act="cancel" onClick={props.onCancel}>
            {t("build.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import type { ActionId, HomeView, NextStep } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { modulesOf, type StatusRequirement } from "../tree.js";
import type { ViewId } from "../views.js";

export interface HomeProps {
  rpc: Rpc;
  tr: (k: string, v?: Record<string, string | number>) => string;
  project: string;
  branch: string | null;
  requirements: readonly StatusRequirement[];
  total: number;
  done: number;
  report: unknown;
  /** Bumped when a section Home reads changed: read again. */
  stamp: unknown;
  unapproved: ReadonlySet<string>;
  /** Told the drafts to review that `home.get` read. */
  onReview?: (ids: readonly string[]) => void;
  questionsByChange: ReadonlyMap<string, number>;
  /** Read once by the parent: `specgate status`'s next command, shown under the sentence. */
  next: string | null;
  show: (v: ViewId) => void;
  onCheck: () => void;
  /** The gate is running: Check reads "Checking…" and cannot be pressed twice (REQ-178, A19). */
  checking?: boolean;
  onDoctor: () => void;
  onFromTicket: () => void;
  onOpenTerminal: () => void;
  onHelp: (r: HelpRequest) => void;
}

/** Which "?" explains the next step's button. */
const STEP_ACTION: Record<NextStep["kind"], ActionId> = {
  answer: "answer",
  review: "ask-change",
  apply: "apply",
  build: "build",
  archive: "archive",
  command: "check",
  done: "check",
};

/** Where the next step's button leads. */
const STEP_VIEW: Record<NextStep["kind"], ViewId> = {
  answer: "questions",
  review: "changes",
  apply: "changes",
  build: "build",
  archive: "changes",
  command: "home",
  done: "report",
};

/**
 * Home as `IDE-Inicio.dc.html` draws it (draft-design-conformance REQ-173):
 * the next step as a sentence with its reason, its button and its "?"; four
 * counters; the route, the modules and the activity; and the common actions.
 */
export function Home(p: HomeProps) {
  const { tr } = p;
  const [view, setView] = useState<HomeView | null>(null);
  useEffect(() => {
    let live = true;
    p.rpc.ask("home.get", {}).then(
      (v) => {
        if (!live) return;
        setView(v);
        p.onReview?.(v.review);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [p.rpc, p.stamp]);

  const next = view?.next ?? null;
  const modules = modulesOf(p.requirements, p.report, { unapproved: p.unapproved });
  const inDraft = p.requirements.filter((r) => r.change && p.unapproved.has(r.change)).length;
  const tested = new Set(
    (
      ((p.report as { requirements?: unknown[] } | null)?.requirements ?? []) as Array<{
        requirement?: unknown;
        testExists?: unknown;
      }>
    )
      .filter((r) => r.testExists === true)
      .map((r) => r.requirement),
  );
  const proven = p.requirements.filter((r) => r.category === "DONE" && tested.has(r.id)).length;

  return (
    <div class="home">
      <div class="home-title">
        <h1>{p.project || tr("view.home")}</h1>
        <span class="muted">
          {[p.branch ? `⎇ ${p.branch}` : null, tr("home.modulesCount", { n: modules.length })]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      {next && (
        <section class="next" aria-label={tr("home.next")} data-kind={next.kind}>
          <div class="next-text">
            <div class="k">[ {tr("home.next").toUpperCase()} ]</div>
            <div class="next-title syne" data-testid="next-title">
              {sentence(tr, next)}
            </div>
            <div class="next-why" data-testid="next-why">
              {reason(tr, next)}
            </div>
            {p.next && <div class="mono next-cmd">{p.next}</div>}
          </div>
          {next.kind !== "command" && (
            <button
              type="button"
              class="btn pri"
              data-testid="next-go"
              onClick={() => p.show(STEP_VIEW[next.kind])}
            >
              {tr(`next.${next.kind}.go`)}
            </button>
          )}
          <HelpButton
            label={tr("home.nextHelp")}
            onOpen={() =>
              p.onHelp({
                action: STEP_ACTION[next.kind],
                feature: tr(`next.${next.kind}.go`),
                vars: vars(next),
              })
            }
          />
        </section>
      )}

      <div class="cards four">
        <div class="card">
          <div class="k">{tr("home.requirements")}</div>
          <div class="v">{p.total}</div>
          <div class="sub">{tr("home.inDraft", { n: inDraft })}</div>
        </div>
        <div class="card">
          <div class="k">{tr("home.built")}</div>
          <div class="v">{p.done}</div>
          <div class="sub">{tr("home.toDo", { n: p.total - p.done })}</div>
        </div>
        <div class="card">
          <div class="k">{tr("home.proven")}</div>
          <div class="v">{proven}</div>
          <div class="sub">{tr("home.ofBuilt", { n: p.done })}</div>
        </div>
        <div class="card">
          <div class="k">{tr("home.cost")}</div>
          <div class="v">{view?.cost ? `$${view.cost.total.toFixed(2)}` : "—"}</div>
          <div class="sub">
            {view?.cost
              ? tr("home.costSub", { minutes: view.cost.minutes, runs: view.cost.runs })
              : tr("home.noCost")}
          </div>
        </div>
      </div>

      <div class="home-row">
        <section class="card route" aria-label={tr("route.title")}>
          <h2>{tr("route.title")}</h2>
          {(view?.route ?? []).map((r, i) => (
            <div class="step" key={r.step} data-step={r.step} data-state={r.state}>
              <span class="num">{r.state === "done" ? "✓" : i + 1}</span>
              <span>
                {tr(`route.${r.step}`)}
                {r.step === "brief" && r.count
                  ? ` · ${tr("home.modulesCount", { n: r.count })}`
                  : ""}
              </span>
              {r.step === "answered" && r.count ? (
                <span class="right">{tr("route.open", { n: r.count })}</span>
              ) : null}
            </div>
          ))}
        </section>
        <section class="card modules-card" aria-label={tr("home.modules")}>
          <h2>{tr("home.modules")}</h2>
          {modules.length === 0 && <p class="muted">{tr("home.noModules")}</p>}
          {modules.map((m) => {
            const total = m.requirements.length;
            const draftOf = [...p.unapproved].find((c) => c.replace(/^draft-/, "") === m.name);
            const asks = draftOf ? (p.questionsByChange.get(draftOf) ?? 0) : 0;
            const pct = total ? Math.round((m.built / total) * 100) : 0;
            const tone = draftOf ? "draft" : pct === 100 ? "done" : "doing";
            return (
              <div class="module" key={m.name} data-module={m.name}>
                <div class="module-head">
                  <span>{m.name}</span>
                  <span class={`muted ${draftOf ? "warn" : ""}`}>
                    {draftOf
                      ? tr("home.moduleDraft", { n: asks })
                      : tr("home.moduleOf", { built: m.built, total })}
                  </span>
                </div>
                <div class="bar">
                  <div
                    class={`fill ${tone}`}
                    style={{ width: `${Math.max(pct, draftOf ? 6 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
        <section class="card home-activity" aria-label={tr("home.activity")}>
          <h2>{tr("home.activity")}</h2>
          {(view?.activity ?? []).length === 0 && <p class="muted">{tr("home.noActivity")}</p>}
          {(view?.activity ?? []).map((a, i) => (
            <div class="act" key={i} data-kind={a.kind}>
              <span class={`mono kind ${a.kind}`}>{a.kind}</span>
              <span>{a.text}</span>
            </div>
          ))}
        </section>
      </div>

      <div class="actions" aria-label={tr("home.actions")}>
        <button
          type="button"
          class={`btn ${p.checking ? "busy" : ""}`}
          data-act="check"
          disabled={p.checking}
          aria-busy={p.checking ? "true" : undefined}
          onClick={p.onCheck}
        >
          {p.checking ? tr("pill.running") : tr("home.check")}
        </button>
        <HelpButton
          label={tr("help.button", { feature: tr("home.check") })}
          onOpen={() =>
            p.onHelp({
              action: "check",
              feature: tr("home.check"),
              vars: (() => {
                const req = /\bREQ-\d+\b/.exec(p.next ?? "")?.[0];
                return req ? { req } : {};
              })(),
            })
          }
        />
        <button type="button" class="btn" data-act="doctor" onClick={p.onDoctor}>
          {tr("home.doctor")}
        </button>
        <HelpButton
          label={tr("help.button", { feature: tr("home.doctor") })}
          onOpen={() => p.onHelp({ action: "doctor", feature: tr("home.doctor") })}
        />
        <button type="button" class="btn" data-act="new-change" onClick={() => p.show("changes")}>
          {tr("home.newChange")}
        </button>
        <button type="button" class="btn" data-act="from-ticket" onClick={p.onFromTicket}>
          {tr("home.fromTicket")}
        </button>
        <button type="button" class="btn" data-act="terminal" onClick={p.onOpenTerminal}>
          {tr("home.openTerminal")}
        </button>
      </div>
    </div>
  );
}

function vars(n: NextStep): Record<string, string> {
  switch (n.kind) {
    case "answer":
      return { change: n.change, module: n.module, ...(n.reqs[0] ? { req: n.reqs[0] } : {}) };
    case "review":
      return { change: n.change, module: n.module };
    case "apply":
    case "build":
      return { req: n.req };
    case "archive":
      return { change: n.change };
    default:
      return {};
  }
}

/** The next step as a sentence (A8). */
export function sentence(tr: HomeProps["tr"], n: NextStep): string {
  switch (n.kind) {
    case "answer":
      return tr(n.count === 1 ? "next.answer.one" : "next.answer.title", {
        count: n.count,
        module: n.module,
      });
    case "review":
      return tr("next.review.title", { module: n.module });
    case "apply":
    case "build":
      return tr(`next.${n.kind}.title`, { req: n.req });
    case "archive":
      return tr("next.archive.title", { change: n.change });
    case "command":
      return tr("next.command.title", { command: n.command });
    default:
      return tr("next.done.title");
  }
}

/** Why it is next (A8). */
export function reason(tr: HomeProps["tr"], n: NextStep): string {
  const list = (reqs: string[]) =>
    reqs.length <= 1
      ? (reqs[0] ?? "")
      : `${reqs.slice(0, -1).join(", ")} ${tr("and")} ${reqs.at(-1)}`;
  switch (n.kind) {
    case "answer":
      return tr(n.reqs.length === 1 ? "next.answer.whyOne" : "next.answer.why", {
        reqs: list(n.reqs),
      });
    default:
      return tr(`next.${n.kind}.why`);
  }
}

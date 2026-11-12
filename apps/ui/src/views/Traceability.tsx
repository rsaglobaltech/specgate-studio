import { useEffect, useMemo, useState } from "preact/hooks";
import type {
  Lang,
  Notice,
  TestProposal,
  TraceAgentResult,
  TraceFilter,
  TraceRow,
  TraceView,
} from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { VirtualList } from "../VirtualList.js";
import { tokensShown } from "../agentText.js";
import { costShown, tt, type TraceKey } from "./traceText.js";

const FILTERS: readonly TraceFilter[] = ["all", "gaps", "noTest", "waiting"];
const ROW_H = 36;

const base = (p: string) => p.split("/").pop() ?? p;
const shownFeature = (p: string) => p.replace(/^features\//, "");

/**
 * Traceability (draft-traceability REQ-121, REQ-122): one row per scenario —
 * its requirement, feature, tests, code and status — read by the host from
 * specgate's per-scenario matrix; a row that lacks a link is marked as a gap
 * and says what it lacks; the filters keep the gaps, the rows without a test
 * and those waiting for an answer, each with its count. "Fix" on a row
 * without a test asks the host for the missing test (REQ-123).
 */
export function Traceability(p: {
  rpc: Rpc;
  lang: Lang;
  /** What the view is read from: read again when one changes. */
  stamp: unknown[];
  /** The requirement Trace was pressed on in the editor (REQ-042): its rows first. */
  initial: string;
  onFix: (row: TraceRow) => void;
  onHelp: (feature: string, requests: HelpRequest[]) => void;
}) {
  const t = (k: TraceKey, v?: Record<string, string | number>) => tt(p.lang, k, v);
  const [view, setView] = useState<TraceView | null>(null);
  const [filter, setFilter] = useState<TraceFilter>("all");
  const [text, setText] = useState(p.initial);
  useEffect(() => setText(p.initial), [p.initial]);
  useEffect(() => {
    let live = true;
    void p.rpc.ask("trace.get", {}).then(
      (v) => live && setView(v),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [p.rpc, ...p.stamp]);
  const rows = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (view?.rows ?? []).filter(
      (r) =>
        r.in.includes(filter) &&
        (!q ||
          [r.requirement, r.scenario, r.title, r.feature, r.capability, ...r.tests, ...r.code].some(
            (v) => (v ?? "").toLowerCase().includes(q),
          )),
    );
  }, [view, filter, text]);
  const lacks = (r: TraceRow) =>
    t("trace.lacks", {
      what: r.gaps.map((g) => t(`trace.lack.${g}` as TraceKey)).join(t("trace.and")),
    });
  return (
    <div class="trace" data-view="traceability">
      <div class="trace-head">
        <h1>{t("trace.title")}</h1>
        <span class="muted trace-sub">{t("trace.sub")}</span>
        <HelpButton
          label={t("trace.help")}
          onOpen={() =>
            p.onHelp(t("trace.title"), [{ action: "traceability", feature: t("trace.title") }])
          }
        />
      </div>
      {view && !view.available ? (
        <p class="card trace-unavailable" data-testid="trace-unavailable">
          {t("trace.unavailable")}
        </p>
      ) : (
        <>
          <div class="trace-bar">
            <label class="sr" for="trace-filter">
              {t("trace.filterLabel")}
            </label>
            <input
              id="trace-filter"
              class="trace-filter"
              type="text"
              placeholder={t("trace.filter")}
              value={text}
              onInput={(e) => setText((e.target as HTMLInputElement).value)}
            />
            <div class="trace-chips" role="group" aria-label={t("trace.filters")}>
              {FILTERS.map((f) => (
                <button
                  type="button"
                  key={f}
                  class="chip"
                  data-filter={f}
                  data-count={view?.counts[f] ?? 0}
                  aria-pressed={filter === f}
                  title={t(view?.counts[f] === 1 ? "trace.keepsOne" : "trace.keeps", {
                    n: view?.counts[f] ?? 0,
                  })}
                  onClick={() => setFilter(f)}
                >
                  {t(`trace.f.${f}` as TraceKey, { n: view?.counts[f] ?? 0 })}
                </button>
              ))}
            </div>
          </div>
          {view && (
            <div class="trace-cards">
              <div class="tcard" data-testid="trace-with-test">
                <div class="k">{t("trace.withTest")}</div>
                <div class="v">
                  {view.withTest} <span class="muted">{t("trace.of", { n: view.scenarios })}</span>
                </div>
              </div>
              <div class="tcard bad" data-testid="trace-gaps">
                <div class="k">{t("trace.gaps")}</div>
                <div class="v">{view.counts.gaps}</div>
              </div>
            </div>
          )}
          <div
            class="trace-table"
            role="table"
            aria-label={t("trace.title")}
            aria-rowcount={rows.length}
            data-filter={text}
          >
            <div class="trow thead" role="row">
              {(["req", "scn", "feature", "test", "code", "status"] as const).map((c) => (
                <span role="columnheader" key={c}>
                  {t(`trace.c.${c}` as TraceKey)}
                </span>
              ))}
              <span role="columnheader" />
            </div>
            <div class="trace-rows" data-testid="traceability-list">
              {rows.length === 0 && view ? (
                <p class="muted trace-empty">{t("trace.empty")}</p>
              ) : (
                <VirtualList
                  count={rows.length}
                  rowHeight={ROW_H}
                  row={(i) => {
                    const r = rows[i]!;
                    const gap = r.gaps.length > 0;
                    return (
                      <div
                        class="trow"
                        role="row"
                        data-req={r.requirement}
                        data-scenario={r.scenario ?? ""}
                        data-gap={gap ? r.gaps.join(" ") : undefined}
                        data-waiting={r.waiting ? (r.waiting.question ?? "") : undefined}
                      >
                        <span
                          role="cell"
                          class="tc-req"
                          title={`${r.requirement} ${r.title ?? ""}`}
                        >
                          <span class="mono treq">{r.requirement}</span> {r.title}
                        </span>
                        <span role="cell" class="mono tc-scn">
                          {r.scenario ?? t("trace.noScenario")}
                        </span>
                        <span
                          role="cell"
                          class={`mono tc-feature ${r.feature ? "muted" : "gap"}`}
                          title={r.feature ?? ""}
                        >
                          {r.feature ? shownFeature(r.feature) : t("trace.noFeature")}
                        </span>
                        <span
                          role="cell"
                          class={`mono tc-test ${r.tests.length ? "ok" : "gap"}`}
                          title={r.tests.join("\n")}
                        >
                          {r.tests.length ? r.tests.map(base).join(", ") : t("trace.noTest")}
                        </span>
                        <span
                          role="cell"
                          class={`mono tc-code ${r.code.length ? "muted" : r.gaps.includes("code") ? "gap" : "muted"}`}
                          title={r.code.join("\n")}
                        >
                          {r.code.length ? r.code.map(base).join(", ") : t("trace.none")}
                        </span>
                        <span role="cell" class="tc-status">
                          <span
                            class="tpill"
                            data-status={r.status}
                            title={`${r.status}${r.waiting?.question ? ` · ${r.waiting.question}` : ""}`}
                          >
                            {r.status}
                            {r.waiting?.question ? ` · ${r.waiting.question}` : ""}
                          </span>
                          {gap && (
                            <span class="tpill gap" data-testid="trace-lacks" title={lacks(r)}>
                              {lacks(r)}
                            </span>
                          )}
                          {r.waiting && (
                            <span class="sr" data-testid="trace-waits">
                              {r.waiting.question
                                ? t("trace.waits", { q: r.waiting.question })
                                : t("trace.waitsNone")}
                            </span>
                          )}
                        </span>
                        <span role="cell" class="tc-act">
                          {r.gaps.includes("test") && r.feature && r.scenario && (
                            <button
                              type="button"
                              class="tfix"
                              data-act="fix"
                              aria-label={t("trace.fixOn", { scenario: r.scenario })}
                              onClick={() => p.onFix(r)}
                            >
                              {t("trace.fix")}
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </div>
          <p class="muted trace-foot">
            {t("trace.foot")
              .split("`")
              .map((part, i) => (i % 2 ? <span class="mono">{part}</span> : part))}
          </p>
        </>
      )}
    </div>
  );
}

/** Where "Fix" stands: the skeleton, the agent asked, or its answer. */
export type ProposalState =
  | { step: "skeleton"; proposal: TestProposal }
  | { step: "asking"; proposal: TestProposal }
  | { step: "agent"; proposal: TestProposal; answer: Extract<TraceAgentResult, { ok: true }> };

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

/**
 * The proposed test, in the bottom panel's Traceability tab beside the
 * scenario open in the editor (REQ-123): the file it would write and its
 * skeleton — no agent, no cost — with "Write the test", "Ask the agent" and
 * "Cancel"; the agent's test as a diff against the skeleton with its tokens
 * and cost. Nothing is written until the Developer confirms.
 */
export function TraceProposal(p: {
  rpc: Rpc;
  lang: Lang;
  state: ProposalState | null;
  /** The project's agent as its program, or null when none is set. */
  agent: string | null;
  onState: (s: ProposalState | null) => void;
  onNotice: (n: Record<Lang, Notice>) => void;
  onHelp: (feature: string, requests: HelpRequest[]) => void;
}) {
  const t = (k: TraceKey, v?: Record<string, string | number>) => tt(p.lang, k, v);
  const [busy, setBusy] = useState(false);
  const s = p.state;
  if (!s) return <p class="muted proposal-none">{t("proposal.none")}</p>;
  const pr = s.proposal;
  const ids = { requirement: pr.requirement, scenario: pr.scenario };
  const vars = { req: pr.requirement, scenario: pr.scenario, path: pr.path };
  const help = (
    <>
      <HelpButton
        label={t("proposal.fixHelp")}
        onOpen={() =>
          p.onHelp(t("trace.fix"), [{ action: "trace-fix", feature: t("trace.fix"), vars }])
        }
      />
    </>
  );
  const end = (r: { notice: Record<Lang, Notice> }) => {
    p.onNotice(r.notice);
    p.onState(null);
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };
  const confirm = () => run(async () => end(await p.rpc.ask("trace.confirm", ids)));
  const cancel = (plan?: number) =>
    run(async () =>
      end(await p.rpc.ask("trace.cancel", plan === undefined ? ids : { ...ids, plan })),
    );
  const ask = () =>
    run(async () => {
      p.onState({ step: "asking", proposal: pr });
      const answer = await p.rpc
        .ask("trace.ask", ids)
        .catch((e: Error): TraceAgentResult => ({ ok: false, code: "failed", message: e.message }));
      if (answer.ok) p.onState({ step: "agent", proposal: pr, answer });
      else {
        p.onState({ step: "skeleton", proposal: pr });
        p.onNotice({
          en: {
            tone: "refused",
            ran: answer.message,
            wrote: "Nothing was written.",
            next: tt("en", "proposal.write"),
          },
          es: {
            tone: "refused",
            ran: answer.message,
            wrote: "No se escribió nada.",
            next: tt("es", "proposal.write"),
          },
        });
      }
    });
  const askButton = (
    <>
      <button
        type="button"
        class="btn"
        data-act="ask-agent"
        disabled={busy || !p.agent || s.step === "asking"}
        title={p.agent ? t("proposal.agentIs", { agent: p.agent }) : t("proposal.noAgent")}
        onClick={() => void ask()}
      >
        {t("proposal.ask")}
      </button>
      <HelpButton
        label={t("proposal.askHelp")}
        onOpen={() =>
          p.onHelp(t("proposal.ask"), [
            { action: "trace-ask-agent", feature: t("proposal.ask"), vars },
          ])
        }
      />
    </>
  );
  if (s.step === "agent") {
    const a = s.answer;
    const usage =
      a.tokens === null
        ? t("proposal.noUsage")
        : a.cost === null
          ? t("proposal.usageNoCost", { tokens: tokensShown(a.tokens, p.lang) })
          : t("proposal.usage", {
              tokens: tokensShown(a.tokens, p.lang),
              cost: costShown(a.cost, p.lang),
            });
    const refused = a.findings.filter((f) => f.severity !== "info");
    return (
      <div class="proposal" data-step="agent" data-path={pr.path}>
        <div class="proposal-head">
          <span class="eyebrow mono">[ {t("proposal.agentEyebrow")} ]</span>
          <span class="mono proposal-path">{pr.path}</span>
          <span class="muted" data-testid="proposal-usage">
            {usage}
          </span>
          <span class="proposal-acts">
            {a.diff !== null && (
              <button
                type="button"
                class="btn pri"
                data-act="confirm-agent"
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    end(
                      await p.rpc.ask("trace.agentConfirm", {
                        ...ids,
                        plan: a.entry.n,
                        path: pr.path,
                      }),
                    ),
                  )
                }
              >
                {t("proposal.writeAgent")}
              </button>
            )}
            <button
              type="button"
              class="btn"
              data-act="back"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (a.entry.plan?.id) await p.rpc.ask("agent.discard", { n: a.entry.n });
                  p.onState({ step: "skeleton", proposal: pr });
                })
              }
            >
              {t("proposal.back")}
            </button>
            <button
              type="button"
              class="btn"
              data-act="cancel"
              disabled={busy}
              onClick={() => void cancel(a.entry.n)}
            >
              {t("proposal.cancel")}
            </button>
            <HelpButton
              label={t("proposal.askHelp")}
              onOpen={() =>
                p.onHelp(t("proposal.ask"), [
                  { action: "trace-ask-agent", feature: t("proposal.ask"), vars },
                ])
              }
            />
          </span>
        </div>
        {a.diff === null ? (
          <div class="proposal-left" data-testid="proposal-left">
            <p>{t("proposal.left")}</p>
            {refused.map((f, i) => (
              <p key={i} class="mono small">
                {f.code}: {f.message}
              </p>
            ))}
            <p class="muted">{t("proposal.keep")}</p>
          </div>
        ) : (
          <pre class="diff" data-testid="proposal-diff" aria-label={t("proposal.diff")}>
            {a.diff
              .replace(/\n$/, "")
              .split("\n")
              .map((l, i) => (
                <div key={i} class={lineClass(l)}>
                  {l || " "}
                </div>
              ))}
          </pre>
        )}
      </div>
    );
  }
  return (
    <div class="proposal" data-step={s.step} data-path={pr.path}>
      <div class="proposal-head">
        <span class="eyebrow mono">[ {t("proposal.eyebrow")} ]</span>
        <span class="mono proposal-path">{pr.path}</span>
        <span class="muted">
          {t("proposal.from", { scenario: pr.scenario, feature: pr.feature })}
        </span>
        <span class="proposal-acts">
          <button
            type="button"
            class="btn pri"
            data-act="confirm"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {t("proposal.write")}
          </button>
          {askButton}
          <button
            type="button"
            class="btn"
            data-act="cancel"
            disabled={busy}
            onClick={() => void cancel()}
          >
            {t("proposal.cancel")}
          </button>
          {help}
        </span>
      </div>
      {s.step === "asking" && (
        <p class="muted" data-testid="proposal-asking">
          {t("proposal.asking")}
        </p>
      )}
      {!p.agent && (
        <p class="muted small" data-testid="proposal-no-agent">
          {t("proposal.noAgent")}
        </p>
      )}
      <pre class="skeleton" data-testid="proposal-skeleton">
        {pr.text}
      </pre>
    </div>
  );
}

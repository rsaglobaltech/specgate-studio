import { useState } from "preact/hooks";
import type { Question, QuestionsSection } from "@specgate-studio/protocol";
import { HelpButton, type HelpRequest } from "../Help.js";

/**
 * Questions (draft-questions): every open question of the project, where it
 * was asked and what it blocks, as `specgate questions --json` says (REQ-091);
 * an answer written through `specgate answer`, its requirements still blocked
 * (REQ-092); "The spec says it" confirming it with `--reviewed` (REQ-093).
 * The studio writes no file here: specgate does.
 */
export interface QuestionsProps {
  section: QuestionsSection | undefined;
  /** The requirements waiting for an answer, as `specgate status` says (WAITING_FOR_ANSWER). */
  waiting: ReadonlySet<string>;
  tr: (k: string, v?: Record<string, string | number>) => string;
  onAnswer: (q: Question, answer: string) => void;
  onReviewed: (q: Question) => void;
  onHelp: (r: HelpRequest) => void;
}

/** What the view shows: the open questions, then those answered and waiting to be confirmed. */
export function questionsOf(section: QuestionsSection | undefined): {
  open: Question[];
  answered: Question[];
} {
  return {
    open: section?.questions?.open ?? [],
    answered: section?.questions?.answered ?? [],
  };
}

export default function Questions(p: QuestionsProps) {
  const { open, answered } = questionsOf(p.section);
  const [selected, setSelected] = useState<string | null>(null);
  const key = (q: Question) => `${q.change}/${q.id}`;
  // The agent's questions apart, as the board groups them (REQ-175, A11).
  const fromAgent = open.filter((q) => q.asked === "build");
  const asked = open.filter((q) => q.asked !== "build");
  const shown = open.find((q) => key(q) === selected) ?? asked[0] ?? fromAgent[0] ?? null;
  const row = (q: Question, tone: string) => (
    <button
      type="button"
      class="tr qrow"
      key={key(q)}
      data-question={q.id}
      data-change={q.change}
      aria-current={shown && key(shown) === key(q) ? "true" : undefined}
      onClick={() => setSelected(key(q))}
    >
      <span class={`dot ${tone}`} />
      <span class="qid mono">{q.id}</span>
      <span class="name">{q.text}</span>
      <span class="right">{p.tr(`questions.where.${q.asked ?? "draft"}`)}</span>
    </button>
  );
  return (
    <div class="split" data-view="questions">
      <aside class="side" aria-label={p.tr("view.questions")}>
        <div class="shead">
          <h1 class="shead-h">{p.tr("view.questions")}</h1>
          <HelpButton
            label={p.tr("help.button", { feature: p.tr("question.answer") })}
            onOpen={() => p.onHelp({ action: "answer", feature: p.tr("question.answer") })}
          />
        </div>
        <div class="sgroup" data-group="open">
          {p.tr("questions.groupOpen", { n: asked.length })}
        </div>
        {asked.map((q) => row(q, "waiting"))}
        <div class="sgroup" data-group="confirm">
          {p.tr("questions.groupConfirm", { n: answered.length })}
        </div>
        {answered.map((q) => (
          <div class="tr qrow done" key={key(q)} data-question={q.id} data-state="answered">
            <span class="dot blue" />
            <span class="qid mono">{q.id}</span>
            <span class="name">
              {q.text} → {q.answer ?? ""}
            </span>
          </div>
        ))}
        <div class="sgroup" data-group="agent">
          {p.tr("questions.groupAgent", { n: fromAgent.length })}
        </div>
        {fromAgent.map((q) => row(q, "building"))}
      </aside>
      <div class="detail qdetail">
        {open.length === 0 && answered.length === 0 && (
          <p class="muted">{p.tr("questions.none")}</p>
        )}
        {shown && <OpenCard key={key(shown)} q={shown} {...p} />}
        {answered.length > 0 && (
          <section class="card qconfirm">
            <h3 class="qhead">{p.tr("questions.answered", { n: answered.length })}</h3>
            {answered.map((q) => (
              <AnsweredCard key={key(q)} q={q} {...p} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/** Where it was asked: the brief, a draft (its change), or the agent while it builds (A3). */
function Where(props: { q: Question; tr: QuestionsProps["tr"] }) {
  const { q, tr } = props;
  const label =
    q.asked === "build"
      ? tr("questions.asked.build")
      : q.asked === "brief"
        ? tr("questions.asked.brief")
        : tr("questions.asked.draft");
  return (
    <div class="muted qwhere" data-asked={q.asked ?? "draft"}>
      {label} · <span class="mono">{q.change}</span>
    </div>
  );
}

/** What it blocks, each requirement with Needs Clarification while it waits. */
function Blocks(props: { q: Question; waiting: ReadonlySet<string>; tr: QuestionsProps["tr"] }) {
  return (
    <div class="qblocks">
      <span class="muted">{props.tr("questions.blocks")}</span>
      {props.q.blocks.map((req) => (
        <span class="mono qreq" key={req} data-req={req} data-waiting={props.waiting.has(req)}>
          {req}
          {props.waiting.has(req) && (
            <span class="tag">{props.tr("questions.needsClarification")}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function OpenCard(p: QuestionsProps & { q: Question }) {
  const [chosen, setChosen] = useState("");
  const { q, tr } = p;
  return (
    <section
      class="card qcard"
      data-question={q.id}
      data-change={q.change}
      data-state="open"
      aria-label={`${q.id} ${q.text}`}
    >
      <div class="qtop">
        <span class="qbig mono">{q.id}</span>
        <Where q={q} tr={tr} />
        <Blocks q={q} waiting={p.waiting} tr={tr} />
      </div>
      <h2 class="syne qtitle">
        <span class="sr">{q.id} </span>
        {q.text}
      </h2>
      {/* As IDE-Preguntas.dc.html draws it: chips, a full-width answer, Save with what it writes. */}
      <div class="qopts qchips">
        {(q.options ?? []).map((o) => (
          <button
            type="button"
            class="btn chip"
            key={o}
            data-option={o}
            aria-pressed={chosen === o}
            onClick={() => setChosen(o)}
          >
            {o}
          </button>
        ))}
      </div>
      <div class="muted qhint">{tr("questions.hint")}</div>
      <input
        class="filter qinput"
        aria-label={tr("question.other")}
        placeholder={tr("question.other")}
        onInput={(e) => setChosen((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && chosen.trim()) {
            e.preventDefault();
            p.onAnswer(q, chosen.trim());
          }
        }}
      />
      <div class="qopts qsave">
        <button
          type="button"
          class="btn pri"
          data-act="answer"
          disabled={!chosen.trim()}
          onClick={() => p.onAnswer(q, chosen.trim())}
        >
          {tr("question.answer")}
        </button>
        <span class="muted qwrites">
          {tr("questions.writes", {
            answer: chosen.trim() || "…",
            q: q.id,
            reqs: q.blocks.join(", "),
          })}
        </span>
        <HelpButton
          label={tr("help.button", { feature: tr("question.answer") })}
          onOpen={() =>
            p.onHelp({
              action: "answer",
              feature: tr("question.answer"),
              vars: { q: q.id, change: q.change },
            })
          }
        />
      </div>
    </section>
  );
}

function AnsweredCard(p: QuestionsProps & { q: Question }) {
  const { q, tr } = p;
  return (
    <section
      class="card qcard"
      data-question={q.id}
      data-change={q.change}
      data-state="answered"
      aria-label={`${q.id} ${q.text}`}
    >
      <div>
        <b>{q.id}</b> {q.text}
      </div>
      <Where q={q} tr={tr} />
      <div class="qanswer">
        {tr("questions.answer")} <b data-answer>{q.answer ?? ""}</b>
        <span class="muted"> · {tr("questions.waitingReview")}</span>
      </div>
      <Blocks q={q} waiting={p.waiting} tr={tr} />
      <div class="qopts">
        <button type="button" class="btn pri" data-act="reviewed" onClick={() => p.onReviewed(q)}>
          {tr("questions.specSaysIt")}
        </button>
        <HelpButton
          label={tr("help.button", { feature: tr("questions.specSaysIt") })}
          onOpen={() =>
            p.onHelp({
              action: "answer-reviewed",
              feature: tr("questions.specSaysIt"),
              vars: { q: q.id, change: q.change },
            })
          }
        />
      </div>
    </section>
  );
}

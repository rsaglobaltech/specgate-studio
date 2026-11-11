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
  return (
    <>
      <h1>{p.tr("view.questions")}</h1>
      {open.length === 0 && answered.length === 0 && <p class="muted">{p.tr("questions.none")}</p>}
      {open.map((q) => (
        <OpenCard key={`${q.change}/${q.id}`} q={q} {...p} />
      ))}
      {answered.length > 0 && (
        <h2 class="qhead">{p.tr("questions.answered", { n: answered.length })}</h2>
      )}
      {answered.map((q) => (
        <AnsweredCard key={`${q.change}/${q.id}`} q={q} {...p} />
      ))}
    </>
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
      <div>
        <b>{q.id}</b> {q.text}
      </div>
      <Where q={q} tr={tr} />
      <Blocks q={q} waiting={p.waiting} tr={tr} />
      <div class="qopts">
        {(q.options ?? []).length > 0 && <span class="muted">{tr("question.options")}</span>}
        {(q.options ?? []).map((o) => (
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
          aria-label={tr("question.other")}
          placeholder={tr("question.other")}
          onInput={(e) => setChosen((e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          class="btn pri"
          data-act="answer"
          disabled={!chosen.trim()}
          onClick={() => p.onAnswer(q, chosen.trim())}
        >
          {tr("question.answer")}
        </button>
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

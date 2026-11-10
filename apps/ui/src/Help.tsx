import { useEffect, useState } from "preact/hooks";
import type { ActionId, Explanation, HelpVars, Notice } from "@specgate-studio/protocol";
import type { Rpc } from "./rpc.js";
import type { Lang } from "./i18n.js";

/** The "?" beside a feature that acts (draft-help REQ-061): opens its explanation, runs nothing. */
export function HelpButton(props: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      class="hq"
      aria-label={props.label}
      title={props.label}
      onClick={(e) => (e.stopPropagation(), props.onOpen())}
    >
      ?
    </button>
  );
}

export interface HelpRequest {
  action: ActionId;
  feature: string;
  vars?: HelpVars;
}

const ORDER: Array<keyof Explanation> = ["does", "command", "files", "doesNot", "next"];

/** The five parts of each action, as the host's catalog has them in the chosen language. */
export function HelpDialog(props: {
  rpc: Rpc;
  lang: Lang;
  requests: HelpRequest[];
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  type Answer = { labels: Record<keyof Explanation, string>; explanation: Explanation };
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all(
      props.requests.map((r) =>
        props.rpc.ask("help.explain", { action: r.action, lang: props.lang, vars: r.vars ?? {} }),
      ),
    ).then((a) => live && setAnswers(a));
    return () => {
      live = false;
    };
  }, [props.rpc, props.lang, props.requests]);
  const many = props.requests.length > 1;
  return (
    <div class="scrim" onClick={props.onClose}>
      <div class="help" role="dialog" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <h2>{props.title}</h2>
        {answers?.map((answer, i) => (
          <section key={props.requests[i]!.action} data-action={props.requests[i]!.action}>
            {many && <h3>{props.requests[i]!.feature}</h3>}
            <dl>
              {ORDER.map((part) => (
                <div key={part} data-part={part}>
                  <dt>{answer.labels[part]}</dt>
                  <dd class={part === "command" ? "mono" : ""}>{answer.explanation[part]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <button type="button" class="btn" onClick={props.onClose}>
          {props.closeLabel}
        </button>
      </div>
    </div>
  );
}

/** What an action did and what comes next — never only "done" (REQ-063). */
export function NoticeToast(props: {
  notice: Notice;
  nextLabel: string;
  fixLabel: string;
  onClose: () => void;
}) {
  const n = props.notice;
  return (
    <div class={`notice ${n.tone}`} role="status" data-tone={n.tone} onClick={props.onClose}>
      <div data-part="ran">{n.ran}</div>
      <div data-part="wrote" class="muted">
        {n.wrote}
      </div>
      {n.fix && (
        <div data-part="fix">
          {props.fixLabel}: {n.fix}
        </div>
      )}
      <div data-part="next">
        {props.nextLabel}: <span class="mono">{n.next}</span>
      </div>
    </div>
  );
}

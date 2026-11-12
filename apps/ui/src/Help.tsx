import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { ActionId, Explanation, HelpVars, Notice } from "@specgate-studio/protocol";
import type { Rpc } from "./rpc.js";
import type { Lang } from "./i18n.js";

/** Where the last "?" was pressed: the popover opens beside it (draft-design-conformance REQ-176). */
let anchor: DOMRect | null = null;
/** What was pressed last, and when: a "?" that is no HelpButton (the editor's) anchors it too. */
let pressed: { rect: DOMRect; at: number } | null = null;
if (typeof window !== "undefined")
  window.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target as HTMLElement | null;
      if (el?.getBoundingClientRect) pressed = { rect: el.getBoundingClientRect(), at: Date.now() };
    },
    true,
  );

/** The "?" beside a feature that acts (draft-help REQ-061): opens its explanation, runs nothing. */
export function HelpButton(props: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      class="hq"
      aria-label={props.label}
      title={props.label}
      onClick={(e) => {
        e.stopPropagation();
        anchor = (e.currentTarget as HTMLElement).getBoundingClientRect();
        props.onOpen();
      }}
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

/**
 * The five parts of each action, as the host's catalog has them in the chosen
 * language — in a popover beside the "?" that opened it, under
 * "[ UNDER THE HOOD ]", each part a label and its text (draft-design-conformance
 * REQ-176, A14). Escape or a click outside closes it; the window is not dimmed.
 */
export function HelpDialog(props: {
  rpc: Rpc;
  lang: Lang;
  requests: HelpRequest[];
  title: string;
  closeLabel: string;
  eyebrow: string;
  onClose: () => void;
}) {
  type Answer = { labels: Record<keyof Explanation, string>; explanation: Explanation };
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [at] = useState(() => {
    const a = anchor ?? (pressed && Date.now() - pressed.at < 1500 ? pressed.rect : null);
    anchor = null;
    return a;
  });
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
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
  // Under its "?", or above it near the window's foot; never off the window.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!at) {
      setPos({ left: Math.max(8, (vw - w) / 2), top: 72 });
      return;
    }
    const left = Math.min(Math.max(8, at.right - w), vw - w - 8);
    const below = at.bottom + 8;
    const top =
      below + h > vh - 8 && at.top - h - 8 > 8
        ? at.top - h - 8
        : Math.min(below, Math.max(8, vh - h - 8));
    setPos({ left, top });
  }, [answers, at]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    const away = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) props.onClose();
    };
    window.addEventListener("keydown", esc, true);
    window.addEventListener("mousedown", away, true);
    return () => {
      window.removeEventListener("keydown", esc, true);
      window.removeEventListener("mousedown", away, true);
    };
  }, [props.onClose]);
  const many = props.requests.length > 1;
  return (
    <div
      class="help popover"
      role="dialog"
      aria-label={props.title}
      ref={box}
      style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { visibility: "hidden" }}
      data-anchored={at ? "1" : undefined}
    >
      <div class="pop-head">
        <span class="eyebrow mono">[ {props.eyebrow} ]</span>
        <button type="button" class="pop-x" aria-label={props.closeLabel} onClick={props.onClose}>
          Esc ×
        </button>
      </div>
      <h2 class="syne">{props.title}</h2>
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
    </div>
  );
}

/**
 * What an action did and what comes next — never only "done" (REQ-063). A
 * success goes by itself after 5 s; a refusal or a failure stays until it is
 * closed, with "Retry" when running again could help (draft-design-conformance
 * REQ-178, A19).
 */
export function NoticeToast(props: {
  notice: Notice;
  nextLabel: string;
  fixLabel: string;
  retryLabel?: string;
  closeLabel?: string;
  onRetry?: (() => void) | undefined;
  onClose: () => void;
}) {
  const n = props.notice;
  useEffect(() => {
    if (n.tone !== "ok") return;
    const t = window.setTimeout(props.onClose, 5000);
    return () => window.clearTimeout(t);
  }, [n]);
  return (
    <div
      class={`notice ${n.tone}`}
      role="status"
      data-tone={n.tone}
      onClick={n.tone === "ok" ? props.onClose : undefined}
    >
      {n.tone !== "ok" && (
        <button
          type="button"
          class="notice-x"
          aria-label={props.closeLabel ?? "×"}
          onClick={(e) => (e.stopPropagation(), props.onClose())}
        >
          ×
        </button>
      )}
      {n.title && (
        <div data-part="title">
          <b>{n.title}</b>
        </div>
      )}
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
      {n.tone !== "ok" && props.onRetry && (
        <div class="actions notice-actions">
          <button
            type="button"
            class="btn"
            data-act="retry"
            onClick={(e) => (e.stopPropagation(), props.onRetry!())}
          >
            {props.retryLabel ?? "Retry"}
          </button>
        </div>
      )}
    </div>
  );
}

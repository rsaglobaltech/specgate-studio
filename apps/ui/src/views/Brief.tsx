import { useEffect, useState } from "preact/hooks";
import type { BriefView } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { bt } from "./briefText.js";

export interface BriefProps {
  rpc: Rpc;
  lang: Lang;
  /** What the view is made of: when one changes, the modules are read again. */
  stamp: readonly unknown[];
  openFile: (path: string) => void;
  /** "Draft the modules": the host drafts each module not drafted yet (REQ-073). */
  onDraft: (label: string) => void;
  onHelp: (feature: string, requests: HelpRequest[]) => void;
}

/**
 * The Brief view (draft-brief): `docs/brief.md` to edit as markdown, whose
 * checks run on every save (REQ-072), and its modules with "Draft the
 * modules" (REQ-073). It renders what the host answers; core decides which
 * modules are drafted and with which agent.
 */
export function Brief(p: BriefProps) {
  const t = (key: Parameters<typeof bt>[1], vars?: Record<string, string | number>) =>
    bt(p.lang, key, vars);
  const [view, setView] = useState<BriefView | null>(null);
  const [unreadable, setUnreadable] = useState(false);

  useEffect(() => {
    let live = true;
    p.rpc.ask("brief.get", {}).then(
      (v) => live && (setView(v), setUnreadable(false)),
      () => live && setUnreadable(true),
    );
    return () => {
      live = false;
    };
  }, [p.rpc, ...p.stamp]);

  const label = t("brief.draft");
  const next = view?.modules.find((m) => !m.drafted)?.module;
  return (
    <div class="brief">
      <h1>Brief</h1>
      <p class="muted">{t("brief.intro")}</p>
      <div class="actions">
        <button type="button" class="btn" onClick={() => p.openFile("docs/brief.md")}>
          {t("brief.open")}
        </button>
      </div>
      <h2>{t("brief.modules")}</h2>
      {unreadable ? (
        <p class="muted">{t("brief.unreadable")}</p>
      ) : view && view.modules.length === 0 ? (
        <p class="muted">{t("brief.none")}</p>
      ) : (
        <ul class="modules">
          {view?.modules.map((m) => (
            <li key={m.module} data-module={m.module} data-drafted={m.drafted ? "yes" : "no"}>
              <b class="mono">{m.module}</b>
              <span class="mono muted">{m.change}</span>
              <span data-part="state">{m.state}</span>
              <span class={m.drafted ? "state ok" : "state muted"}>
                {m.drafted ? t("brief.drafted") : t("brief.toDraft")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {view && (
        <p class="muted" data-part="agent">
          {view.agent ? t("brief.agent", { agent: view.agent }) : t("brief.noAgent")}
        </p>
      )}
      <div class="actions">
        <button
          type="button"
          class="btn pri"
          data-action="draft-modules"
          onClick={() => p.onDraft(label)}
        >
          {label}
        </button>
        <HelpButton
          label={t("brief.draftHelp")}
          onOpen={() =>
            p.onHelp(label, [
              {
                action: "draft-modules",
                feature: label,
                vars: {
                  ...(next ? { module: next } : {}),
                  ...(view?.agent ? { agent: view.agent } : {}),
                },
              },
            ])
          }
        />
      </div>
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import type { BriefForm, BriefFormResult, BriefFormView, Notice } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { bt, type BriefKey } from "./briefText.js";

export interface BriefFormProps {
  rpc: Rpc;
  lang: Lang;
  /** What the form is read from: when one changes, it is read again. */
  stamp: readonly unknown[];
  /** Names the button that runs a command, for the terminal's echo (REQ-053). */
  announce: (label: string) => void;
  onNotice: (notice: Record<Lang, Notice>) => void;
  onHelp: (feature: string, requests: HelpRequest[]) => void;
}

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * The brief as a form, as the board "IDE · Brief" draws it (draft-brief
 * REQ-071, REQ-074): the product, who uses it and where, the modules, and the
 * chosen module's rules, examples and open questions — read by specgate from
 * docs/brief.md and saved back through it, every line the form does not hold
 * kept. "Paste the client's text" has the agent propose the form; nothing is
 * saved until Accept, and Discard leaves the file as it is.
 */
export function BriefFormPanel(p: BriefFormProps) {
  const t = (key: BriefKey, vars?: Record<string, string | number>) => bt(p.lang, key, vars);
  const [view, setView] = useState<BriefFormView | null>(null);
  const [form, setForm] = useState<BriefForm | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(false);

  const read = () =>
    p.rpc.ask("brief.form", {}).then(
      (v) => {
        setView(v);
        setForm(v.form);
        setUnread(!v.form);
      },
      () => setUnread(true),
    );
  useEffect(() => {
    void read();
    // A save as markdown is checked, and the form read from the same file again (SCN-212).
    return p.rpc.on("problems.changed", () => void read());
  }, [p.rpc, ...p.stamp]);

  const done = (r: BriefFormResult) => {
    if (r.ok) {
      setView(r.view);
      setForm(r.view.form);
    } else if (r.notice) p.onNotice(r.notice);
    return r;
  };
  const save = async () => {
    if (!form) return;
    p.announce(t("form.save"));
    done(await p.rpc.ask("brief.form.save", { form }));
  };
  const propose = async () => {
    setBusy(true);
    p.announce(t("form.propose"));
    try {
      const r = done(await p.rpc.ask("brief.propose", { text }));
      if (r.ok) {
        setPasting(false);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  };

  const module = form?.modules.find((m) => m.key === chosen) ?? form?.modules[0] ?? null;
  const edit = (f: (draft: BriefForm) => void) =>
    setForm((old) => {
      if (!old) return old;
      const next = structuredClone(old);
      f(next);
      return next;
    });
  const field = (key: "rules" | "examples" | "questions", label: string) =>
    module && (
      <>
        <label class="lbl" for={`brief-${key}`}>
          {label}
        </label>
        <textarea
          id={`brief-${key}`}
          class="inp"
          data-field={key}
          rows={key === "rules" ? 4 : 2}
          title={t("form.oneEach")}
          value={module[key].join("\n")}
          onInput={(e) => {
            const value = lines((e.target as HTMLTextAreaElement).value);
            edit((d) => {
              const m = d.modules.find((x) => x.key === module.key);
              if (m) m[key] = value;
            });
          }}
        />
      </>
    );

  const proposal = view?.proposal ?? null;
  return (
    <aside class="brief-form" aria-label={t("form.head")} data-testid="brief-form">
      <div class="shead">
        <span>{t("form.head")}</span>
        <HelpButton
          label={t("form.help")}
          onOpen={() =>
            p.onHelp(t("form.head"), [
              { action: "brief-form", feature: t("form.save") },
              { action: "brief-propose", feature: t("form.paste") },
              { action: "brief-check", feature: t("problems.feature") },
            ])
          }
        />
      </div>
      <div class="brief-form-body">
        {unread && <p class="muted">{t("form.unread")}</p>}
        {form && (
          <>
            <label class="lbl" for="brief-product">
              {t("form.product")}
            </label>
            <input
              id="brief-product"
              class="inp"
              type="text"
              value={form.product}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                edit((d) => (d.product = v));
              }}
            />
            <span class="lbl">{t("form.actors")}</span>
            <div class="chips" data-testid="brief-actors">
              {form.actors.map((a) => (
                <span key={a.name} class="chip" aria-pressed="true" data-actor={a.name}>
                  {a.name} · {a.surfaces.join(", ") || "—"}
                </span>
              ))}
              <button
                type="button"
                class="chip"
                aria-pressed="false"
                onClick={() => {
                  const said = window.prompt(t("form.actorPrompt"));
                  if (!said?.trim()) return;
                  const [name, where] = said.split(/[·,:]/, 2).map((s) => s.trim());
                  if (!name) return;
                  edit((d) =>
                    d.actors.push({
                      name,
                      surfaces: where ? where.split(/\s+/).filter(Boolean) : [],
                    }),
                  );
                }}
              >
                {t("form.addActor")}
              </button>
            </div>
            <span class="lbl">{t("form.modules")}</span>
            <div class="chips" data-testid="brief-modules">
              {form.modules.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  class="chip"
                  data-module={m.key}
                  aria-pressed={module?.key === m.key ? "true" : "false"}
                  onClick={() => setChosen(m.key)}
                >
                  {m.name}
                </button>
              ))}
              <button
                type="button"
                class="chip"
                aria-pressed="false"
                onClick={() => {
                  const said = window.prompt(t("form.modulePrompt"))?.trim().toLowerCase();
                  if (!said || !/^[a-z0-9][a-z0-9-]*$/.test(said)) return;
                  edit((d) =>
                    d.modules.push({
                      key: said,
                      name: said,
                      section: true,
                      prose: "",
                      rules: [],
                      examples: [],
                      questions: [],
                    }),
                  );
                  setChosen(said);
                }}
              >
                {t("form.addModule")}
              </button>
            </div>
            {field("rules", t("form.rules", { module: module?.name ?? "" }))}
            {field("examples", t("form.examples"))}
            {field("questions", t("form.questions"))}
            <div class="actions">
              <button
                type="button"
                class="btn pri"
                data-action="brief-form-save"
                onClick={() => void save()}
              >
                {t("form.save")}
              </button>
              <HelpButton
                label={`? ${t("form.save")}`}
                onOpen={() =>
                  p.onHelp(t("form.saveFeature"), [
                    { action: "brief-form", feature: t("form.save") },
                  ])
                }
              />
            </div>
          </>
        )}
        {proposal && (
          <div class="card brief-proposal" data-testid="brief-proposal">
            <span class="eyebrow">{t("form.proposal")}</span>
            <p>
              <b>{proposal.product}</b>
            </p>
            <div class="chips">
              {proposal.actors.map((a) => (
                <span key={a.name} class="chip" aria-pressed="true">
                  {a.name} · {a.surfaces.join(", ")}
                </span>
              ))}
            </div>
            <div class="chips" data-testid="proposal-modules">
              {proposal.modules.map((m) => (
                <span key={m.key} class="chip" data-module={m.key}>
                  {m.name}
                </span>
              ))}
            </div>
            {proposal.modules
              .filter((m) => m.rules.length || m.examples.length)
              .map((m) => (
                <div key={m.key} class="muted small" data-proposed={m.key}>
                  <b>{m.name}</b>
                  <ul>
                    {[...m.rules, ...m.examples].map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            <p class="muted small">{t("form.proposalBody")}</p>
            <div class="actions">
              <button
                type="button"
                class="btn pri"
                data-action="brief-accept"
                onClick={async () => {
                  p.announce(t("form.accept"));
                  done(await p.rpc.ask("brief.accept", {}));
                }}
              >
                {t("form.accept")}
              </button>
              <button
                type="button"
                class="btn"
                data-action="brief-discard"
                onClick={async () => {
                  const r = await p.rpc.ask("brief.discard", {});
                  done(r);
                  if (r.ok && r.notice) p.onNotice(r.notice);
                }}
              >
                {t("form.discard")}
              </button>
            </div>
          </div>
        )}
        <div class="brief-client">
          <span class="b">{t("form.client")}</span>
          <span class="muted small">{t("form.clientBody")}</span>
          <div class="actions">
            <button
              type="button"
              class="btn"
              data-action="brief-paste"
              onClick={() => setPasting(true)}
            >
              {t("form.paste")}
            </button>
            <HelpButton
              label={`? ${t("form.paste")}`}
              onOpen={() =>
                p.onHelp(t("form.pasteFeature"), [
                  { action: "brief-propose", feature: t("form.paste") },
                ])
              }
            />
          </div>
        </div>
      </div>
      {pasting && (
        <div class="scrim" onClick={() => !busy && setPasting(false)}>
          <div
            class="help"
            role="dialog"
            aria-label={t("form.paste")}
            data-testid="brief-paste"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              <label for="brief-client">{t("form.paste")}</label>
            </h2>
            <p class="muted">{t("form.clientBody")}</p>
            <textarea
              id="brief-client"
              class="ask"
              rows={10}
              value={text}
              onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
            />
            {busy && <p class="muted">{t("form.proposing")}</p>}
            <div class="actions">
              <button
                type="button"
                class="btn pri"
                data-action="brief-propose"
                disabled={busy || !text.trim()}
                onClick={() => void propose()}
              >
                {t("form.propose")}
              </button>
              <button type="button" class="btn" disabled={busy} onClick={() => setPasting(false)}>
                {t("form.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

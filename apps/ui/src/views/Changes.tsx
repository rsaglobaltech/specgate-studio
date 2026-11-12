import { useEffect, useState } from "preact/hooks";
import type {
  AppliedPlan,
  ChangeReview,
  RedraftResult,
  Segment,
  ArchivePreview,
  ChangeCard,
  ChangeGroup,
  ChangesView,
  RunResult,
  SpecgateCommand,
  TicketReview,
} from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Lang } from "../i18n.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { ct } from "./changesText.js";

const GROUPS: ChangeGroup[] = ["review", "progress", "ready"];
const KINDS = ["spec", "traceability", "feature"] as const;

export interface ChangesProps {
  rpc: Rpc;
  lang: Lang;
  /** Opened from the palette's "Open a change from a ticket". */
  ticketPanel: boolean;
  /** The sections Changes is made of: when one is read again, so is the view. */
  stamp: readonly unknown[];
  /** Runs a command for a button; the terminal's echo names the button (REQ-053). */
  run: (label: string, command: SpecgateCommand) => Promise<RunResult>;
  /** Opens the "?" of a feature: what each of its actions does, running nothing. */
  onHelp: (feature: string, requests: HelpRequest[]) => void;
  /** "Draft again with N requested changes": the host runs it, named in the terminal (REQ-083). */
  onRedraft: (label: string, change: string) => Promise<RedraftResult>;
}

/**
 * The Changes view (draft-changes): every open change in its group (REQ-081),
 * Apply on each requirement still to apply (REQ-086), Archive only after its
 * preview (REQ-085), and a change from a ticket reviewed before it opens
 * (REQ-084). It renders what the host answers; the host and core decide.
 */
export function Changes(p: ChangesProps) {
  const t = (key: Parameters<typeof ct>[1], vars?: Record<string, string | number>) =>
    ct(p.lang, key, vars);
  const [view, setView] = useState<ChangesView | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [archive, setArchive] = useState<{ command: string; preview: ArchivePreview } | null>(null);
  const [ticketOpen, setTicketOpen] = useState(p.ticketPanel);
  const [selected, setSelected] = useState<string | null>(null);
  // The agent's applied plans: each diff stays under its change (draft-workbench-v2 REQ-182).
  const [applied, setApplied] = useState<AppliedPlan[]>([]);

  useEffect(() => setTicketOpen((o) => o || p.ticketPanel), [p.ticketPanel]);
  useEffect(() => {
    let live = true;
    p.rpc.ask("changes.get", {}).then(
      (v) => live && (setView(v), setUnreadable(false)),
      () => live && setUnreadable(true),
    );
    return () => {
      live = false;
    };
  }, [p.rpc, ...p.stamp]);
  useEffect(() => {
    p.rpc.ask("agent.applied", {}).then(setApplied, () => undefined);
    return p.rpc.on(
      "agent.changed",
      () => void p.rpc.ask("agent.applied", {}).then(setApplied, () => undefined),
    );
  }, [p.rpc, ...p.stamp]);

  const previewArchive = async (change: string) => {
    const label = t("archive.label", { change });
    const r = await p.run(label, { name: "archive-preview", change });
    // A refusal shows its notice; only a preview specgate gave can be confirmed.
    if (r.ok && r.exitCode === 0 && r.preview) {
      setArchive({ command: `specgate archive ${change} --dry-run`, preview: r.preview });
    }
  };

  const card = (c: ChangeCard) => (
    <div class="card change" key={c.id} data-change={c.id} style="margin-bottom:8px">
      <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
        <b class="mono">{c.id}</b>
        {c.draft && <span class="muted">{t("change.draft")}</span>}
        {c.approved && <span class="muted">{t("change.approved", { date: c.approved })}</span>}
        {c.ticket && <span class="mono muted">{c.ticket}</span>}
      </div>
      {c.group === "review" && (
        <p class="muted" style="margin:6px 0 0">
          {t("change.waitsReview")}
        </p>
      )}
      {c.requirements.length === 0 && (
        <p class="muted" style="margin:6px 0 0">
          {t("change.noRequirement")}
        </p>
      )}
      {c.requirements.length > 0 && (
        <ul class="reqs" style="list-style:none;margin:8px 0 0;padding:0">
          {c.requirements.map((r) => (
            <li
              key={r.id}
              data-req={r.id}
              style="display:flex;gap:8px;align-items:center;padding:2px 0"
            >
              <span class="mono">{r.id}</span>
              <span>{r.title}</span>
              <span
                class={r.applied ? "state ok" : "state muted"}
                data-state={r.applied ? "implemented" : "to-apply"}
              >
                {r.applied ? t("req.implemented") : (r.needs ?? t("req.toApply"))}
              </span>
              {!r.applied && c.group === "progress" && (
                <>
                  <button
                    type="button"
                    class="btn"
                    data-action="apply"
                    onClick={() =>
                      void p.run(t("apply.label", { req: r.id }), { name: "apply", req: r.id })
                    }
                  >
                    {t("apply.label", { req: r.id })}
                  </button>
                  <HelpButton
                    label={t("help.button", { feature: t("apply.label", { req: r.id }) })}
                    onOpen={() =>
                      p.onHelp(t("apply.label", { req: r.id }), [
                        {
                          action: "apply",
                          feature: t("apply.feature"),
                          vars: { req: r.id, change: c.id },
                        },
                      ])
                    }
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {c.group === "progress" && c.toApply.length > 0 && (
        <p class="muted" data-part="to-apply" style="margin:6px 0 0">
          {t("change.toApply", { reqs: c.toApply.join(", ") })}
        </p>
      )}
      {c.group === "ready" && (
        <div class="actions" style="margin-top:8px">
          <button
            type="button"
            class="btn pri"
            data-action="archive"
            onClick={() => void previewArchive(c.id)}
          >
            {t("archive.label", { change: c.id })}
          </button>
          <HelpButton
            label={t("help.button", { feature: t("archive.label", { change: c.id }) })}
            onOpen={() =>
              p.onHelp(t("archive.label", { change: c.id }), [
                {
                  action: "archive-preview",
                  feature: t("archivePreview.feature"),
                  vars: { change: c.id },
                },
                { action: "archive", feature: t("archive.feature"), vars: { change: c.id } },
              ])
            }
          />
        </div>
      )}
    </div>
  );

  // The change shown beside the list: the one chosen, else the first to review (REQ-175).
  const all = view ? GROUPS.flatMap((g) => view.groups[g]) : [];
  const shown = all.find((c) => c.id === selected) ?? all[0] ?? null;

  return (
    <div class="split" data-view="changes">
      <aside class="side" aria-label={t("side.title")}>
        <div class="shead">
          <h1 class="shead-h">{t("side.title")}</h1>
          <button
            type="button"
            class="btn small"
            data-action="from-ticket"
            onClick={() => setTicketOpen(true)}
          >
            {t("side.new")}
          </button>
        </div>
        {unreadable && <p class="muted side-note">{t("changes.unreadable")}</p>}
        {view &&
          GROUPS.map((g) => (
            <section key={g} class="cgroup" data-group={g}>
              <h2 class="sgroup">{t(`group.${g}`, { n: view.groups[g].length })}</h2>
              {view.groups[g].length === 0 ? (
                <p class="muted side-empty">{t("group.none")}</p>
              ) : (
                view.groups[g].map((c) => {
                  const applied = c.requirements.filter((r) => r.applied).length;
                  return (
                    <button
                      type="button"
                      class="tr crow change"
                      key={c.id}
                      data-change={c.id}
                      aria-current={shown?.id === c.id ? "true" : undefined}
                      onClick={() => setSelected(c.id)}
                    >
                      <span class={`dot ${g}`} />
                      <span class="name">{c.id}</span>
                      <span class={`right ${g === "ready" ? "ok" : g === "review" ? "warn" : ""}`}>
                        {g === "review"
                          ? c.review && c.review.open > 0
                            ? t("review.side", { n: c.review.open })
                            : t("side.draft")
                          : `${applied}/${c.requirements.length}`}
                      </span>
                    </button>
                  );
                })
              )}
            </section>
          ))}
        <p class="side-note dashed">{t("side.note")}</p>
      </aside>
      <div class="detail">
        {ticketOpen && (
          <TicketPanel
            rpc={p.rpc}
            lang={p.lang}
            run={p.run}
            onHelp={p.onHelp}
            onClose={() => setTicketOpen(false)}
          />
        )}
        {shown ? (
          <>
            <div class="detail-head">
              <h2 class="syne">{shown.id}</h2>
              <span class="muted">
                {shown.draft
                  ? t("side.draftOf", {
                      module: shown.id.replace(/^draft-/, ""),
                      n: shown.requirements.length,
                    })
                  : t("side.applied", {
                      applied: shown.requirements.filter((r) => r.applied).length,
                      n: shown.requirements.length,
                    })}
                {" · "}
                {t(`side.${shown.group}`)}
              </span>
              {shown.draft && shown.module && shown.review && shown.review.open > 0 && (
                <span class="actions" style="margin:0 0 0 auto">
                  <button
                    type="button"
                    class="btn pri"
                    data-action="redraft"
                    onClick={() =>
                      void p.onRedraft(t("review.redraft", { n: shown.review!.open }), shown.id)
                    }
                  >
                    {t("review.redraft", { n: shown.review.open })}
                  </button>
                  <HelpButton
                    label={t("help.button", { feature: t("review.redraftFeature") })}
                    onOpen={() =>
                      p.onHelp(t("review.redraftFeature"), [
                        {
                          action: "redraft",
                          feature: t("review.redraft", { n: shown.review!.open }),
                          vars: { module: shown.module!, count: String(shown.review!.open) },
                        },
                      ])
                    }
                  />
                </span>
              )}
            </div>
            {card(shown)}
            {shown.draft && (
              <Review
                review={shown.review}
                change={shown.id}
                t={t}
                onHelp={() =>
                  p.onHelp(t("review.help"), [
                    {
                      action: "ask-change",
                      feature: t("review.title"),
                      vars: { change: shown.id, module: shown.module ?? "" },
                    },
                    ...(shown.module
                      ? [
                          {
                            action: "redraft" as const,
                            feature: t("review.redraftFeature"),
                            vars: { module: shown.module },
                          },
                        ]
                      : []),
                  ])
                }
              />
            )}
            <AppliedDiffs plans={applied.filter((a) => a.change === shown.id)} t={t} />
          </>
        ) : (
          view && <p class="muted">{t("side.none")}</p>
        )}
        {archive && (
          <div class="scrim" onClick={() => setArchive(null)}>
            <div
              class="help archive-preview"
              role="dialog"
              aria-label={t("archive.title", { change: archive.preview.change })}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>{t("archive.title", { change: archive.preview.change })}</h2>
              <p>{t("archive.body", { command: archive.command })}</p>
              {[...KINDS, "other" as const].map((kind) => {
                const files = archive.preview.writes.filter((w) =>
                  kind === "other"
                    ? !(KINDS as readonly string[]).includes(w.kind)
                    : w.kind === kind,
                );
                return files.length === 0 ? null : (
                  <section key={kind} data-kind={kind}>
                    <h3>{t(`archive.kind.${kind}`)}</h3>
                    <ul>
                      {files.map((w) => (
                        <li key={w.file} class="mono">
                          {w.file}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              {archive.preview.deletes.length > 0 && (
                <section data-kind="deletes">
                  <h3>{t("archive.deletes")}</h3>
                  <ul>
                    {archive.preview.deletes.map((f) => (
                      <li key={f} class="mono">
                        {f}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {archive.preview.warnings.map((w) => (
                <p key={w.code} class="muted" data-finding={w.code}>
                  {w.code}: {w.message}
                  {w.fix ? ` ${t("fix")}: ${w.fix}` : ""}
                </p>
              ))}
              <div class="actions">
                <button
                  type="button"
                  class="btn pri"
                  data-action="confirm-archive"
                  onClick={() => {
                    const change = archive.preview.change;
                    setArchive(null);
                    void p.run(t("archive.label", { change }), { name: "archive", change });
                  }}
                >
                  {t("archive.confirm")}
                </button>
                <button type="button" class="btn" onClick={() => setArchive(null)}>
                  {t("archive.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A change from a ticket (REQ-084): the ticket's review first — what the
 * change will contain, the branch it opens on, its commit and its push —
 * and `specgate propose --from-ticket` only once the Developer confirms.
 */
function TicketPanel(p: {
  rpc: Rpc;
  lang: Lang;
  run: ChangesProps["run"];
  onHelp: ChangesProps["onHelp"];
  onClose: () => void;
}) {
  const t = (key: Parameters<typeof ct>[1], vars?: Record<string, string | number>) =>
    ct(p.lang, key, vars);
  const [key, setKey] = useState("");
  const [review, setReview] = useState<TicketReview | null>(null);
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [noPush, setNoPush] = useState(false);

  const read = () => {
    const k = key.trim().toUpperCase();
    setReading(true);
    setFailed(null);
    setReview(null);
    p.rpc.ask("changes.ticket", { key: k }).then(
      (r) => (setReview(r), setReading(false)),
      () => (setFailed(k), setReading(false)),
    );
  };

  return (
    <section class="card ticket" aria-label={t("ticket.title")} style="margin-bottom:16px">
      <h2 style="margin:0 0 6px;font-size:16px">{t("ticket.title")}</h2>
      <form
        style="display:flex;gap:8px;align-items:center"
        onSubmit={(e) => (e.preventDefault(), read())}
      >
        <input
          class="filter"
          name="ticket-key"
          aria-label={t("ticket.key")}
          placeholder="KAN-13"
          value={key}
          onInput={(e) => setKey((e.target as HTMLInputElement).value)}
        />
        <button type="submit" class="btn" data-action="review-ticket" disabled={!key.trim()}>
          {t("ticket.review")}
        </button>
        <button type="button" class="btn" data-action="close-ticket" onClick={p.onClose}>
          {t("ticket.close")}
        </button>
      </form>
      {reading && <p class="muted">{t("ticket.reviewing")}</p>}
      {failed && <p class="muted">{t("ticket.unreadable", { key: failed })}</p>}
      {review && (
        <div class="ticket-review" data-key={review.key} style="margin-top:10px">
          {review.ticket && (
            <>
              <p style="margin:0 0 6px">
                <b class="mono">{review.key}</b> {review.ticket.summary}{" "}
                <span class="muted">{review.ticket.type}</span>
              </p>
              {review.ticket.criteria.length > 0 && (
                <>
                  <h3 style="font-size:13px;margin:8px 0 4px">{t("ticket.criteria")}</h3>
                  <ul data-part="criteria">
                    {review.ticket.criteria.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
              {review.ticket.questions.length > 0 && (
                <>
                  <h3 style="font-size:13px;margin:8px 0 4px">{t("ticket.questions")}</h3>
                  <ul data-part="questions">
                    {review.ticket.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          {review.findings.length > 0 && (
            <>
              <h3 style="font-size:13px;margin:8px 0 4px">{t("ticket.findings")}</h3>
              <ul data-part="findings">
                {review.findings.map((f, i) => (
                  <li key={`${f.code}-${i}`} data-finding={f.code} data-severity={f.severity}>
                    <span class="mono">{f.code}</span> {f.message}
                    {f.fix && (
                      <div class="muted">
                        {t("fix")}: {f.fix}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {review.ready ? (
            <>
              <ul data-part="opening" style="margin:8px 0">
                <li data-part="branch">
                  {review.onBranch
                    ? t("ticket.onBranch", { branch: review.onBranch })
                    : t("ticket.newBranch", { key: review.key })}
                </li>
                <li data-part="commit">{t("ticket.commits")}</li>
                <li data-part="push">{noPush ? t("ticket.noPushes") : t("ticket.pushes")}</li>
              </ul>
              <label style="display:flex;gap:6px;align-items:center">
                <input
                  type="checkbox"
                  name="no-push"
                  checked={noPush}
                  onChange={(e) => setNoPush((e.target as HTMLInputElement).checked)}
                />
                {t("ticket.dontPush")}
              </label>
              <p class="muted" style="margin:8px 0 4px">
                {t("ticket.runs")}{" "}
                <span class="mono" data-part="command">
                  {noPush ? review.shown.noPush : review.shown.push}
                </span>
              </p>
              <div class="actions">
                <button
                  type="button"
                  class="btn pri"
                  data-action="confirm-ticket"
                  onClick={() => {
                    const command = noPush ? review.open.noPush : review.open.push;
                    p.onClose();
                    void p.run(t("ticket.confirm"), command);
                  }}
                >
                  {t("ticket.confirm")}
                </button>
                <HelpButton
                  label={t("help.button", { feature: t("ticket.confirm") })}
                  onOpen={() =>
                    p.onHelp(t("ticket.feature"), [
                      {
                        action: "propose-ticket",
                        feature: t("ticket.feature"),
                        vars: { key: review.key },
                      },
                    ])
                  }
                />
              </div>
            </>
          ) : (
            <p class="muted" data-part="not-ready">
              {t("ticket.notReady")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** The agent's plans applied in a change, each file's diff (draft-workbench-v2 REQ-182). */
function AppliedDiffs(props: {
  plans: AppliedPlan[];
  t: (key: Parameters<typeof ct>[1], vars?: Record<string, string | number>) => string;
}) {
  if (props.plans.length === 0) return null;
  const { t } = props;
  return (
    <section class="card applied" data-testid="agent-applied" style="margin-top:8px">
      <h3 class="sgroup">{t("applied.title")}</h3>
      <p class="muted small">{t("applied.note")}</p>
      {props.plans.map((plan) => (
        <div key={plan.id} data-plan={plan.id}>
          <p class="agent-req">{plan.request}</p>
          {plan.files.map((f) => (
            <div key={f.path} data-file={f.path}>
              <p class="mono">
                <b class={`mark ${f.change}`}>{f.mark}</b> {f.path}
              </p>
              <pre class="diff">
                {f.diff
                  .replace(/\n$/, "")
                  .split("\n")
                  .filter((l) => !/^(diff --git|index |new file mode|deleted file mode)/.test(l))
                  .map((l, i) => (
                    <div
                      key={i}
                      class={
                        /^(\+\+\+|---)/.test(l)
                          ? "dh"
                          : l.startsWith("+")
                            ? "add"
                            : l.startsWith("-")
                              ? "del"
                              : l.startsWith("@@")
                                ? "hunk"
                                : ""
                      }
                    >
                      {l || " "}
                    </div>
                  ))}
              </pre>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

type CT = (key: Parameters<typeof ct>[1], vars?: Record<string, string | number>) => string;

/** A text with the words a redraft changed marked (REQ-082, SCN-244). */
function Marked(props: { segments: Segment[]; kind: "del" | "ins" }) {
  return (
    <>
      {props.segments.map((s, i) =>
        s.changed ? (
          <mark key={i} class={props.kind}>
            {s.text}
          </mark>
        ) : (
          s.text
        ),
      )}
    </>
  );
}

/**
 * A draft's requests for change (REQ-082): each with its requirement, text,
 * date and whether it is open or addressed; and, for each requirement a
 * redraft changed, its text before and after, side by side, the changed words
 * marked. With none open it says so (SCN-246).
 */
function Review(props: { review: ChangeReview | null; change: string; t: CT; onHelp: () => void }) {
  const { review, t } = props;
  const notes = review?.notes ?? [];
  const changed = notes.flatMap((n) => n.changes.map((c) => ({ note: n, c })));
  return (
    <>
      <section
        class="card review"
        data-testid="review"
        data-open={review?.open ?? 0}
        style="margin-top:8px"
      >
        <div class="review-head">
          <h3 class="review-title">{t("review.title")}</h3>
          <span class="mono muted">
            {review?.file?.replace(/^docs\/specs\//, "") ?? "review.md"}
          </span>
          <HelpButton label={t("review.help")} onOpen={props.onHelp} />
        </div>
        {notes.length === 0 ? (
          <p class="muted" data-testid="review-none">
            {t("review.none")}
          </p>
        ) : (
          <ul class="notes">
            {notes.map((n) => (
              <li key={n.id} data-note={n.id} data-state={n.state} data-req={n.requirement ?? ""}>
                <span class="mono rid-accent">{n.requirement ?? "—"}</span>
                <span>{n.text}</span>
                <span class={`pill-state ${n.state === "open" ? "warn" : "ok"}`}>
                  {n.state === "open" ? t("review.open") : t("review.addressed")}
                </span>
                <span class="muted">{n.date}</span>
              </li>
            ))}
          </ul>
        )}
        {notes.length > 0 && review?.open === 0 && (
          <p class="muted" data-testid="review-no-open">
            {t("review.noOpen")}
          </p>
        )}
      </section>
      {changed.map(({ note, c }, i) => (
        <section
          key={`${note.id}-${i}`}
          class="card before-after"
          data-testid="before-after"
          data-req={c.requirement ?? ""}
          data-note={note.id}
          style="margin-top:8px"
        >
          <div class="review-head">
            <span class="mono rid-accent">{c.requirement ?? t("review.draftOnly")}</span>
            <span class="pill-state ok">
              {t("review.lastRedraft", { date: note.addressedOn ?? "" })}
            </span>
            <span class="muted mono small">{c.file.replace(/^docs\/specs\//, "")}</span>
          </div>
          <div class="ba">
            <div data-side="before">
              <h4>{t("review.before")}</h4>
              <pre>
                <Marked segments={c.before} kind="del" />
              </pre>
            </div>
            <div data-side="after">
              <h4>{t("review.after")}</h4>
              <pre>
                <Marked segments={c.after} kind="ins" />
              </pre>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

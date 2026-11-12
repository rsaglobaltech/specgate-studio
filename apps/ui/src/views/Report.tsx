import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type {
  Figure,
  GateStage,
  GateView,
  Lang,
  Notice,
  ReportCost,
  ReportMissing,
  ReportUsage,
  ReportView,
} from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import { HelpButton, type HelpRequest } from "../Help.js";
import { reportFile, reportPage } from "../reportPage.js";

type Tr = (k: string, v?: Record<string, string | number>) => string;

const locale = (lang: Lang) => (lang === "es" ? "es-ES" : "en-US");

/** A percentage in the studio's language: "74 %", "61,5 %". */
export function pct(lang: Lang, n: number): string {
  return `${new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 1 }).format(n)} %`;
}

/** A cost: "$1.23" in English, "1,23 $" in Spanish. */
export function money(lang: Lang, n: number): string {
  return new Intl.NumberFormat(locale(lang), { style: "currency", currency: "USD" }).format(n);
}

/** Tokens, every kind together: "17.6M tokens". */
export function tokens(lang: Lang, u: ReportUsage): string {
  const n = u.input + u.output + u.cacheRead + u.cacheWrite;
  return new Intl.NumberFormat(locale(lang), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** The time spent building: "1 h 5 min", "30 min", "< 1 min". */
export function spent(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "< 1 min";
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
}

/** How long a stage took: "185 ms", "41,2 s". */
export function took(lang: Lang, ms: number): string {
  return ms < 1000
    ? `${ms} ms`
    : `${new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 1 }).format(ms / 1000)} s`;
}

/** A date in the studio's language: "9 nov 2026", "Nov 9, 2026". */
export function day(lang: Lang, at: Date): string {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium" }).format(at);
}

/** When the gate ran: "12 nov 2026, 20:34". */
export function when(lang: Lang, iso: string): string {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** A stage's name in the studio's language; a quality check by its name. */
export function stageName(tr: Tr, s: GateStage): string {
  return s.stage === "quality" && s.name
    ? tr("report.stage.quality.named", { name: s.name })
    : tr(`report.stage.${s.stage}`);
}

/** Why a requirement is not built, in the studio's words: its question, else its category. */
export function whyMissing(tr: Tr, m: ReportMissing): string {
  if (m.question) return tr("report.why.waiting", { q: m.question.id, text: m.question.text });
  const key = `report.why.${m.category}`;
  const said = tr(key);
  return said === key ? (m.needs ?? m.category) : said;
}

const MARK: Record<GateStage["result"], string> = {
  passed: "✓",
  failed: "✗",
  not_configured: "!",
  not_run: "○",
  skipped: "·",
};

/** A figure not measured: its command — and specgate's fix when it gave one — never 0 (A5). */
function NotMeasured(p: { tr: Tr; command: string; fix?: string | undefined }) {
  return (
    <>
      <div class="v muted">{p.tr("report.notMeasured")}</div>
      <div class="sub muted">
        {p.tr("report.measureWith")} <code class="mono">{p.command}</code>
      </div>
      {p.fix && <div class="sub muted rfix">{p.fix}</div>}
    </>
  );
}

function Card<T>(p: {
  id: string;
  label: string;
  figure: Figure<T>;
  tr: Tr;
  show: (v: T) => ComponentChildren;
  sub?: (v: T) => ComponentChildren;
  by?: string;
}) {
  const f = p.figure;
  return (
    <div class="card rcard" data-testid={`report-${p.id}`} data-measured={String(f.measured)}>
      <div class="k">{p.label}</div>
      {f.measured ? (
        <>
          <div class="v">{p.show(f.value)}</div>
          {p.by && <div class="sub muted">{p.by}</div>}
          {p.sub?.(f.value)}
        </>
      ) : (
        <>
          {p.by && <div class="sub muted">{p.by}</div>}
          <NotMeasured tr={p.tr} command={f.command} fix={f.fix} />
        </>
      )}
    </div>
  );
}

/** The cost as the user's answer has it (Q2): measured at API prices, estimated per profile, or the usage alone. */
function Cost(p: { lang: Lang; tr: Tr; cost: ReportCost }) {
  const c = p.cost;
  const used = c.tokens && (
    <div class="sub muted" data-testid="report-usage">
      {p.tr("report.usage", { n: tokens(p.lang, c.tokens) })}
    </div>
  );
  if (c.basis === "usage")
    return (
      <div data-basis="usage">
        <div class="v">{p.tr("report.tokens", { n: tokens(p.lang, c.tokens!) })}</div>
        <div class="sub muted">{p.tr("report.cost.usage")}</div>
        <div class="sub muted">
          {p.tr("report.cost.priceWith")}{" "}
          <code class="mono">{`specgate config set ${c.priceKey ?? ""} <price>`}</code>
        </div>
      </div>
    );
  return (
    <div data-basis={c.basis}>
      <div class="v">
        {c.basis === "measured" ? "≈ " : ""}
        {money(p.lang, c.total ?? 0)}
      </div>
      <div class="sub muted">
        {p.tr(`report.cost.${c.basis}`)}
        {c.profiles.length > 0 &&
          ` · ${p.tr("report.cost.from", { profiles: c.profiles.join(", ") })}`}
      </div>
      {used}
    </div>
  );
}

/** The last gate specgate recorded, stage by stage, with the fix of what failed (REQ-132). */
function Gate(p: { lang: Lang; tr: Tr; gate: GateView; onCheck: () => void; checking: boolean }) {
  const g = p.gate;
  const check = (
    <button
      type="button"
      class="btn"
      data-testid="report-check"
      disabled={p.checking}
      onClick={p.onCheck}
    >
      {p.tr("report.checkNow")}
    </button>
  );
  if (!g.ran)
    return (
      <section class="card rgate" data-testid="report-gate" data-ran="false">
        <div class="rsec">
          <h2>{p.tr("report.gate")}</h2>
          {check}
        </div>
        <p class="muted">{p.tr("report.gate.none")}</p>
        <p>
          <code class="mono">{g.command}</code>
        </p>
      </section>
    );
  return (
    <section
      class="card rgate"
      data-testid="report-gate"
      data-ran="true"
      data-passed={String(g.passed)}
    >
      <div class="rsec">
        <h2>
          {p.tr("report.gate")}{" "}
          <span class={`rgate-says ${g.passed ? "ok" : "bad"}`}>
            {p.tr(g.passed ? "report.gate.passed" : "report.gate.failed")}
          </span>
        </h2>
        {check}
      </div>
      <div class="muted rgate-when" data-at={g.at}>
        {p.tr("report.gate.when", { when: when(p.lang, g.at) })}
        {g.branch && ` · ${g.branch}`}
      </div>
      {g.stages.map((s) => (
        <div
          class="rstage"
          key={`${s.stage}:${s.name ?? ""}`}
          data-stage={s.stage}
          data-name={s.name ?? ""}
          data-result={s.result}
        >
          <span class={`rmark ${s.result}`} aria-hidden="true">
            {MARK[s.result]}
          </span>
          <b>{stageName(p.tr, s)}</b>
          <span class="rstage-what">
            <span class="rresult">{p.tr(`report.result.${s.result}`)}</span>
            {s.command && (
              <>
                {" · "}
                <code class="mono">{s.command}</code>
              </>
            )}
            {s.result === "not_configured" && s.stage === "architecture" && (
              <>
                {" · "}
                <code class="mono">specgate config set arch_cmd &lt;command&gt;</code>
              </>
            )}
            {s.ms !== null && <span class="muted"> · {took(p.lang, s.ms)}</span>}
          </span>
          {s.result === "failed" &&
            s.findings
              .filter((f) => f.severity === "error")
              .map((f) => (
                <div class="rfinding" key={f.code} data-code={f.code}>
                  <code class="mono">{f.code}</code> {f.message}
                  {f.fix && (
                    <div class="rfix-line">
                      {p.tr("notice.fix")}: <span class="rfix-text">{f.fix}</span>
                    </div>
                  )}
                </div>
              ))}
        </div>
      ))}
    </section>
  );
}

export interface ReportProps {
  rpc: Rpc;
  lang: Lang;
  tr: Tr;
  project: string;
  /** What Home counts, open changes included, and `report --json`'s total. */
  total: number;
  reportTotal: number | undefined;
  onCheck: () => void;
  /** A gate running: Report reads the last one again when it ends (REQ-132). */
  checking: boolean;
  onHelp: (r: HelpRequest) => void;
  /** The download's notice, in both languages (REQ-133). */
  onNotice: (n: Record<Lang, Notice>) => void;
}

/** The system's save dialog, where the webview offers it (Chromium, WebView2). */
type SavePicker = (o: {
  suggestedName: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<{
  name: string;
  createWritable(): Promise<{ write(d: Blob | string): Promise<void>; close(): Promise<void> }>;
}>;

/**
 * The page saved (REQ-133, A10): in the desktop app, with the system's save
 * dialog its webview offers; in the browser — or a webview with none — as the
 * browser's download. The name it was saved as, or null when cancelled.
 */
async function savePage(html: string, file: string): Promise<string | null> {
  const w = window as unknown as { showSaveFilePicker?: SavePicker };
  const desktop = "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
  const picker = desktop ? w.showSaveFilePicker?.bind(window) : undefined;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: file,
        types: [{ description: "HTML", accept: { "text/html": [".html"] } }],
      });
      const out = await handle.createWritable();
      await out.write(new Blob([html], { type: "text/html" }));
      await out.close();
      return handle.name;
    } catch (e) {
      if ((e as { name?: string } | null)?.name === "AbortError") return null;
      throw e;
    }
  }
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return file;
}

/**
 * Report as the Informe board draws it (draft-report REQ-131, REQ-132): what
 * was built, how it was proven and what it cost — for the project, or for a
 * module chosen under "By module" — the last gate by stage, and what is
 * missing and why. The host reads it all from specgate's JSON; this words it.
 */
export function Report(p: ReportProps) {
  const [module, setModule] = useState<string | null>(null);
  const [view, setView] = useState<ReportView | null>(null);
  const asked = useRef(0);
  useEffect(() => {
    if (p.checking) return;
    const n = ++asked.current;
    p.rpc.ask("report.get", { module }).then(
      (v) => n === asked.current && setView(v),
      () => undefined,
    );
  }, [p.rpc, module, p.total, p.checking]);

  /** One HTML page of what Report shows, saved where the Developer chooses (REQ-133). */
  const download = async () => {
    if (!view) return;
    const html = reportPage(view, { project: p.project, lang: p.lang, tr: p.tr, at: new Date() });
    const saved = await savePage(html, reportFile(p.project, view.module));
    if (!saved) return;
    const r = await p.rpc.ask("report.saved", { file: saved, module: view.module });
    p.onNotice(r.notice);
  };
  const of = (n: number, total: number) => (
    <>
      {n} <small class="muted">{p.tr("report.ofTotal", { total })}</small>
    </>
  );
  return (
    <div class="report" data-module={view?.module ?? ""}>
      <header class="rhead">
        <div class="rtitle">
          <h1>{p.tr("view.report")}</h1>
          <span class="muted">
            {p.project} · {day(p.lang, new Date())} · {p.tr("report.subtitle")}
          </span>
          {module && (
            <button
              type="button"
              class="rchip"
              data-testid="report-module-chosen"
              aria-label={p.tr("report.allModules")}
              onClick={() => setModule(null)}
            >
              {module} ×
            </button>
          )}
        </div>
        <div class="ractions">
          <button
            type="button"
            class="btn"
            data-testid="report-print"
            disabled={!view}
            onClick={() => window.print()}
          >
            {p.tr("report.print")}
          </button>
          <HelpButton
            label={p.tr("help.button", { feature: p.tr("report.print") })}
            onOpen={() => p.onHelp({ action: "report-print", feature: p.tr("report.print") })}
          />
          <button
            type="button"
            class="btn pri"
            data-testid="report-download"
            disabled={!view}
            onClick={() => void download()}
          >
            {p.tr("report.download")}
          </button>
          <HelpButton
            label={p.tr("help.button", { feature: p.tr("report.download") })}
            onOpen={() =>
              p.onHelp({
                action: "report-download",
                feature: p.tr("report.download"),
                vars: {
                  path: reportFile(p.project, module),
                  module: module ?? p.tr("report.project"),
                },
              })
            }
          />
        </div>
      </header>
      {view && (
        <>
          <div class="rcards">
            <div class="card rcard" data-testid="report-built">
              <div class="k">{p.tr("report.built")}</div>
              <div class="v">
                {module === null ? (
                  <>
                    {view.built.done}{" "}
                    <small class="muted">
                      {p.tr("report.ofWord")} <span data-testid="report-total">{p.total}</span>
                    </small>
                  </>
                ) : (
                  of(view.built.done, view.built.total)
                )}
              </div>
              {module === null && p.reportTotal !== undefined && (
                <div class="sub muted" data-testid="report-split">
                  {p.tr("report.split", {
                    spec: String(p.reportTotal),
                    changes: String(Math.max(0, p.total - p.reportTotal)),
                  })}
                </div>
              )}
            </div>
            <Card
              id="scenarios"
              label={p.tr("report.scenarios")}
              figure={view.scenarios}
              tr={p.tr}
              show={(v) => of(v.proven, v.total)}
            />
            <div class="card rcard" data-testid="report-coverage">
              <div class="k">{p.tr("report.coverage")}</div>
              <div
                data-testid="report-diff-coverage"
                data-measured={String(view.diffCoverage.measured)}
              >
                {view.diffCoverage.measured ? (
                  <div class="v">{pct(p.lang, view.diffCoverage.value)}</div>
                ) : (
                  <NotMeasured tr={p.tr} command={view.diffCoverage.command} />
                )}
                <div class="sub muted">{p.tr("report.diffCoverage.by")}</div>
              </div>
              <div
                class="rline"
                data-testid="report-line-coverage"
                data-measured={String(view.lineCoverage.measured)}
              >
                <span class="muted">{p.tr("report.lineCoverage.by")}: </span>
                {view.lineCoverage.measured ? (
                  <b>{pct(p.lang, view.lineCoverage.value)}</b>
                ) : (
                  <>
                    <span class="muted">{p.tr("report.notMeasured")}</span>
                    {view.lineCoverage.fix && (
                      <div class="sub muted rfix">{view.lineCoverage.fix}</div>
                    )}
                  </>
                )}
              </div>
            </div>
            <Card
              id="mutation"
              label={p.tr("report.mutation")}
              figure={view.mutation}
              tr={p.tr}
              show={(v) => pct(p.lang, v)}
            />
            <div class="card rcard" data-testid="report-agent">
              <div class="k">{p.tr("report.agent")}</div>
              <div data-testid="report-cost" data-measured={String(view.cost.measured)}>
                {view.cost.measured ? (
                  <Cost lang={p.lang} tr={p.tr} cost={view.cost.value} />
                ) : (
                  <NotMeasured tr={p.tr} command={view.cost.command} />
                )}
              </div>
              <div
                class="sub rtime"
                data-testid="report-time"
                data-measured={String(view.time.measured)}
              >
                {p.tr("report.time")}:{" "}
                {view.time.measured ? (
                  <b>{spent(view.time.value.ms)}</b>
                ) : (
                  <span class="muted">{p.tr("report.notMeasured")}</span>
                )}
              </div>
            </div>
          </div>
          <div class="rgrid">
            <Gate
              lang={p.lang}
              tr={p.tr}
              gate={view.gate}
              onCheck={p.onCheck}
              checking={p.checking}
            />
            <section class="card rmods" data-testid="report-modules">
              <div class="rsec">
                <h2>{p.tr("report.byModule")}</h2>
              </div>
              {view.modules.map((m) => {
                const full = m.built.total > 0 && m.built.done === m.built.total;
                return (
                  <button
                    type="button"
                    class="rmod"
                    key={m.name}
                    data-module-row={m.name}
                    aria-pressed={module === m.name}
                    onClick={() => setModule(module === m.name ? null : m.name)}
                  >
                    <span class="rmod-name">{m.name}</span>
                    <span class={`rmod-says ${m.waiting ? "warn" : ""}`}>
                      {m.built.done}/{m.built.total}
                      {m.waiting > 0
                        ? ` · ${p.tr("report.waits", { n: m.waiting })}`
                        : m.diffCoverage !== null
                          ? ` · ${p.tr("report.cov", { pct: pct(p.lang, m.diffCoverage) })}`
                          : ""}
                    </span>
                    <span class="bar">
                      <span
                        class={`fill ${full ? "ok" : m.waiting ? "warn" : ""}`}
                        style={{
                          width: `${m.built.total ? Math.max(2, (100 * m.built.done) / m.built.total) : 0}%`,
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </section>
          </div>
          <section class="card rmissing" data-testid="report-missing">
            <div class="rsec">
              <h2>{p.tr("report.missing")}</h2>
            </div>
            {view.missing.length === 0 && <p class="muted">{p.tr("report.missing.none")}</p>}
            {view.missing.slice(0, 8).map((m) => (
              <div class="rmiss" key={m.id} data-req={m.id}>
                <span class="mono rid">{m.id}</span>
                <span class="rmiss-t">{m.title}</span>
                <span class={`rmiss-why ${m.question ? "warn" : "bad"}`}>
                  {whyMissing(p.tr, m)}
                </span>
              </div>
            ))}
            {view.missing.length > 8 && (
              <p class="muted">{p.tr("report.missing.more", { n: view.missing.length - 8 })}</p>
            )}
          </section>
          <p class="muted rfoot">{p.tr("report.foot")}</p>
        </>
      )}
    </div>
  );
}

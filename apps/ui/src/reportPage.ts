import type { Figure, Lang, ReportView } from "@specgate-studio/protocol";
import {
  day,
  money,
  pct,
  spent,
  stageName,
  tokens,
  took,
  when,
  whyMissing,
} from "./views/Report.js";

type Tr = (k: string, v?: Record<string, string | number>) => string;

/** Text as HTML: nothing in it is read as markup. */
const esc = (t: string | number) =>
  String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** The file a report is saved as (draft-report A1): `sprich-report-pagos.html`, `sprich-report.html`. */
export function reportFile(project: string, module: string | null): string {
  const safe = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";
  return `${safe(project)}-report${module ? `-${safe(module)}` : ""}.html`;
}

/** Its styles, inside the page: system fonts, no address asked (REQ-133). */
const STYLE = `
:root{color-scheme:light;--t:#1d1b18;--m:#6b665e;--l:#e0dad0;--a:#d9480f;--ok:#1f8a57;--bad:#c62828;--w:#9a6b00}
*{box-sizing:border-box}
body{margin:0;padding:32px;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--t);background:#fff}
h1{font-size:26px;margin:0}
h2{font-size:15px;margin:0 0 8px}
.sub,.m{color:var(--m)}
.mono,code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
.cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:18px 0}
.card{border:1px solid var(--l);border-radius:6px;padding:12px 14px;break-inside:avoid}
.k{font-size:12px;color:var(--m)}
.v{font-size:22px;font-weight:700}
.v small{font-size:13px;font-weight:400;color:var(--m)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.st{display:grid;grid-template-columns:18px 140px 1fr;gap:4px 10px;padding:6px 0;border-top:1px solid var(--l);font-size:13px}
.passed{color:var(--ok)}.failed{color:var(--bad)}.not_configured{color:var(--w)}.not_run,.skipped{color:var(--m)}
.fx{grid-column:2/-1;color:var(--bad);font-size:12px}
.mod{padding:5px 0}
.mod .r{float:right;color:var(--m);font-size:12px}
.bar{height:6px;border-radius:9px;background:var(--l);margin-top:4px}
.bar i{display:block;height:6px;border-radius:9px;background:var(--a)}
.bar i.ok{background:var(--ok)}
.miss{display:grid;grid-template-columns:70px 1fr auto;gap:10px;padding:3px 0;font-size:13px}
.miss .id{color:var(--a)}
footer{margin-top:16px;font-size:12px;color:var(--m)}
@media (max-width:800px){.cards{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}}
@media print{body{padding:0}}
`;

/**
 * The report as one self-contained HTML page (draft-report REQ-133, A9): the
 * same data Report shows, in the studio's language — its styles inside it, no
 * script, no request to any address — so it opens offline anywhere.
 */
export function reportPage(
  view: ReportView,
  o: { project: string; lang: Lang; tr: Tr; at: Date },
): string {
  const { tr, lang } = o;
  const of = (n: number, total: number) =>
    `${esc(n)} <small>${esc(tr("report.ofTotal", { total }))}</small>`;
  const figure = <T>(f: Figure<T>, show: (v: T) => string) =>
    f.measured
      ? `<div class="v">${show(f.value)}</div>`
      : `<div class="v m">${esc(tr("report.notMeasured"))}</div><div class="sub">${esc(tr("report.measureWith"))} <code>${esc(f.command)}</code></div>`;
  const card = (label: string, body: string) =>
    `<div class="card"><div class="k">${esc(label)}</div>
${body}</div>`;
  const c = view.cost;
  const cost = !c.measured
    ? figure(c, () => "")
    : c.value.basis === "usage"
      ? `<div class="v">${esc(tr("report.tokens", { n: tokens(lang, c.value.tokens!) }))}</div><div class="sub">${esc(tr("report.cost.usage"))}</div>`
      : `<div class="v">${c.value.basis === "measured" ? "≈ " : ""}${esc(money(lang, c.value.total ?? 0))}</div><div class="sub">${esc(tr(`report.cost.${c.value.basis}`))}${c.value.profiles.length ? ` · ${esc(tr("report.cost.from", { profiles: c.value.profiles.join(", ") }))}` : ""}</div>${c.value.tokens ? `<div class="sub">${esc(tr("report.usage", { n: tokens(lang, c.value.tokens) }))}</div>` : ""}`;
  const time = view.time.measured
    ? `<div class="sub">${esc(tr("report.time"))}: <b>${esc(spent(view.time.value.ms))}</b></div>`
    : `<div class="sub">${esc(tr("report.time"))}: ${esc(tr("report.notMeasured"))}</div>`;
  const g = view.gate;
  const gate = g.ran
    ? `<h2>${esc(tr("report.gate"))} · <span class="${g.passed ? "passed" : "failed"}">${esc(tr(g.passed ? "report.gate.passed" : "report.gate.failed"))}</span></h2>
<div class="sub">${esc(tr("report.gate.when", { when: when(lang, g.at) }))}${g.branch ? ` · ${esc(g.branch)}` : ""}</div>
${g.stages
  .map(
    (s) =>
      `<div class="st"><span class="${s.result}">${{ passed: "✓", failed: "✗", not_configured: "!", not_run: "○", skipped: "·" }[s.result]}</span><b>${esc(stageName(tr, s))}</b><span>${esc(tr(`report.result.${s.result}`))}${s.command ? ` · <code>${esc(s.command)}</code>` : ""}${s.ms !== null ? ` <span class="m">· ${esc(took(lang, s.ms))}</span>` : ""}</span>${
        s.result === "failed"
          ? s.findings
              .filter((f) => f.severity === "error")
              .map(
                (f) =>
                  `<div class="fx"><code>${esc(f.code)}</code> ${esc(f.message)}${f.fix ? `<br>${esc(tr("notice.fix"))}: ${esc(f.fix)}` : ""}</div>`,
              )
              .join("")
          : ""
      }</div>`,
  )
  .join("\n")}`
    : `<h2>${esc(tr("report.gate"))}</h2><p class="m">${esc(tr("report.gate.none"))} <code>${esc(g.command)}</code></p>`;
  const modules = view.modules
    .map(
      (m) =>
        `<div class="mod">${esc(m.name)}<span class="r">${m.built.done}/${m.built.total}${m.waiting ? ` · ${esc(tr("report.waits", { n: m.waiting }))}` : m.diffCoverage !== null ? ` · ${esc(tr("report.cov", { pct: pct(lang, m.diffCoverage) }))}` : ""}</span><div class="bar"><i class="${m.built.done === m.built.total && m.built.total ? "ok" : ""}" style="width:${m.built.total ? Math.max(2, Math.round((100 * m.built.done) / m.built.total)) : 0}%"></i></div></div>`,
    )
    .join("\n");
  const missing = view.missing.length
    ? view.missing
        .map(
          (m) =>
            `<div class="miss"><span class="id mono">${esc(m.id)}</span><span>${esc(m.title)}</span><span class="m">${esc(whyMissing(tr, m))}</span></div>`,
        )
        .join("\n")
    : `<p class="m">${esc(tr("report.missing.none"))}</p>`;
  const title = `${tr("view.report")} — ${o.project}${view.module ? ` · ${view.module}` : ""}`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<header><h1>${esc(tr("view.report"))}</h1>
<div class="sub">${esc(o.project)}${view.module ? ` · <b>${esc(view.module)}</b>` : ""} · ${esc(day(lang, o.at))} · ${esc(tr("report.subtitle"))}</div></header>
<section class="cards">
${card(tr("report.built"), `<div class="v">${of(view.built.done, view.built.total)}</div>`)}
${card(
  tr("report.scenarios"),
  figure(view.scenarios, (v) => of(v.proven, v.total)),
)}
${card(
  tr("report.coverage"),
  `${figure(view.diffCoverage, (v) => esc(pct(lang, v)))}<div class="sub">${esc(tr("report.diffCoverage.by"))}</div><div class="sub">${esc(tr("report.lineCoverage.by"))}: ${view.lineCoverage.measured ? `<b>${esc(pct(lang, view.lineCoverage.value))}</b>` : esc(tr("report.notMeasured"))}</div>`,
)}
${card(
  tr("report.mutation"),
  figure(view.mutation, (v) => esc(pct(lang, v))),
)}
${card(tr("report.agent"), cost + time)}
</section>
<section class="grid">
<div class="card">${gate}</div>
<div class="card"><h2>${esc(tr("report.byModule"))}</h2>
${modules}</div>
</section>
<section class="card" style="margin-top:10px"><h2>${esc(tr("report.missing"))}</h2>
${missing}</section>
<footer>${esc(tr("report.foot"))}</footer>
</body>
</html>
`;
}

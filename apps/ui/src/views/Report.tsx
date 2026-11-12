import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Figure, Lang, ReportView } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";

type Tr = (k: string, v?: Record<string, string | number>) => string;

/** A percentage in the studio's language: "74 %", "61,5 %". */
function pct(lang: Lang, n: number): string {
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(n)} %`;
}

/** A cost: "$1.23" in English, "1,23 $" in Spanish. */
function money(lang: Lang, n: number): string {
  return new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

/** The time spent building: "1 h 5 min", "30 min", "< 1 min". */
function spent(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "< 1 min";
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
}

/** One figure: its value, or not measured with the command that measures it (A5) — never 0. */
function Measure<T>(p: {
  id: string;
  label: string;
  figure: Figure<T>;
  tr: Tr;
  show: (v: T) => string;
  sub?: (v: T) => ComponentChildren;
  by?: string;
}) {
  const f = p.figure;
  return (
    <div class="card" data-testid={`report-${p.id}`} data-measured={String(f.measured)}>
      <div class="k">{p.label}</div>
      {f.measured ? (
        <>
          <div class="v">{p.show(f.value)}</div>
          {p.by && <div class="sub muted">{p.by}</div>}
          {p.sub?.(f.value)}
        </>
      ) : (
        <>
          <div class="v muted">{p.tr("report.notMeasured")}</div>
          {p.by && <div class="sub muted">{p.by}</div>}
          <div class="sub muted">
            {p.tr("report.measureWith")} <code class="mono">{f.command}</code>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Report (draft-report REQ-131): for the whole project or a module chosen,
 * built of the total, scenarios proven, the two coverages, labelled, the
 * mutation score, the cost — measured or estimated, labelled — and the time.
 * The host reads them from specgate's JSON; this only words them.
 */
export function Report(p: {
  rpc: Rpc;
  lang: Lang;
  tr: Tr;
  /** What Home counts, open changes included, and `report --json`'s total. */
  total: number;
  reportTotal: number | undefined;
}) {
  const [module, setModule] = useState<string | null>(null);
  const [view, setView] = useState<ReportView | null>(null);
  const asked = useRef(0);
  useEffect(() => {
    const n = ++asked.current;
    p.rpc.ask("report.get", { module }).then(
      (v) => n === asked.current && setView(v),
      () => undefined,
    );
  }, [p.rpc, module, p.total]);

  const of = (n: number, total: number) => p.tr("report.of", { n, total });
  return (
    <div class="report">
      <h1>{p.tr("view.report")}</h1>
      <div class="cards">
        <div class="card">
          <div class="k">{p.tr("home.requirements")}</div>
          {/* The same count as Home: `report --json`'s total leaves out open changes. */}
          <div class="v" data-testid="report-total">
            {p.total}
          </div>
          {p.reportTotal !== undefined && (
            <div class="muted" data-testid="report-split">
              {p.tr("report.split", {
                spec: String(p.reportTotal),
                changes: String(Math.max(0, p.total - p.reportTotal)),
              })}
            </div>
          )}
        </div>
      </div>
      {view && (
        <>
          <label class="report-module">
            <span class="muted">{p.tr("report.module")}</span>{" "}
            <select
              data-testid="report-module"
              value={module ?? ""}
              onChange={(e) => setModule((e.target as HTMLSelectElement).value || null)}
            >
              <option value="">{p.tr("report.project")}</option>
              {view.modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <div class="cards" data-module={view.module ?? ""}>
            <div class="card" data-testid="report-built">
              <div class="k">{p.tr("report.built")}</div>
              <div class="v">{of(view.built.done, view.built.total)}</div>
            </div>
            <Measure
              id="scenarios"
              label={p.tr("report.scenarios")}
              figure={view.scenarios}
              tr={p.tr}
              show={(v) => of(v.proven, v.total)}
            />
            <Measure
              id="diff-coverage"
              label={p.tr("report.diffCoverage")}
              by={p.tr("report.diffCoverage.by")}
              figure={view.diffCoverage}
              tr={p.tr}
              show={(v) => pct(p.lang, v)}
            />
            <Measure
              id="line-coverage"
              label={p.tr("report.lineCoverage")}
              by={p.tr("report.lineCoverage.by")}
              figure={view.lineCoverage}
              tr={p.tr}
              show={(v) => pct(p.lang, v)}
            />
            <Measure
              id="mutation"
              label={p.tr("report.mutation")}
              figure={view.mutation}
              tr={p.tr}
              show={(v) => pct(p.lang, v)}
            />
            <Measure
              id="cost"
              label={p.tr("report.cost")}
              figure={view.cost}
              tr={p.tr}
              show={(v) => money(p.lang, v.total)}
              sub={(v) => (
                <div class="sub muted" data-basis={v.basis}>
                  {p.tr(`report.cost.${v.basis}`)}
                  {v.profiles.length > 0 &&
                    ` · ${p.tr("report.cost.from", { profiles: v.profiles.join(", ") })}`}
                </div>
              )}
            />
            <Measure
              id="time"
              label={p.tr("report.time")}
              figure={view.time}
              tr={p.tr}
              show={(v) => spent(v.ms)}
            />
          </div>
        </>
      )}
    </div>
  );
}

import type { Finding } from "@specgate-studio/protocol";
import type { Lang } from "../i18n.js";
import { HelpButton } from "../Help.js";
import { bt } from "./briefText.js";

/** One finding: its severity, code, message, fix and the file it points at. */
function Row(p: { lang: Lang; f: Finding; onOpen: (path: string) => void }) {
  const f = p.f;
  return (
    <li
      data-code={f.code}
      data-line={f.line ?? ""}
      data-severity={f.severity}
      data-source={f.source ?? "brief"}
    >
      <span class={`sev ${f.severity}`}>{f.severity}</span>
      <b class="mono">{f.code}</b>
      <span>{f.message}</span>
      {f.fix && (
        <span class="muted">
          {bt(p.lang, "problems.fix")}: {f.fix}
        </span>
      )}
      {f.file && (
        <button type="button" class="loc mono" onClick={() => p.onOpen(f.file!)}>
          {f.line ? `${f.file}:${f.line}` : f.file}
        </button>
      )}
    </li>
  );
}

/**
 * The bottom panel's Problems (draft-brief REQ-072, specgate-1-4-gate
 * REQ-224, REQ-225): the brief's last check, then the gate's last run — what
 * fails, then, rule by rule, what the gate's policy reports without failing,
 * with specgate's reason and fix. This lists what the host says it found.
 */
export function Problems(p: {
  lang: Lang;
  findings: Finding[];
  onOpen: (path: string) => void;
  onHelp: () => void;
}) {
  const brief = p.findings.filter((f) => f.source !== "gate");
  const gate = p.findings.filter((f) => f.source === "gate" && !f.reported);
  const rules = [...new Set(p.findings.flatMap((f) => (f.reported ? [f.reported.rule] : [])))];
  const ofRule = (rule: string) => p.findings.filter((f) => f.reported?.rule === rule);
  const rows = (list: Finding[]) => (
    <ul>
      {list.map((f, i) => (
        <Row key={`${f.code}:${f.line ?? ""}:${i}`} lang={p.lang} f={f} onOpen={p.onOpen} />
      ))}
    </ul>
  );
  return (
    <div class="problems">
      <div class="problems-head">
        <span class="muted">{bt(p.lang, "problems.feature")}</span>
        <HelpButton label={bt(p.lang, "problems.help")} onOpen={p.onHelp} />
      </div>
      {p.findings.length === 0 ? (
        <p class="muted" data-empty style="margin:4px 0">
          {bt(p.lang, "problems.none")}
        </p>
      ) : (
        <>
          {brief.length > 0 && rows(brief)}
          {gate.length > 0 && (
            <section class="problems-group" data-group="gate">
              <h3 class="muted">{bt(p.lang, "problems.gate")}</h3>
              {rows(gate)}
            </section>
          )}
          {rules.map((rule) => {
            const first = ofRule(rule)[0]!.reported!;
            return (
              <section class="problems-group" data-group="reported" data-rule={rule} key={rule}>
                <h3>
                  {bt(p.lang, "problems.reported")} · <b class="mono">{rule}</b>
                </h3>
                <p class="muted" data-reason>
                  {first.reason}
                  {first.fix && (
                    <>
                      {" "}
                      · {bt(p.lang, "problems.fix")}: {first.fix}
                    </>
                  )}
                </p>
                {rows(ofRule(rule))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

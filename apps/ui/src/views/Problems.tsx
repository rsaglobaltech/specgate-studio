import type { Finding } from "@specgate-studio/protocol";
import type { Lang } from "../i18n.js";
import { HelpButton } from "../Help.js";
import { bt } from "./briefText.js";

/**
 * The bottom panel's Problems (draft-brief REQ-072): each finding of the
 * brief's last check with its code, message, fix and the line it points at.
 * The check runs on every save; this lists what the host says it found.
 */
export function Problems(p: {
  lang: Lang;
  findings: Finding[];
  onOpen: (path: string) => void;
  onHelp: () => void;
}) {
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
        <ul>
          {p.findings.map((f, i) => (
            <li
              key={`${f.code}:${f.line ?? ""}:${i}`}
              data-code={f.code}
              data-line={f.line ?? ""}
              data-severity={f.severity}
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
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import type { ActionId, Explanation, Lang } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";

/** The catalog's areas, as the palette groups them; the Explorer's actions apart (A27). */
const AREA_OF: Record<string, "spec" | "build" | "project" | "files"> = {
  propose: "spec",
  "propose-brief": "spec",
  "propose-ticket": "spec",
  "draft-modules": "spec",
  "brief-check": "spec",
  answer: "spec",
  "answer-reviewed": "spec",
  "ask-change": "spec",
  archive: "spec",
  "archive-preview": "spec",
  check: "build",
  build: "build",
  apply: "build",
  doctor: "build",
  "build-commit": "build",
  "build-stash": "build",
  "build-ignore": "build",
  "build-stop-after": "build",
  "build-stop-now": "build",
  init: "project",
  adopt: "project",
  "agents-init": "project",
  "ci-init": "project",
  "config-set": "project",
  "settings-user": "project",
};
const AREAS = ["spec", "build", "project", "files"] as const;

/** Without case or accents: "archivar" finds "Archivar", "construcción" finds "construccion". */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * The Help view (draft-design-conformance REQ-179, A27): every feature's "?"
 * from the help catalog, grouped by area, searchable by its title, command
 * and text, in the studio's language.
 */
export function HelpView(p: {
  rpc: Rpc;
  lang: Lang;
  tr: (k: string, v?: Record<string, string | number>) => string;
}) {
  const [catalog, setCatalog] = useState<{
    labels: Record<keyof Explanation, string>;
    actions: Array<{ action: ActionId; explanation: Explanation }>;
  } | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let live = true;
    p.rpc.ask("help.catalog", { lang: p.lang }).then(
      (c) => live && setCatalog(c),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [p.rpc, p.lang]);
  const q = fold(query.trim());
  const shown = (catalog?.actions ?? []).filter(
    (a) =>
      !q ||
      [p.tr(`action.${a.action}`), ...Object.values(a.explanation)].some((t) =>
        fold(t).includes(q),
      ),
  );
  return (
    <div class="helpview">
      <h1>{p.tr("view.help")}</h1>
      <p class="muted">{p.tr("helpview.intro")}</p>
      <input
        class="filter helpsearch"
        value={query}
        placeholder={p.tr("helpview.search")}
        aria-label={p.tr("helpview.search")}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      {catalog && shown.length === 0 && <p class="muted">{p.tr("helpview.none")}</p>}
      {AREAS.map((area) => {
        const these = shown.filter((a) => (AREA_OF[a.action] ?? "files") === area);
        if (these.length === 0) return null;
        return (
          <section class="harea" key={area} data-area={area}>
            <div class="sgroup">{p.tr(`helpview.area.${area}`)}</div>
            {these.map((a) => (
              <article class="card hentry" key={a.action} data-action={a.action}>
                <div class="eyebrow mono">[ {p.tr("help.eyebrow")} ]</div>
                <h2 class="syne">{p.tr(`action.${a.action}`)}</h2>
                <dl>
                  {(["does", "command", "files", "doesNot", "next"] as const).map((part) => (
                    <div key={part} data-part={part}>
                      <dt>{catalog!.labels[part]}</dt>
                      <dd class={part === "command" ? "mono" : ""}>{a.explanation[part]}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

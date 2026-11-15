import { useEffect, useState } from "preact/hooks";
import type { WorkspaceRepo, WorkspaceView } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";

type Tr = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Home of a specgate 1.0 workspace repository (workspace-repos REQ-218): its
 * repositories as `workspace status --json` counts them, each opened in a host
 * of its own; one not cloned beside it says where to clone it from.
 */
export function WorkspaceHome(p: { rpc: Rpc; tr: Tr; folder: string }) {
  const [view, setView] = useState<WorkspaceView | null | undefined>(undefined);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    p.rpc.ask("workspace.repos", {}).then(
      (v) => live && setView(v),
      () => live && setView(null),
    );
    return () => {
      live = false;
    };
  }, [p.rpc]);

  const open = async (repo: WorkspaceRepo) => {
    setFailed(null);
    try {
      const { url } = await p.rpc.ask("recent.open", { path: repo.dir });
      location.href = url.replace(/^ws/, "http");
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <h1>{view?.name || p.folder}</h1>
      <p class="muted" data-testid="workspace-kind">
        {p.tr("workspace.kind", { n: view?.repos.length ?? 0, stories: view?.stories ?? 0 })}
      </p>
      {view === null && <p class="muted">{p.tr("workspace.unreadable")}</p>}
      {failed && (
        <p class="muted" role="alert">
          {failed}
        </p>
      )}
      <div class="cards">
        {(view?.repos ?? []).map((r) => (
          <div class="card" key={r.name} data-repo={r.name}>
            <div class="k mono">
              {r.name} · {r.role}
            </div>
            <div class="v">
              {r.requirements
                ? p.tr("workspace.done", { done: r.requirements.done, total: r.requirements.total })
                : "—"}
            </div>
            <div class="sub muted">
              {[
                r.branch ? `⎇ ${r.branch}` : null,
                r.gate ? p.tr("workspace.gate", { state: r.gate }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {r.exists ? (
              <button
                type="button"
                class="btn pri"
                data-action="open-repo"
                onClick={() => void open(r)}
              >
                {p.tr("workspace.open", { name: r.name })}
              </button>
            ) : (
              <div class="sub" data-testid="repo-missing">
                <span class="muted">{p.tr("workspace.missing", { path: r.path })}</span>
                {r.url && <div class="mono">{`git clone ${r.url} ${r.path}`}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

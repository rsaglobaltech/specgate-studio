import { useEffect, useState } from "preact/hooks";
import type { Rpc } from "./rpc.js";
import { HelpButton, type HelpRequest } from "./Help.js";

type Tr = (key: string, vars?: Record<string, string | number>) => string;

/**
 * No folder open (draft-workbench-v2 REQ-185): "No folder opened", a line
 * that explains it, Open Folder and Clone Repository, each with its "?".
 */
export function NoFolderPanel(props: {
  tr: Tr;
  onOpen: () => void;
  onClone: () => void;
  onHelp: (r: HelpRequest) => void;
}) {
  const { tr } = props;
  return (
    <div class="nofolder" data-testid="no-folder">
      <p>{tr("nofolder.body")}</p>
      <div class="nf-act">
        <button type="button" class="btn pri" data-act="folder-open" onClick={props.onOpen}>
          {tr("nofolder.open")}
        </button>
        <HelpButton
          label={tr("help.title", { feature: tr("nofolder.open") })}
          onOpen={() => props.onHelp({ action: "folder-open", feature: tr("nofolder.open") })}
        />
      </div>
      <p>{tr("nofolder.cloneLine")}</p>
      <div class="nf-act">
        <button type="button" class="btn" data-act="folder-clone" onClick={props.onClone}>
          {tr("nofolder.clone")}
        </button>
        <HelpButton
          label={tr("help.title", { feature: tr("nofolder.clone") })}
          onOpen={() => props.onHelp({ action: "folder-clone", feature: tr("nofolder.clone") })}
        />
      </div>
    </div>
  );
}

/** The folders inside one, walked from the Developer's home (REQ-185). */
function Browser(props: { rpc: Rpc; tr: Tr; onPath: (path: string) => void }) {
  const [at, setAt] = useState<{ path: string; parent: string | null; folders: string[] } | null>(
    null,
  );
  const go = (path?: string) =>
    void props.rpc.ask("folder.browse", path ? { path } : {}).then((r) => {
      setAt(r);
      props.onPath(r.path);
    });
  useEffect(() => go(), []);
  if (!at) return <div class="chooser-list" />;
  const sep = at.path.includes("\\") && !at.path.includes("/") ? "\\" : "/";
  return (
    <div class="chooser">
      <div class="chooser-bar">
        <button
          type="button"
          class="btn"
          disabled={!at.parent}
          onClick={() => at.parent && go(at.parent)}
        >
          ↑ {props.tr("chooser.up")}
        </button>
        <span class="mono chooser-path" data-testid="chooser-path" title={at.path}>
          {at.path}
        </span>
      </div>
      <div class="chooser-list" role="listbox" aria-label={at.path}>
        {at.folders.length === 0 && <p class="muted">{props.tr("chooser.empty")}</p>}
        {at.folders.map((f) => (
          <button
            type="button"
            role="option"
            class="chooser-row"
            key={f}
            data-folder={f}
            onClick={() => go(at.path.endsWith(sep) ? at.path + f : at.path + sep + f)}
          >
            <span class="ficon-dir" aria-hidden="true">
              ▸
            </span>
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Open Folder's chooser: the folder shown is the one opened (REQ-185). */
export function FolderChooser(props: {
  rpc: Rpc;
  tr: Tr;
  onCancel: () => void;
  onChoose: (path: string) => void;
}) {
  const [path, setPath] = useState("");
  return (
    <div class="scrim">
      <div
        class="help chooser-dialog"
        role="dialog"
        aria-label={props.tr("nofolder.open")}
        data-testid="folder-chooser"
      >
        <h2>{props.tr("nofolder.open")}</h2>
        <Browser rpc={props.rpc} tr={props.tr} onPath={setPath} />
        <div class="actions">
          <button
            type="button"
            class="btn pri"
            data-testid="chooser-ok"
            disabled={!path}
            onClick={() => props.onChoose(path)}
          >
            {props.tr("chooser.ok")}
          </button>
          <button type="button" class="btn" onClick={props.onCancel}>
            {props.tr("chooser.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Clone Repository: the repository and the folder it is cloned inside (REQ-185, A33). */
export function CloneDialog(props: {
  rpc: Rpc;
  tr: Tr;
  onCancel: () => void;
  onClone: (repo: string, parent: string) => void;
}) {
  const [repo, setRepo] = useState("");
  const [parent, setParent] = useState("");
  // Where it lands: the chosen folder and the repository's name (A33).
  const name =
    repo
      .trim()
      .replace(/\/+$/, "")
      .split(/[/:]/)
      .pop()
      ?.replace(/\.git$/, "") ?? "";
  return (
    <div class="scrim">
      <div
        class="help chooser-dialog"
        role="dialog"
        aria-label={props.tr("nofolder.clone")}
        data-testid="clone-dialog"
      >
        <h2>{props.tr("nofolder.clone")}</h2>
        <label class="clone-label">
          {props.tr("clone.repo")}
          <input
            class="filter mono"
            data-testid="clone-repo"
            value={repo}
            placeholder="owner/name"
            onInput={(e) => setRepo((e.target as HTMLInputElement).value)}
          />
        </label>
        <p class="clone-label">{props.tr("clone.into")}</p>
        <Browser rpc={props.rpc} tr={props.tr} onPath={setParent} />
        {name && parent && (
          <p class="clone-dest mono" data-testid="clone-dest">
            → {parent}
            {parent.includes("\\") && !parent.includes("/") ? "\\" : "/"}
            {name}
          </p>
        )}
        <div class="actions">
          <button
            type="button"
            class="btn pri"
            data-testid="clone-ok"
            disabled={!repo.trim() || !parent}
            onClick={() => props.onClone(repo.trim(), parent)}
          >
            {props.tr("clone.ok")}
          </button>
          <button type="button" class="btn" onClick={props.onCancel}>
            {props.tr("chooser.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

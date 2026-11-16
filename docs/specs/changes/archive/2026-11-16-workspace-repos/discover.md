# Proposal: workspace-repos

## Intent

specgate 1.0 gives a product made of several repositories one workspace repository: `specgate.workspace.yaml` names the repositories, and `specgate workspace status --json` says how far each has got. The studio took such a folder for code with no specgate project and offered to adopt it — writing a spec into the one repository that must not hold one — and had no way to reach the repositories it names.

## Scope

In scope:

- REQ-218: a folder holding `specgate.workspace.yaml` and no `docs/specs/traceability.md` opens as a workspace, not as a folder to adopt; its Home lists each repository from `workspace status --json` — its role, its requirements done of its total, its branch and its last gate — with "Open <repo>", which opens it in a host of its own; a repository not there says where to clone it from.

Out of scope:

- The workspace's stories, its cross-repository check and its live view: specgate's `workspace` commands in the terminal, as today.
- Cloning a missing repository from the studio.

## Approach

`folderKind` gains `workspace`, decided from the folder's top-level entries; `setupStep` offers nothing for it. The host answers `workspace.repos` with `workspaceOf(workspace status --json)`, each repository's folder resolved from the workspace's. The UI's Home shows `WorkspaceHome` for that kind; "Open" is the existing `recent.open`.

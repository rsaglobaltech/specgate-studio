# Design: workspace-repos

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

`folderKind` gains `workspace`, decided from the folder's top-level entries; `setupStep` offers nothing for it. The host answers `workspace.repos` with `workspaceOf(workspace status --json)`, each repository's folder resolved from the workspace's. The UI's Home shows `WorkspaceHome` for that kind; "Open" is the existing `recent.open`.

## Channels

<!-- APIs, events, queues. -->

## Decisions


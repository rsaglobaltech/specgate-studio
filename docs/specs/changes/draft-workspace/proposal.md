# Proposal: draft-workspace

## Intent

The workspace module of the brief (`docs/brief.md`): the open project — what
kind of folder it is, the files the studio watches and the ones it ignores,
its git branch with the team and ticket it names, its uncommitted files
grouped by folder, and the Developer's recent projects.

## Scope

In scope: REQ-021 … REQ-026.

Out of scope: every other module of the brief — the host and its cache
(core-host), the frame that shows these (workbench), editing files (editor),
the terminal (terminal).

## Approach

The core gets three ports — file system, git, watcher — and stays free of
Node (ADR-0001); Node adapters implement them for the host, with paths kept
with `/` on every system. The watcher filters the ignored folders before it
reports anything, so a dependency install or a build never reaches the core.
Open question Q1 decides whether several projects open at once; REQ-026 waits
for it.

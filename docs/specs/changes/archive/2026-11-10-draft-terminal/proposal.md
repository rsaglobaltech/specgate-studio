# Proposal: draft-terminal

## Intent

The terminal module of the brief (`docs/brief.md`): a real terminal inside the
studio. The Developer opens as many terminals as they like, each a pty with
their own shell in the project's folder, on macOS, Windows and Linux; every
command the studio runs is echoed with the button that started it, so nothing
happens out of sight; each terminal keeps its scrollback.

## Scope

In scope: REQ-051 … REQ-056.

Out of scope: the bottom panel's other tabs and the status bar (workbench);
running commands and their events (core-host, REQ-005, REQ-007); the desktop
app's packaging (phase 3).

## Approach

A `PtyPort` in the core, with an adapter in the host (Q1: node-pty for the
desktop sidecar and the browser alike, recommended); xterm.js in the UI, one
instance per terminal, kept alive while hidden so its scrollback stays. The
studio's own commands never go through a pty: they run as argument arrays in
the host (REQ-007), and their command events (REQ-005) are drawn in a
read-only terminal, "specgate".

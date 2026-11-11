# Proposal: draft-settings

## Intent

Phase 3 of the studio: one place for every setting. Today the workbench opens
Settings for the language and the theme only (draft-workbench REQ-034), and a
project setting such as the test command is changed by hand in
`harness.config.yaml` or with `specgate config set` in a terminal.

## Scope

In scope (docs/briefs/phase-3-proof-and-desktop.md, module settings):

- A settings editor with search and two scopes, project and user (REQ-141).
- Each project setting names its `specgate config set` command and file, and is
  saved only through it (REQ-142).
- The nine sections: agents and profiles, preferences, agent guards, quality,
  ALM, editor, terminal, shortcuts, appearance (REQ-143) — waiting for Q1.

Out of scope:

- Storing any credential: ALM and agent tokens stay in the environment.
- Installing the agent guards globally (`specgate agents install --global`):
  shown as the command, not run from Settings.

## Approach

Project settings are read and saved through `SpecgatePort` (`specgate config
get|set --json`); user settings in the studio's own `settings.json` in the
user's configuration folder, per operating system. specgate 0.33.2 does not say
in JSON where a key is kept, nor offers keys for profiles, quality or ALM: both
are asked of specgate (A6, A7, Q1).

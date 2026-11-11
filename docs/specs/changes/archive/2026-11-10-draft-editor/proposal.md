# Proposal: draft-editor

## Intent

The editor module of the brief (`docs/brief.md`), written down as requirements
and scenarios a person can review before anything is built: editing the
specification as code, with the editor loaded only when the first file opens,
the specgate actions above each requirement, the findings underlined where they
are with their fix, the questions that block a requirement answered inline by
the Reviewer, and nothing written but the file the person saves.

## Scope

In scope: what the brief says about editor (REQ-041 … REQ-045).

Out of scope: every other module of the brief. What Build, Trace and Ask for a
change do is phase 2 (build-live, traceability, changes); the "?" text and the
notices are help; the terminal that echoes Check is terminal; the frame, tabs
and Problems panel are workbench; reading specgate's findings and questions is
specgate-port.

## Approach

A UI package over the core host (ADR-0001): the editor is a lazy chunk loaded on
the first `file.open`; code lenses, underlines and inline questions are
decorations computed from the host's state (findings with file and line from
`check --json` and the brief check, questions with what they block from
`questions --json`). Actions and answers go through the host's `command.run`,
so every write is a specgate command the person started; saving is the only
write the editor does itself. Monaco or CodeMirror 6 is Q1.

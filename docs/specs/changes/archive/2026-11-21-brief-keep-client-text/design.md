# Design: brief-keep-client-text

- `Brief` keeps the pasted text with its proposal (`this.client`), dropped on
  Discard or once accepted.
- A pure domain function `withClientText(brief, text)` in
  `packages/core/src/domain/briefForm.ts` answers the new `docs/brief.md`:
  the front matter untouched, the body the text (no body) or body + blank
  line + text; unchanged when the body already holds the text (compared
  with line endings and outer blank lines normalised).
- On Accept, after specgate writes the form (`--form`), the core reads
  `docs/brief.md`, and writes `withClientText(...)` through the host's
  project files port — only when it differs — and the brief is checked again
  as after any save (REQ-072). specgate's form writer has no body field, so
  the studio writes the body, the one file the person accepted.
- AC-1, AC-2 → SCN-1016; AC-3 → SCN-1017.

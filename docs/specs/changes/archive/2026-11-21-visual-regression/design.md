# Design: visual-regression

> Owner: architect — how the system meets the Discover.

## Modules

- `apps/cli/test/visual.ts`: `settle()` (the page made the same on every run),
  `comparePng()` (two PNGs compared in Chromium, on a canvas — no image
  library added), `judge()` (same, changed, missing, written, resized),
  `failureOf()` and `expectScreen()`.
- `apps/cli/test/visual-compare.e2e.test.ts`: the comparison on images drawn
  from flat blocks, the same on every system — runs on all three.
- `apps/cli/test/visual.e2e.test.ts`: the key screens.
- `apps/cli/test/support.ts`: `open(…, { clock })` holds the page's clock.
- `apps/cli/test/visual/<platform>/*.png`: the references.
- `.github/workflows/spec-gate.yml`: uploads `apps/cli/test-results/visual/`
  as the `visual` artifact when the gate fails on Linux.

## Mechanisms

- AC-1 — one reference per screen and platform: fonts are drawn differently by
  each system. Linux is compared on CI; a Developer's Mac locally (the macOS
  runner draws unlike a desktop Mac); Windows not at all.
- AC-2 — a pixel differs when red, green or blue differs by more than 24; a
  screen fails beyond 0.2 % of its pixels (about 2 600 of 1440×900: less
  than a line of text).
- AC-3 — `test-results/visual/<platform>/<name>.actual.png` and `.diff.png`.
- AC-4 — `STUDIO_VISUAL_UPDATE=1 npm test`.
- AC-5 — `CI` set: a missing reference fails; unset: it is written.
- AC-6 — animations, transitions and the caret off; fonts loaded; the clock
  held at 2026-11-21 09:00 UTC; the panel's shell and folder and the status
  bar's branch covered with a flat block; Claude Code on the PATH for the
  setup screens.

## Decisions

- No image library: Chromium, already there for the end-to-end tests,
  decodes and compares the PNGs.
- Not `@playwright/test`'s `toHaveScreenshot`: the tests run on `node:test`,
  and its runner is not used here.
- The Linux references come from CI's own runner (its `visual` artifact),
  not from a container: a container's fonts would draw unlike the runner's.

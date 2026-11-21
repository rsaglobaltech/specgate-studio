# Delta — visual-regression

## ADDED Requirements

### Requirement: REQ-231 — Each key screen kept as a reference image; a screen that changes fails the tests

<!-- specgate:trace status=Implemented actor=Developer kind=non-functional -->

The system SHALL keep, for each key screen of the studio — sprich's Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability, Report, Help and Settings; sprich's Home in Spanish and in the light theme; an empty folder's Home; a project just adopted with its code; and the readiness list of one adopted with none — a reference image at 1440×900 per operating system under `apps/cli/test/visual/<platform>/`, each taken with animations, transitions and the caret off, the fonts loaded, the page's clock held at one time, and what changes between runs (the shell and its folder, the git branch) covered with a flat block; SHALL fail the tests when a screen differs from its reference in more than 0.2 % of its pixels, a pixel differing when its red, green or blue differs by more than 24, writing the screen as it is now and an image of its differences in red under `apps/cli/test-results/visual/`; SHALL write a reference that is missing on a Developer's machine and fail on CI, with the screen it took uploaded as the `visual` artifact; SHALL rewrite every reference when `STUDIO_VISUAL_UPDATE=1` is set; and SHALL compare on Linux on CI and on a Developer's Mac, not on Windows.

> The end-to-end tests read the DOM: a wrong title, a line flush against a card and demo text in a real project passed them (seen in the screenshots of specgate-1-4-setup).

#### Scenario: SCN-1008 — Nothing changed, on Linux CI

- GIVEN the references of the key screens on Linux
- WHEN the gate runs the tests on a pull request that does not change the UI
- THEN every screen matches its reference and the tests pass

#### Scenario: SCN-1009 — A line moved 8 px, on the Developer's Mac

- GIVEN the reference of shop's just-adopted Home
- WHEN the line about REQ-001 moves 8 px down and the tests run
- THEN the test of that screen fails saying the share of pixels that differ, and `test-results/visual/darwin/` holds the screen as it is now and its differences in red; the reference is unchanged

#### Scenario: SCN-1010 — An intended change, references rewritten

- GIVEN a margin changed on purpose
- WHEN the Developer runs `STUDIO_VISUAL_UPDATE=1 npm test`
- THEN the references are rewritten, the new images show in the pull request's diff, and the tests pass again

#### Scenario: SCN-1011 — A new screen with no reference, on CI

- GIVEN a key screen added with no Linux reference
- WHEN the gate runs on CI
- THEN the test fails saying there is no reference, and the screen it took is uploaded as the `visual` artifact to be reviewed and committed

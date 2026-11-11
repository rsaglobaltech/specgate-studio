Feature: A folder with code: adopted in place after a preview

  @REQ-112 @SCN-333
  Scenario: The preview of shop's adoption on the desktop
    Given the desktop app opened on `~/projects/shop`, a Node.js project with code and no specgate files
    When the Developer opens Adopt
    Then the Developer sees the files `specgate adopt --dry-run` lists — `spec.md`, `AGENTS.md`, `features/adoption/baseline.feature`, `docs/specs/traceability.md` — and no file of shop has been written

  @REQ-112 @SCN-334
  Scenario: shop adopted in the browser, its code untouched
    Given shop open in the browser, its adoption previewed
    When the Developer confirms the adoption
    Then `specgate adopt` runs in `~/projects/shop`, the files of the preview exist, and every file shop had before is byte for byte the same

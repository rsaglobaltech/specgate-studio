Feature: The spec's sections above the file tree: the spec, and its modules and requirements

  @REQ-169 @SCN-502
  Scenario: sprich's spec above its files, on the desktop
    Given sprich in the desktop app, with draft-pedidos open and two questions in it, 4 capabilities, and the module pedidos with REQ-031 waiting for an answer
    When the Developer chooses Explorer in the activity bar
    Then the Developer sees "SPEC EXPLORER" with `spec.md`, `docs/brief.md`, draft-pedidos with "2 questions", "capabilities (4)"; below it "MODULES · REQUIREMENTS" with pedidos and REQ-031 with an amber dot; and below both the file tree

  @REQ-169 @SCN-503
  Scenario: A requirement opened from its module, in the browser
    Given sprich in the browser, the Explorer's "MODULES · REQUIREMENTS" showing pedidos open
    When the Developer chooses REQ-031
    Then the Developer sees the file of REQ-031 open in the editor at its heading, and REQ-031 the current row with the orange inset

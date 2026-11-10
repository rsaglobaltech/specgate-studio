Feature: Findings underlined where they are, with their fix

  @REQ-043 @SCN-125
  Scenario: REQ-031's "until it is shipped" on the desktop
    Given sprich's draft-pedidos, whose open question Q2 blocks REQ-031, and REQ-031's text says "until it is shipped"
    When the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` in the desktop app
    Then the words "until it is shipped" in REQ-031 are underlined, and the underline says that Q2 is open, with the fix `specgate answer Q2 "…" --change draft-pedidos`

  @REQ-043 @SCN-126
  Scenario: A gate finding at its line, in the browser
    Given the last `specgate check` of sprich reported a finding with the code `D6_unlisted_value`, the file `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` and a line
    When the Developer opens that file in the browser
    Then that line is underlined, and the underline shows `D6_unlisted_value`, the finding's message and its fix

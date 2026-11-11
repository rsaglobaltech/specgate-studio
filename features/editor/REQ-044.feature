Feature: A blocking question inline under its requirement, for the Reviewer

  @REQ-044 @SCN-127
  Scenario: Q2 under REQ-031 on the desktop
    Given sprich's draft-pedidos, whose open question Q2 blocks REQ-031
    When the Reviewer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` in the desktop app
    Then under REQ-031 the Reviewer sees Q2's text, the options its `questions.md` lists, and a place to answer it

  @REQ-044 @SCN-128
  Scenario: Q2 answered from the browser
    Given the browser with that file open and Q2 shown under REQ-031
    When the Reviewer chooses the option "until it is shipped" and confirms
    Then the studio runs `specgate answer Q2 "until it is shipped" --change draft-pedidos`, the notice names that command and the file it wrote, and Q2 no longer shows under REQ-031

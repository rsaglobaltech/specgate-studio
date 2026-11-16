Feature: Build waits on uncommitted work and offers commit, stash or ignore; the commit's message labelled

  @REQ-102 @SCN-303
  Scenario: sprich's 325 files committed from the desktop app
    Given sprich open in the desktop app with 325 uncommitted files, and REQ-030 ready
    When the Developer presses Build on REQ-030, chooses commit, writes the message "Work in progress before building REQ-030" and confirms
    Then the Developer sees the 325 files grouped by folder before confirming, then one commit with that message, and the build of REQ-030 starts

  @REQ-102 @SCN-304
  Scenario: Stash refused until confirmed, in the browser
    Given sprich open in the browser with uncommitted files outside the specification
    When the Developer presses Build, chooses stash and cancels the confirmation
    Then nothing is stashed, the files stay as they were, and Build still says why it waits

  @REQ-102 @SCN-610
  Scenario: Confirm disabled until a message is written, in the browser
    Given the browser showing Build waiting on 10 uncommitted files
    When the Developer chooses commit and leaves the message empty, then writes "Agent set up"
    Then the Developer first sees the field labelled "Mensaje del commit" and Confirm disabled with "Escribe un mensaje para confirmar" beside it, then Confirm enabled and that line gone

  @REQ-102 @SCN-611
  Scenario: The same dialog in English, on the desktop
    Given the desktop app in English, Build waiting on 10 uncommitted files
    When the Developer chooses commit
    Then the Developer sees the field labelled "Commit message" in view without scrolling, and Confirm disabled with "Write a message to confirm" beside it

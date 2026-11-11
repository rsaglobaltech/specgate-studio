Feature: Build waits on uncommitted work and offers commit, stash or ignore

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

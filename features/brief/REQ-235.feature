Feature: While the agent proposes the form, the client's text is locked and the dialog shows what the studio is doing

  @REQ-235 @SCN-1014
  Scenario: The proposal under way, in the browser
    Given sprich open in the browser, an agent set, and the client's text pasted into "Paste the client's text"
    When the Developer presses "Propose the form" and specgate has not answered yet
    Then the text cannot be edited, a click outside the dialog leaves it open, and the dialog shows the temporary file as done, "claude reads it and proposes the form; specgate checks it" under way with its seconds and the `specgate propose --from-brief` command, and the proposed form still to come

  @REQ-235 @SCN-1015
  Scenario: specgate refuses, on the desktop
    Given sprich open in the desktop app, the proposal under way
    When specgate answers `draft_no_front_matter` with its fix
    Then the dialog shows the agent's step as failed with "The agent wrote no front matter." and its fix, the text can be edited again, and `docs/brief.md` is unchanged

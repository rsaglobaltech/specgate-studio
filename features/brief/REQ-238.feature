Feature: The accepted proposal keeps the client's text in the brief

  @REQ-238 @SCN-1016
  Scenario: A brief with no body, the proposal accepted
    Given sprich in the browser, `docs/brief.md` with its front matter and no body, an agent set
    When the Developer pastes the client's text, the form is proposed, and the Developer presses "Accept"
    Then `docs/brief.md` has the proposed front matter and, below it, the client's text as it was pasted

  @REQ-238 @SCN-1017
  Scenario: The same text accepted twice, on the desktop
    Given sprich on the desktop, `docs/brief.md` whose body already holds the client's text
    When the Developer pastes the same text again and accepts the proposal
    Then the body holds the client's text once

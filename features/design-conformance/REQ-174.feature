Feature: An empty folder's Home asks the five questions as option cards

  @REQ-174 @SCN-517
  Scenario: A new folder, on the desktop
    Given the empty folder `~/proyectos/academia` opened in the desktop app, Claude Code installed, sprich and agentkit among the recent projects
    When the Developer opens Home
    Then the Developer sees the five questions as cards with one chosen in each, Claude Code marked "detected", "Create the project" with the command `specgate init` it runs, and beside them "Already have code?" with "Open folder…" and the recent sprich and agentkit

  @REQ-174 @SCN-518
  Scenario: Choosing a card, in the browser
    Given the empty folder `~/proyectos/academia` in the browser, its Home showing the five questions
    When the Developer chooses the card "A service"
    Then the Developer sees that card marked with the orange border, the other two of its question unmarked, and the command below updated

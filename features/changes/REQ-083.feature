Feature: "Draft again with N requested changes" hands the open notes to the agent

  @REQ-083 @SCN-245
  Scenario: Two open requests on the desktop
    Given `draft-pedidos` with two open requests and one addressed request in its `review.md`
    When the Developer clicks "Draft again with 2 requested changes" in the desktop app
    Then `specgate propose --from-brief pedidos` runs with the agent, its echo shows in the terminal, and the agent's prompt carries the two open requests and not the addressed one

  @REQ-083 @SCN-246
  Scenario: No open request in the browser
    Given `draft-pedidos` whose requests are all addressed
    When the Developer opens it in Changes in the browser
    Then no "Draft again" action is offered, and the draft says it has no open request

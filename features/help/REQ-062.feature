Feature: The "?" beside Ask for a change, for the Reviewer

  @REQ-062 @SCN-183
  Scenario: Ask for a change explained, on the desktop
    Given draft-pedidos open for review in the desktop app
    When the Reviewer clicks the "?" beside Ask for a change
    Then the Reviewer sees that the request is written to `docs/specs/changes/draft-pedidos/review.md`, that the draft's requirements do not change now, and that next the draft is drafted again with `specgate propose --from-brief pedidos`

  @REQ-062 @SCN-184
  Scenario: Ask for a change explained, in the browser
    Given draft-pedidos open for review in the browser
    When the Reviewer clicks the "?" beside Ask for a change
    Then the Reviewer sees the same explanation as on the desktop: the request goes to `review.md`, and the draft changes only when it is drafted again

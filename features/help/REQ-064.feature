Feature: After Ask for a change, the Reviewer is told the draft has not changed yet

  @REQ-064 @SCN-187
  Scenario: The request is written, on the desktop
    Given draft-pedidos open for review in the desktop app
    When the Reviewer sends "Orders can be cancelled until they are shipped" with Ask for a change
    Then the Reviewer sees a notice that the request was written to `docs/specs/changes/draft-pedidos/review.md`, that the requirements are unchanged, and the next step `specgate propose --from-brief pedidos`

  @REQ-064 @SCN-188
  Scenario: The request is written, in the browser
    Given draft-pedidos open for review in the browser
    When the Reviewer sends "Orders can be cancelled until they are shipped" with Ask for a change
    Then the Reviewer sees the same notice, and the draft shown is still the one before the request

Feature: A draft's requests for change, open or addressed, and its requirements before and after

  @REQ-082 @SCN-243
  Scenario: Requests on the desktop
    Given `draft-pedidos` with two requests for change in its `review.md`, one addressed by the last redraft and one not
    When the Reviewer opens `draft-pedidos` in Changes in the desktop app
    Then they see one request marked open and one marked addressed, each with its text and the requirement it is about

  @REQ-082 @SCN-244
  Scenario: Before and after in the browser
    Given `draft-pedidos` redrafted after a request about REQ-031
    When the Reviewer opens REQ-031 in that draft in the browser
    Then they see REQ-031's text before the redraft and after it, side by side, with the changed words marked

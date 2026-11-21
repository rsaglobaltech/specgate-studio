Feature: Each key screen kept as a reference image; a screen that changes fails the tests

  @REQ-231 @SCN-1008
  Scenario: Nothing changed, on Linux CI
    Given the references of the key screens on Linux
    When the gate runs the tests on a pull request that does not change the UI
    Then every screen matches its reference and the tests pass

  @REQ-231 @SCN-1009
  Scenario: A line moved 8 px, on the Developer's Mac
    Given the reference of shop's just-adopted Home
    When the line about REQ-001 moves 8 px down and the tests run
    Then the test of that screen fails saying the share of pixels that differ, and `test-results/visual/darwin/` holds the screen as it is now and its differences in red; the reference is unchanged

  @REQ-231 @SCN-1010
  Scenario: An intended change, references rewritten
    Given a margin changed on purpose
    When the Developer runs `STUDIO_VISUAL_UPDATE=1 npm test`
    Then the references are rewritten, the new images show in the pull request's diff, and the tests pass again

  @REQ-231 @SCN-1011
  Scenario: A new screen with no reference, on CI
    Given a key screen added with no Linux reference
    When the gate runs on CI
    Then the test fails saying there is no reference, and the screen it took is uploaded as the `visual` artifact to be reviewed and committed

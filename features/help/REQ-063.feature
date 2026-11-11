Feature: The notice when an action ends names what happened and the next step

  @REQ-063 @SCN-185
  Scenario: Check ends, on the desktop
    Given sprich open in the desktop app
    When the Developer presses Check and it passes
    Then the Developer sees a notice that `specgate check` ran its specification, architecture and test stages, that no file was written, and the next step `specgate apply REQ-031` — not only "done"

  @REQ-063 @SCN-186
  Scenario: Apply is refused, in the browser
    Given REQ-031 with no test that names it, in the browser
    When the Developer presses Apply on REQ-031
    Then the Developer sees a notice that `specgate apply REQ-031` was refused with `apply_no_test`, that nothing was written, and the fix: write a test that names REQ-031

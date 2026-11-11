Feature: The core knows specgate only through SpecgatePort

  @REQ-011 @SCN-031
  Scenario: Sprich opened on the desktop, through the port
    Given the desktop app built from a tree where `packages/core` does not import `@rsaglobaltech/specgate`
    When the Developer opens sprich
    Then the Developer sees sprich's Home, read through `SpecgatePort`, and `npm run arch` passes

  @REQ-011 @SCN-032
  Scenario: A core that imports specgate does not pass the gate
    Given a change that makes `packages/core/src/application/ProjectState.ts` import `@rsaglobaltech/specgate`
    When the Developer opens the Gate panel in the browser and presses Check
    Then the Developer sees the Architecture stage fail, naming the rule `core-imports-nothing-outside-core`

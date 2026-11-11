Feature: After setup, what is ready and what is not

  @REQ-114 @SCN-337
  Scenario: shop ready on the desktop, the architecture check left to set
    Given `~/projects/shop` just adopted in the desktop app, its tests and agent saved
    When the Developer looks at the readiness list
    Then the Developer sees Tests set to `npm test`, Agent set to Claude Code, CI gate set to `.github/workflows/spec-gate.yml`, and Architecture not set with a button that runs `specgate config set arch_cmd` with the command they type

  @REQ-114 @SCN-338
  Scenario: The agent set from the readiness list in the browser
    Given `~/projects/shop` adopted in the browser on a machine where Claude Code was not found, its Agent not set
    When the Developer presses the Agent's button and chooses Claude Code
    Then `specgate agents init --tool claude` runs, and the readiness list shows Agent set to Claude Code

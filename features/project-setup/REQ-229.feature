Feature: Stack and testing in Settings

  @REQ-229 @SCN-1005
  Scenario: The stack read in Settings, on the desktop
    Given sprich open in the desktop app, its `AGENTS.md` saying `Stack: TypeScript 5`
    When the Developer opens Settings, then Preferences
    Then the Developer sees Stack with `TypeScript 5`, kept in `AGENTS.md`, beside `specgate config set stack`

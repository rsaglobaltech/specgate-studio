Feature: An undecided stack is something to settle, in the readiness list and on Home

  @REQ-228 @SCN-1002
  Scenario: An empty folder adopted, on the desktop
    Given `~/projects/notes`, a folder with no build manifest, just adopted in the desktop app, its `AGENTS.md` saying `Stack: TBD` and `Testing: TBD`
    When the Developer looks at the readiness list
    Then Stack and Testing show as to decide, each with a field, and Home's next step is "Decide the stack"

  @REQ-228 @SCN-1003
  Scenario: The stack decided from the readiness list, in the browser
    Given `~/projects/notes` open in the browser, its Stack to decide
    When the Developer writes `TypeScript, Node 22` in Stack's field and saves
    Then `specgate config set stack "TypeScript, Node 22"` runs, the readiness list shows Stack set to `TypeScript, Node 22`, and `AGENTS.md` says it

  @REQ-228 @SCN-1004
  Scenario: A stack adoption detected, in the browser
    Given `~/projects/shop` just adopted in the browser, its `AGENTS.md` saying `Stack: Node.js` and `Testing: npm test`
    When the Developer looks at the readiness list
    Then Stack shows set to `Node.js`, Testing set to `npm test`, and Home's next step is not "Decide the stack"

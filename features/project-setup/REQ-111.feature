Feature: An empty folder: five questions, then `specgate init`

  @REQ-111 @SCN-331
  Scenario: "academia" created in the desktop app
    Given the desktop app opened on the empty folder `~/projects/academia`
    When the Developer answers "academia", a web app, Node.js and React, Claude Code and the minimal architecture, and confirms
    Then the Developer sees `specgate init` run with those answers in its terminal, and `~/projects/academia` holds `spec.md` and `docs/specs/traceability.md`, with no `academia` folder inside it

  @REQ-111 @SCN-332
  Scenario: The command shown before anything is written, in the browser
    Given `specgate-studio serve` on the empty folder `~/projects/academia`, open in the browser
    When the Developer answers the five questions as "academia", a web app, Node.js and React, Claude Code and minimal
    Then the Developer sees the `specgate init` command those answers make and a Create button, and the folder is still empty until they press it

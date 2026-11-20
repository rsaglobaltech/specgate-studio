Feature: Editor tabs, a bottom panel and a status bar

  @REQ-032 @SCN-093
  Scenario: The status bar of sprich in the desktop app
    Given the desktop app with sprich open on the branch `feat/mvp-fase-1`
    When the Developer opens Home
    Then the status bar shows the branch `feat/mvp-fase-1`, no ticket, the gate's last result, the requirements done of the total, and the cost, and the bottom panel offers the tabs Terminal, Gate, Problems, Agent output and Traceability

  @REQ-032 @SCN-094
  Scenario: Two files open as tabs in the browser
    Given sprich open in the browser with `docs/brief.md` open in the editor
    When the Developer opens `docs/specs/changes/draft-workbench/proposal.md` from Explorer
    Then two editor tabs show, `brief.md` and `proposal.md`, with `proposal.md` the active one

  @REQ-032 @SCN-103
  Scenario: The bottom panel and the tabs by keyboard on the desktop
    Given the desktop app on macOS with sprich open, `brief.md` and `proposal.md` open as tabs, `proposal.md` active, and the bottom panel hidden
    When the Developer presses Cmd+J, then Ctrl+Shift+Tab
    Then the bottom panel shows, and `brief.md` is the active tab

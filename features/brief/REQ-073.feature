Feature: "Draft the modules" drafts one module at a time with the agent

  @REQ-073 @SCN-215
  Scenario: Two modules drafted in turn on the desktop
    Given sprich open in the desktop app, its brief with the modules `pedidos` and `pagos`, neither drafted, and an agent set
    When the Developer presses "Draft the modules"
    Then the terminal shows `specgate propose --from-brief pedidos` run with the agent, named by the button "Draft the modules", and `specgate propose --from-brief pagos` starts only after it has ended

  @REQ-073 @SCN-216
  Scenario: Pressed again while a module is drafting, in the browser
    Given sprich open in the browser, "Draft the modules" drafting `pedidos`
    When the Developer presses "Draft the modules" again
    Then it is refused with `write_busy`, naming `specgate propose --from-brief pedidos`, and no second draft starts

  @REQ-073 @SCN-217
  Scenario: No agent set, on the desktop
    Given sprich open in the desktop app with no agent set
    When the Developer presses "Draft the modules"
    Then nothing runs, and the notice names `specgate agents init --tool claude` as the way to set one

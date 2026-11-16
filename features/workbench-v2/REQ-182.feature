Feature: The plan applied only after its diff and a confirmation; discarded; the diff kept in Changes

  @REQ-182 @SCN-543
  Scenario: Applied after its diff, on the desktop
    Given sprich in the desktop app with the plan for REQ-031 shown, and "Leídos: brief.md § pedidos, questions.md, spec.md · 3,1 k tokens" under it
    When the Developer presses "Ver el diff y aplicar", reads the three files' diff and confirms
    Then the three files are written as the diff showed, the notice names them and `specgate draft --check pedidos`, and Changes shows the diff under draft-pedidos

  @REQ-182 @SCN-544
  Scenario: Discarded, in the browser
    Given sprich in the browser with the plan for REQ-031 shown
    When the Developer presses "Descartar"
    Then the plan goes, no file of sprich is written, and the notice says nothing was written

  @REQ-182 @SCN-545
  Scenario: The diff seen and not confirmed, on the desktop
    Given sprich in the desktop app with the plan's diff open
    When the Developer cancels the confirmation
    Then no file is written and the plan stays with "Ver el diff y aplicar" and "Descartar"

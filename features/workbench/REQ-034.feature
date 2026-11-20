Feature: Spanish or English, dark or light

  @REQ-034 @SCN-097
  Scenario: English in the desktop app
    Given the desktop app in Spanish with sprich open on Cambios
    When the Developer chooses English in Settings
    Then the open view is titled Changes, the activity bar reads Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability, Report, Help, Settings, and sprich is not read again

  @REQ-034 @SCN-098
  Scenario: Light in the browser
    Given sprich open for the first time in the browser
    When the Developer opens Settings
    Then the theme chosen is dark, and choosing light turns the activity bar, the editor and the panels light at once

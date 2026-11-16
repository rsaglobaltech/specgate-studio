Feature: Download as one HTML page; print to PDF

  @REQ-133 @SCN-395
  Scenario: Download on the desktop
    Given sprich's Report open in the desktop app, on pagos
    When the Reviewer presses Download and chooses the folder Downloads
    Then one file `sprich-report-pagos.html` is written there, it opens offline showing pagos built 2 of 6 and coverage 74 %, and the notice names that file

  @REQ-133 @SCN-396
  Scenario: Print to PDF in the browser
    Given sprich's Report open in the browser
    When the Reviewer presses Print
    Then the browser's print dialog opens on the report alone, without the activity bar, the panels or the status bar, and nothing is written by the studio

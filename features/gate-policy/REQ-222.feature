Feature: The studio needs specgate 1.4.0, and says so at start

  @REQ-222 @SCN-991
  Scenario: specgate 1.0.0 installed, on the desktop
    Given sprich in the desktop app, specgate 1.0.0 installed
    When the Developer opens sprich
    Then the Developer sees that the studio needs specgate 1.4.0 or later, with the command that updates it, and no section of sprich is read

  @REQ-222 @SCN-992
  Scenario: specgate 1.4.2 installed, in the browser
    Given `specgate-studio serve` for sprich, specgate 1.4.2 installed
    When the Developer opens the studio's address
    Then Home shows sprich's requirements and no notice about specgate's version

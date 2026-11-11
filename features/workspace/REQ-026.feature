Feature: The last 10 projects of each Developer

  @REQ-026 @SCN-071
  Scenario: The recent projects on the desktop
    Given a Developer who opened 10 projects, `sprich` the last of them
    When the Developer opens the folder `billing` in the desktop app
    Then the Developer sees 10 recent projects, `billing` first and `sprich` second, and the one opened earliest no longer listed

  @REQ-026 @SCN-072
  Scenario: A recent project reopened in the browser
    Given `sprich` among the Developer's 10 recent projects
    When the Developer picks `sprich` from the recent projects in the browser
    Then the Developer sees sprich open, and `sprich` first in the recent projects

  @REQ-026 @SCN-073
  Scenario: A recent project already open, on the desktop
    Given `sprich` and `billing` open in two windows of the desktop app, the `billing` window in front
    When the Developer picks `sprich` from the recent projects in the `billing` window
    Then the `sprich` window comes to the front, and no second window or core host for sprich is started

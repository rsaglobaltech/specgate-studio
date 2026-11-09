Feature: Arguments as an array, never a shell

  @REQ-007 @SCN-013
  Scenario: A change id with shell characters, on the desktop
    Given sprich open in the desktop app
    When the Developer asks to validate the change `add-coupons; rm -rf .`
    Then specgate receives `add-coupons; rm -rf .` as one argument, no shell runs, and no file of sprich is removed

  @REQ-007 @SCN-014
  Scenario: A project path with a space, in the browser on Windows
    Given `specgate-studio serve` on Windows for `C:\Users\Juan Perez\shop`
    When the Developer presses Check
    Then specgate receives `C:\Users\Juan Perez\shop` as one argument — the folder `specgate check [dir]` takes — and the gate runs in that folder

Feature: The installed specgate checked at start

  @REQ-013 @SCN-035
  Scenario: 0.29.1 installed, 0.30.0 needed, on the desktop
    Given specgate 0.29.1 installed and a studio that needs 0.30.0
    When the Developer opens sprich in the desktop app
    Then the Developer sees "specgate 0.29.1 is installed; the studio needs 0.30.0" and `npm i -g @rsaglobaltech/specgate@0.30.0`, and no section is read

  @REQ-013 @SCN-036
  Scenario: The same in the browser
    Given specgate 0.29.1 installed and `specgate-studio serve` for sprich, which needs 0.30.0
    When the Developer opens the studio's address in the browser
    Then the Developer sees both versions and the update command, and no section is read

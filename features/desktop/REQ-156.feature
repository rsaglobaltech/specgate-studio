Feature: Auto-update: offered on start, applied on restart, never during a build

  @REQ-156 @SCN-459
  Scenario: An update accepted, on macOS
    Given the studio 0.7.0 running on macOS, sprich open, no build running, and the release 0.7.1 published
    When the Developer accepts the update the studio offers
    Then the studio downloads 0.7.1, verifies its signature, installs it, the notice says 0.7.1 was installed over 0.7.0 and applies on restart, and the studio still runs 0.7.0 until it restarts

  @REQ-156 @SCN-460
  Scenario: No update during a build, on Windows
    Given the studio 0.7.0 running on Windows, building REQ-030, and the release 0.7.1 published
    When the Developer opens the update the studio offers
    Then the studio says it installs once the build ends, and nothing is installed while REQ-030 builds

  @REQ-156 @SCN-461
  Scenario: An update with a bad signature is refused, on Linux
    Given the studio 0.7.0 running from its .AppImage, and a 0.7.1 whose signature does not match the studio's update key
    When the studio checks for updates
    Then nothing is installed, and the notice says the update was refused because its signature did not verify

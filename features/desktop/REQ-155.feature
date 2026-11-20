Feature: An .AppImage and a .deb for Linux, signed

  @REQ-155 @SCN-457
  Scenario: Verifying the .deb on Ubuntu
    Given Ubuntu 24.04 with the project's public GPG key imported, and the studio's .deb and its `.deb.asc` downloaded from its release
    When the Developer runs `gpg --verify` on the .deb's signature and installs the .deb
    Then gpg reports a good signature from the project's key, and the studio opens from the applications menu

  @REQ-155 @SCN-458
  Scenario: Running the .AppImage on Fedora
    Given Fedora 41 and the studio's .AppImage downloaded from its release, with its signature
    When the Developer verifies it, makes it executable and opens it
    Then the signature is good and the studio opens with no Node installed

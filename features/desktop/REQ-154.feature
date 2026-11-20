Feature: An .msi for Windows: unsigned with SmartScreen steps now, code-signed once the certificate exists

  @REQ-154 @SCN-467
  Scenario: Installing the unsigned .msi, with the SmartScreen steps
    Given a Windows 11 machine with SmartScreen on, the studio's unsigned .msi downloaded from its release, and no code-signing certificate in the pipeline yet
    When the Developer opens the .msi, sees SmartScreen's warning, and follows the SmartScreen steps the release links to
    Then the installer runs, and the studio opens from the Start menu

  @REQ-154 @SCN-456
  Scenario: Installing the signed .msi, once the certificate exists
    Given the release pipeline with the owner's code-signing certificate, a Windows 11 machine with SmartScreen on, and the .msi that pipeline built
    When the Developer opens the .msi
    Then the Developer sees the installer name the owner as publisher, and no "unknown publisher" warning; and `Get-AuthenticodeSignature` reports the installer and the installed app as Valid

Feature: A .dmg for macOS: unsigned with "Open anyway" steps now, signed and notarized once the certificate exists

  @REQ-153 @SCN-466
  Scenario: First launch of the unsigned .dmg, with the "Open anyway" steps
    Given a Mac with Gatekeeper on its default setting, the studio's unsigned .dmg downloaded from its release, and no Developer ID certificate in the pipeline yet
    When the Developer opens the studio, sees Gatekeeper's warning, and follows the "Open anyway" steps the release links to
    Then the studio opens, and the steps the Developer followed are the ones published for that macOS version

  @REQ-153 @SCN-455
  Scenario: First launch of the signed .dmg, once the certificate exists
    Given the release pipeline with the owner's Developer ID certificate, a Mac with Gatekeeper on its default setting, offline, and the .dmg that pipeline built
    When the Developer drags the studio to Applications and opens it
    Then the studio opens with no "cannot be opened" or "unidentified developer" warning, `spctl --assess --type execute` accepts the app as notarized, and the developer it names is the owner

Feature: Home leads to the setup the folder needs

  @REQ-116 @SCN-341
  Scenario: shop's Home on the desktop
    Given the desktop app opened on `~/projects/shop`, with code and no specgate files
    When the Developer looks at Home
    Then the next step reads "Adopt this folder", not "Create the project", and opens the adoption's preview

  @REQ-116 @SCN-342
  Scenario: An empty folder's Home in the browser
    Given `specgate-studio serve` on the empty folder `~/projects/academia`
    When the Developer opens the studio's address
    Then the next step reads "Create the project", and opens the five questions

Feature: The brief's checks on every save, in Problems

  @REQ-072 @SCN-213
  Scenario: "free above some amount" flagged on the desktop
    Given sprich open in the desktop app
    When the Developer saves the rule "Shipping is free above some amount" in the module `pedidos`
    Then Problems lists a vague value at that rule's line, with the code `B6_unmeasured` and a fix that asks for the amount as a number

  @REQ-072 @SCN-214
  Scenario: The finding goes once the value is a number, in the browser
    Given sprich open in the browser, Problems listing the vague value of "free above some amount"
    When the Developer rewrites the rule as "Shipping is free above 50 EUR" and saves
    Then Problems no longer lists that finding

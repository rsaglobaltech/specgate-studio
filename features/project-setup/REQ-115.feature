Feature: The areas adoption found are a map, not requirements

  @REQ-115 @SCN-339
  Scenario: shop's areas on the desktop
    Given `~/projects/shop`, with code under `src/billing`, `src/invoices` and `src/utils`, just adopted in the desktop app
    When the Developer opens Home
    Then the Developer sees the areas Billing and Invoices with their folders, not Utils, the requirements still REQ-001 alone, and the next step "Specify a behaviour you rely on"

  @REQ-115 @SCN-340
  Scenario: A React app organised by kind, in the browser
    Given a project with code under `src/components`, `src/hooks` and `src/utils`, just adopted in the browser
    When the Developer opens Home
    Then the Developer sees no area and that the code is organised by kind, not by area, and the next step "Specify a behaviour you rely on"

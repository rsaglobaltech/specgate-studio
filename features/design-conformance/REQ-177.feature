Feature: Editor tabs show the file's type and a requirement's id and title; a breadcrumb shows where

  @REQ-177 @SCN-525
  Scenario: REQ-031 opened from its module, on the desktop
    Given sprich in the desktop app
    When the Developer opens REQ-031 from the module pedidos
    Then the Developer sees the tab "REQ-031 · Cancel an order" with the type "REQ", and the breadcrumb docs › specs › changes › draft-pedidos › pedidos › REQ-031

  @REQ-177 @SCN-526
  Scenario: A feature and a test side by side, in the browser
    Given sprich in the browser
    When the Developer opens `features/pedidos/REQ-031.feature` and then `CancelOrder.test.ts`
    Then the Developer sees the tabs "REQ-031.feature" with the type "FT" and "CancelOrder.test.ts" with the type "TS", and the breadcrumb of `CancelOrder.test.ts`

Feature: The filter inside the tree; what is ignored is dimmed, never matched

  @REQ-167 @SCN-497
  Scenario: Filtering REQ-031, on the desktop
    Given sprich in the desktop app with only `packages/core` open
    When the Developer types `REQ-031` in the Explorer's filter, then clears it
    Then the Developer first sees `features/pedidos/REQ-031.feature` and `test/pedidos/REQ-031.test.ts` inside their opened folders and no other file, then only `packages/core` open again

  @REQ-167 @SCN-498
  Scenario: Ignored folders dimmed, never matched, in the browser
    Given sprich in the browser, with `node_modules`, `apps/web/dist`, and a `.gitignore` that names `.idea/` and `*.log`
    When the Developer opens the top level of the tree and types `index` in the filter
    Then the Developer first sees `node_modules` and `.idea` dimmed in the tree, then no match from `node_modules`, `apps/web/dist`, `.idea` or a `.log` file

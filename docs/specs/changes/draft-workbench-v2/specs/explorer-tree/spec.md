# Delta — explorer-tree

## MODIFIED Requirements

### Requirement: REQ-167 — The filter inside the tree; what is ignored is dimmed, never matched

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, while the filter has text, show only the files whose path matches it, inside their folders opened down to them, and restore the folders left open when the filter is cleared; a file that `.gitignore` or the studio's ignore rules name SHALL be shown dimmed in the tree (draft-workbench-v2 REQ-186) and SHALL never be matched by the filter.

> Brief: "When a folder is open, the Explorer shows the whole project under a root named after it, dot folders included, and what is ignored dimmed, never hidden, below the spec explorer and the modules."

#### Scenario: SCN-497 — Filtering REQ-031, on the desktop

- GIVEN sprich in the desktop app with only `packages/core` open
- WHEN the Developer types `REQ-031` in the Explorer's filter, then clears it
- THEN the Developer first sees `features/pedidos/REQ-031.feature` and `test/pedidos/REQ-031.test.ts` inside their opened folders and no other file, then only `packages/core` open again

#### Scenario: SCN-498 — Ignored folders dimmed, never matched, in the browser

- GIVEN sprich in the browser, with `node_modules`, `apps/web/dist`, and a `.gitignore` that names `.idea/` and `*.log`
- WHEN the Developer opens the top level of the tree and types `index` in the filter
- THEN the Developer first sees `node_modules` and `.idea` dimmed in the tree, then no match from `node_modules`, `apps/web/dist`, `.idea` or a `.log` file

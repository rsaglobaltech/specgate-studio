# Delta — explorer-tree

## ADDED Requirements

### Requirement: REQ-161 — Folders open one level at a time; 50,000 files stay under 50 ms; open folders kept per project

<!-- specgate:trace actor=Developer kind=non-functional -->

The system SHALL show the project's files as a tree whose folders open and close one level at a time, reading only the folder that is opened, so that in a project of 50,000 files a folder's children show in under 50 ms; it SHALL keep, per project, which folders were left open and show them open the next time that project is opened.

> Brief: "Folders open and close one level at a time and only the opened folder is read, so that in a project of 50,000 files a folder's children show in under 50 ms; the folders left open are kept per project."

#### Scenario: SCN-481 — Opening `packages/core` in sprich, on the desktop

- GIVEN sprich, a project of 50,000 files outside the ignored folders, open in the desktop app, its tree showing only the top level
- WHEN the Developer opens the folder `packages/core`
- THEN the Developer sees its children under it in under 50 ms, folders first and then files, each by name, and the host has read no folder but `packages/core`

#### Scenario: SCN-482 — The folders left open come back, in the browser

- GIVEN sprich in the browser, with `packages/core` and `docs/specs` left open when it was last closed
- WHEN the Developer opens sprich again
- THEN the Developer sees `packages/core` and `docs/specs` open and every other folder closed

#### Scenario: SCN-483 — Closing a folder, on the desktop

- GIVEN sprich in the desktop app with `packages/core` open
- WHEN the Developer closes `packages/core`
- THEN the Developer sees its children gone and `packages/core` marked closed, and the next time sprich opens it is still closed

### Requirement: REQ-162 — The side panel of the boards, with file-type icons and the specification marked

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show the tree in the side panel the boards draw — a 36 px uppercase header with its "?", rows of 26 px on the side-panel ground, the orange inset on the current row — and SHALL show on each row its file type's icon, marking `spec.md`, `docs/specs` and `features` as the specification.

> Brief: "Each row, in the side panel the boards draw (a 36 px uppercase header with its "?", the orange inset on the current row), shows its file type's icon, and spec.md, docs/specs and features are marked as the specification."

#### Scenario: SCN-484 — The Explorer of sprich, on the desktop

- GIVEN sprich open in the desktop app, `spec.md` open in the editor
- WHEN the Developer chooses Explorer in the activity bar
- THEN the Developer sees the side panel titled "EXPLORER" with its "?", `spec.md`, `docs/specs` and `features` with the specification mark, `package.json` with the JSON icon, and `spec.md`, the current row, with the orange inset

#### Scenario: SCN-485 — The same panel in Spanish, in the browser

- GIVEN sprich in the browser with the studio in Spanish
- WHEN the Developer opens `features` in the tree
- THEN the Developer sees the header "EXPLORADOR", `features/pedidos` with the specification mark, and `features/pedidos/REQ-031.feature` with the feature icon

### Requirement: REQ-163 — Git letters on files and a dot on folders holding a change

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, on each file changed in git, its letter in its colour — M for modified, U for untracked, A for added — and a dot on each folder that holds a changed file; both SHALL follow the repository when it changes, without a reload.

> Brief: "Each file changed in git shows its letter in its colour (M modified, U untracked, A added), and a folder holding a change shows a dot."

#### Scenario: SCN-486 — A modified brief, an untracked note and an added file, on the desktop

- GIVEN sprich in the desktop app with `docs/brief.md` modified, `docs/notes.md` untracked and `src/cart.ts` added to the index
- WHEN the Developer opens the folder `docs`
- THEN the Developer sees `docs/brief.md` with M in amber, `docs/notes.md` with U in green, a dot on `docs`, and a dot on the closed folder `src`

#### Scenario: SCN-487 — The letters go once committed, in the browser

- GIVEN sprich in the browser with `docs/brief.md` showing M and a dot on `docs`
- WHEN the Developer commits `docs/brief.md` in the studio's terminal
- THEN the Developer sees the M and the dot on `docs` gone within 500 ms of the commit, with no reload

### Requirement: REQ-164 — The active editor's file revealed in the tree

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, when a file becomes the active editor tab, open the folders above it in the tree, select its row and scroll it into view, without taking the keyboard focus from the editor.

> Brief: "When a file becomes the active editor tab, the tree opens the folders above it and selects it."

#### Scenario: SCN-488 — A spec opened from the palette is revealed, on the desktop

- GIVEN sprich in the desktop app with every folder of the tree closed
- WHEN the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` from the palette
- THEN the Developer sees `docs`, `specs`, `changes`, `draft-pedidos`, `specs` and `pedidos` open, that `spec.md` selected and in view, and the cursor still in the editor

#### Scenario: SCN-489 — Switching tabs moves the selection, in the browser

- GIVEN sprich in the browser with `spec.md` and `docs/brief.md` open in tabs, `spec.md` active
- WHEN the Developer chooses the tab of `docs/brief.md`
- THEN the Developer sees `docs/brief.md` selected in the tree and `spec.md` no longer selected

### Requirement: REQ-165 — The tree by keyboard: arrows, Enter, F2 and Delete

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, while the tree has the focus, move the selection with the up and down arrows, open a folder or go to its first child with the right arrow, close it or go to its parent with the left arrow, open the selected file with Enter, start renaming it with F2, and start deleting it with Delete.

> Brief: "When the tree has the focus, the arrow keys move and open or close folders, Enter opens, F2 renames and Delete deletes."

#### Scenario: SCN-490 — Into `docs` and open the brief, on the desktop

- GIVEN sprich in the desktop app, the tree focused on the closed folder `docs`
- WHEN the Developer presses Right, Right and Enter
- THEN the Developer sees `docs` open, `docs/brief.md` selected and open in the editor

#### Scenario: SCN-491 — F2 renames the note, in the browser

- GIVEN sprich in the browser, the tree focused on `docs/notes.md`
- WHEN the Developer presses F2, types `notes-old.md` and presses Enter
- THEN the Developer sees `docs/notes-old.md` selected in the tree, no `docs/notes.md`, and the file renamed on disk

### Requirement: REQ-166 — A context menu that writes only through the host's file port, inside the project

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL offer on each row a context menu with new file, new folder, rename, delete, copy path and open in terminal; it SHALL delete only after the Developer confirms — Delete moving the file to the system's trash, Shift+Delete removing it for good after a confirmation that says so; and every write SHALL go through the host's file port, SHALL be served only to the studio's own page — the same Origin check as saving a file — and SHALL be refused, writing nothing, for a path outside the project, a link included.

> Brief: "A context menu offers new file, new folder, rename, delete after a confirmation, copy path and open in terminal; each write goes through the host's file port, only from the studio's own page and never outside the project, and has its "?" and its notice in English and Spanish."

#### Scenario: SCN-492 — A new file in `docs`, on the desktop

- GIVEN sprich in the desktop app
- WHEN the Developer opens the context menu of `docs`, chooses "New file" and types `adr.md`
- THEN the Developer sees `docs/adr.md` in the tree and open in the editor, empty, and the notice "Created docs/adr.md"

#### Scenario: SCN-493 — Delete asks first, in the browser

- GIVEN sprich in the browser, `docs/notes.md` selected
- WHEN the Developer presses Delete and confirms "Delete docs/notes.md?"
- THEN the Developer sees `docs/notes.md` gone from the tree and the notice "Moved docs/notes.md to the trash", and the file is in the system's trash

#### Scenario: SCN-501 — Shift+Delete removes for good, on the desktop

- GIVEN sprich in the desktop app, `docs/notes.md` selected
- WHEN the Developer presses Shift+Delete and confirms "Delete docs/notes.md for good? It cannot be undone."
- THEN the Developer sees `docs/notes.md` gone from the tree and the notice "Deleted docs/notes.md for good", and the file is neither on disk nor in the trash

#### Scenario: SCN-494 — A page of another site cannot rename a file

- GIVEN sprich in the browser and, in another tab, a page of `http://evil.example` that opens the host's WebSocket
- WHEN that page asks the host to rename `spec.md` to `x.md`
- THEN the request is refused before it reaches the file port, and the Developer still sees `spec.md` in the tree and on disk

#### Scenario: SCN-495 — A folder linked from outside is not written through, on the desktop

- GIVEN sprich in the desktop app with `vendor-link`, a link to a folder outside sprich
- WHEN the Developer chooses "New file" on `vendor-link` and types `a.md`
- THEN the Developer sees the notice "Not inside the project: vendor-link/a.md was not created", and no file was created

#### Scenario: SCN-496 — Copy path and open in terminal, in the browser

- GIVEN sprich in the browser
- WHEN the Developer chooses "Open in terminal" on `packages/core`, and then "Copy path" on `packages/core/src/index.ts`
- THEN the Developer sees a new terminal whose folder is `packages/core`, and `packages/core/src/index.ts` is on the clipboard

### Requirement: REQ-167 — The filter inside the tree; what is ignored is never shown

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, while the filter has text, show only the files whose path matches it, inside their folders opened down to them, and restore the folders left open when the filter is cleared; it SHALL never show, open or match a file that `.gitignore` or the studio's ignore rules name.

> Brief: "The filter shows the matching files inside their folders, and what .gitignore and the studio's ignore rules name is never shown."

#### Scenario: SCN-497 — Filtering REQ-031, on the desktop

- GIVEN sprich in the desktop app with only `packages/core` open
- WHEN the Developer types `REQ-031` in the Explorer's filter, then clears it
- THEN the Developer first sees `features/pedidos/REQ-031.feature` and `test/pedidos/REQ-031.test.ts` inside their opened folders and no other file, then only `packages/core` open again

#### Scenario: SCN-498 — Ignored folders stay out, in the browser

- GIVEN sprich in the browser, with `node_modules`, `apps/web/dist`, and a `.gitignore` that names `.idea/` and `*.log`
- WHEN the Developer opens the top level of the tree and types `index` in the filter
- THEN the Developer sees no `node_modules`, `apps/web/dist`, `.idea` or `.log` file in the tree, and no match from them

### Requirement: REQ-168 — The tree's "?" and its notices, in English and Spanish

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL give the Explorer's header and each action of its context menu a "?" that says what it does, what it writes and what it does not do, and SHALL end each write with a notice that names the file and what was done, in English and in Spanish.

> Brief: "A context menu offers new file, new folder, rename, delete after a confirmation, copy path and open in terminal; each write goes through the host's file port, only from the studio's own page and never outside the project, and has its "?" and its notice in English and Spanish."

#### Scenario: SCN-499 — The Reviewer reads what Delete does, on the desktop in Spanish

- GIVEN sprich in the desktop app in Spanish, the Reviewer on the context menu of `docs/notes.md`
- WHEN the Reviewer presses the "?" beside "Eliminar"
- THEN the Reviewer sees, under "[ POR DEBAJO ]", that it moves `docs/notes.md` to the trash after a confirmation, writes nothing else and commits nothing — in Spanish

#### Scenario: SCN-500 — The Reviewer reads what the Explorer shows, in the browser

- GIVEN sprich in the browser in English
- WHEN the Reviewer presses the "?" in the Explorer's header
- THEN the Reviewer sees what the tree shows, what the M, U and A letters and the specification mark mean, and that the tree writes only through its menu

### Requirement: REQ-169 — The spec's sections above the file tree: the spec, and its modules and requirements

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show in the Explorer's side panel, above the file tree, the shell board's two sections: "SPEC EXPLORER" with `spec.md`, `docs/brief.md`, the open changes with what each waits for, the capabilities and the features, each with its count; and "MODULES · REQUIREMENTS" with each module's requirements built of its total and each requirement's status dot, opening the requirement when chosen.

> Brief: "Each row, in the side panel the boards draw (a 36 px uppercase header with its "?", the orange inset on the current row), shows its file type's icon, and spec.md, docs/specs and features are marked as the specification."

#### Scenario: SCN-502 — sprich's spec above its files, on the desktop

- GIVEN sprich in the desktop app, with draft-pedidos open and two questions in it, 4 capabilities, and the module pedidos with REQ-031 waiting for an answer
- WHEN the Developer chooses Explorer in the activity bar
- THEN the Developer sees "SPEC EXPLORER" with `spec.md`, `docs/brief.md`, draft-pedidos with "2 questions", "capabilities (4)"; below it "MODULES · REQUIREMENTS" with pedidos and REQ-031 with an amber dot; and below both the file tree

#### Scenario: SCN-503 — A requirement opened from its module, in the browser

- GIVEN sprich in the browser, the Explorer's "MODULES · REQUIREMENTS" showing pedidos open
- WHEN the Developer chooses REQ-031
- THEN the Developer sees the file of REQ-031 open in the editor at its heading, and REQ-031 the current row with the orange inset

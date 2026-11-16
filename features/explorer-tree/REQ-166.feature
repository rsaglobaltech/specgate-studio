Feature: A context menu that writes only through the host's file port, inside the project

  @REQ-166 @SCN-492
  Scenario: A new file in `docs`, on the desktop
    Given sprich in the desktop app
    When the Developer opens the context menu of `docs`, chooses "New file" and types `adr.md`
    Then the Developer sees `docs/adr.md` in the tree and open in the editor, empty, and the notice "Created docs/adr.md"

  @REQ-166 @SCN-493
  Scenario: Delete asks first, in the browser
    Given sprich in the browser, `docs/notes.md` selected
    When the Developer presses Delete and confirms "Delete docs/notes.md?"
    Then the Developer sees `docs/notes.md` gone from the tree and the notice "Moved docs/notes.md to the trash", and the file is in the system's trash

  @REQ-166 @SCN-501
  Scenario: Shift+Delete removes for good, on the desktop
    Given sprich in the desktop app, `docs/notes.md` selected
    When the Developer presses Shift+Delete and confirms "Delete docs/notes.md for good? It cannot be undone."
    Then the Developer sees `docs/notes.md` gone from the tree and the notice "Deleted docs/notes.md for good", and the file is neither on disk nor in the trash

  @REQ-166 @SCN-494
  Scenario: A page of another site cannot rename a file
    Given sprich in the browser and, in another tab, a page of `http://evil.example` that opens the host's WebSocket
    When that page asks the host to rename `spec.md` to `x.md`
    Then the request is refused before it reaches the file port, and the Developer still sees `spec.md` in the tree and on disk

  @REQ-166 @SCN-495
  Scenario: A folder linked from outside is not written through, on the desktop
    Given sprich in the desktop app with `vendor-link`, a link to a folder outside sprich
    When the Developer chooses "New file" on `vendor-link` and types `a.md`
    Then the Developer sees the notice "Not inside the project: vendor-link/a.md was not created", and no file was created

  @REQ-166 @SCN-496
  Scenario: Copy path and open in terminal, in the browser
    Given sprich in the browser
    When the Developer chooses "Open in terminal" on `packages/core`, and then "Copy path" on `packages/core/src/index.ts`
    Then the Developer sees a new terminal whose folder is `packages/core`, and `packages/core/src/index.ts` is on the clipboard

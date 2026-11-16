Feature: The brief edited as a form and as markdown, one file

  @REQ-071 @SCN-211
  Scenario: A rule changed in the form on the desktop
    Given sprich open in the desktop app, its `docs/brief.md` with the modules `pedidos` and `pagos` and a paragraph "Notes from the call with the client" outside every module
    When the Developer changes the first rule of `pedidos` in the Brief view's form and saves
    Then `docs/brief.md` has the new rule under `pedidos`, and the paragraph "Notes from the call with the client" and every other line are unchanged

  @REQ-071 @SCN-212
  Scenario: A rule changed as markdown in the browser
    Given sprich open in the browser, `docs/brief.md` open in the editor
    When the Developer adds a rule to `pagos` in the markdown, saves, and opens the Brief view's form
    Then the form lists the new rule under `pagos`, read from the same `docs/brief.md`

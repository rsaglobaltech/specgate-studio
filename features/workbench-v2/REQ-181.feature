Feature: The agent panel on the right: a plan before anything is written

  @REQ-181 @SCN-541
  Scenario: The plan for REQ-031, on the desktop
    Given sprich in the desktop app, its agent `claude`, `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` open on REQ-031
    When the Developer sends "Que se pueda cancelar hasta 24 h antes del envío @REQ-031"
    Then the Developer sees the request on the right, then "[ PLAN · NADA ESCRITO AÚN ]" with M `changes/draft-pedidos/specs/pedidos/spec.md`, M `changes/draft-pedidos/questions.md` and + `features/pedidos/REQ-031.feature`, and "specgate draft --check pedidos" as what runs after — and no file of sprich has changed

  @REQ-181 @SCN-542
  Scenario: The same panel in English, in the browser
    Given sprich in the browser, in English
    When the Developer opens any view
    Then the Developer sees the agent panel on the right, headed "AGENT" with `claude` and its "?", under it the input, and the views' content between the side panel and it

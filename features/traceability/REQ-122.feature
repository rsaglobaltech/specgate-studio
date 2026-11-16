Feature: Filters: gaps, without a test, waiting for an answer

  @REQ-122 @SCN-363
  Scenario: Without a test, on the desktop
    Given sprich's Traceability open in the desktop app, where SCN-020b is the only scenario no test names
    When the Reviewer chooses the filter without a test
    Then the Reviewer sees one row, SCN-020b, and the filter says it keeps 1 row

  @REQ-122 @SCN-364
  Scenario: Waiting for an answer, in the browser
    Given sprich open in the browser, its REQ-031 blocked by the open question Q2 of draft-pedidos
    When the Reviewer chooses the filter waiting for an answer
    Then the Reviewer sees REQ-031's rows, each naming Q2, and no row of a requirement that no open question blocks

  @REQ-122 @SCN-365
  Scenario: Gaps keep every missing link, in the browser
    Given sprich open in the browser, SCN-020b with no test and SCN-031a with a test and no code
    When the Reviewer chooses the filter gaps
    Then the Reviewer sees SCN-020b and SCN-031a, each saying what it lacks: a test, and code

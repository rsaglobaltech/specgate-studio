Feature: The agent's question is answered inside Live

  @REQ-104 @SCN-307
  Scenario: A question answered on the desktop
    Given the desktop app building REQ-030, and the agent asking "Round to the cent or to the nearest 5 cents?"
    When the Developer answers "to the cent" in Live
    Then the Developer sees the answer recorded under the question and the agent's output continuing

  @REQ-104 @SCN-308
  Scenario: The same question in the browser
    Given the browser showing Live for the same build and question
    When the Developer answers it there
    Then the Developer sees the answer recorded and the question gone from every open tab

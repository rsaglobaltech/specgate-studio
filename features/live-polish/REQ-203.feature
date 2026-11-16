Feature: "Configurar agente" from Build, and Build following `harness.config.yaml`

  @REQ-203 @SCN-606
  Scenario: The agent configured from Build, on the desktop
    Given the desktop app showing Build with REQ-141 ready and no agent set
    When the Developer presses "Configurar agente" and confirms
    Then the Developer sees `specgate agents init --tool claude` run in the terminal, then Build naming the agent `claude` under "Quién programa", without a reload

  @REQ-203 @SCN-607
  Scenario: Cancelled, then set from the terminal, in the browser
    Given the browser showing Build with no agent set
    When the Developer presses "Configurar agente", cancels, then runs `specgate config set agent "claude -p < {prompt_file}"` in the terminal
    Then the Developer sees nothing run on cancel, then Build naming the agent `claude -p < {prompt_file}` without a reload

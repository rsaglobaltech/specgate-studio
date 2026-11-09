Feature: One core host per open project, over typed JSON-RPC

  @REQ-001 @SCN-001
  Scenario: The desktop app opens sprich
    Given the desktop app with no project open
    When the Developer opens the folder `~/mvp/sprich-platform/sprich`
    Then one core host runs for sprich as a sidecar listening on a WebSocket on 127.0.0.1, and Home shows sprich's state, received as the answer to the JSON-RPC request `project.open`

  @REQ-001 @SCN-002
  Scenario: Two browser tabs share one host
    Given `specgate-studio serve` running for `~/mvp/sprich-platform/sprich` on `http://127.0.0.1:4180`
    When the Developer opens that address in a second browser tab
    Then both tabs show sprich from the same core host, and still exactly one core host process runs for sprich

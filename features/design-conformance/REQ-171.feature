Feature: The boards' fonts, colours, 4 px corners and block shadow, shipped with the studio

  @REQ-171 @SCN-511
  Scenario: Home of sprich offline, on the desktop
    Given a Mac with no network and sprich open in the desktop app
    When the Developer opens Home
    Then the Developer sees the title "sprich" and the wordmark in Syne, the text in IBM Plex Sans, `specgate check` in IBM Plex Mono, the next-step card with its orange block shadow and 4 px corners, and no request left 127.0.0.1

  @REQ-171 @SCN-512
  Scenario: The same identity in the browser
    Given sprich in the browser
    When the Developer opens Questions
    Then the Developer sees the ground `#15161A`, the header and the activity bar on `#111215`, the side panel on `#1C1D22`, the primary button in `#FF5B1F`, the status bar in `#B93D0B`, and the question's title in Syne

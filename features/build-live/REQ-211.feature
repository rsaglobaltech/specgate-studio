Feature: What the agent spent as usage, its dollars "≈ precio de API" unless the Developer pays per use

  @REQ-211 @SCN-635
  Scenario: On a subscription, on the desktop
    Given the desktop app after REQ-141 was built for 182 k tokens in 120 turns, Claude Code reporting 1,10 $, and no billing set
    When the Developer looks at the status bar, Home and Live
    Then the Developer sees "Uso" with the tokens and "≈ 1,10 $ precio de API" in each, and "Coste" in none

  @REQ-211 @SCN-636
  Scenario: Paying per use, in the browser
    Given the browser in English, after the same build
    When the Developer opens the "?" of "Billing: pay per use of the API" in the palette, then chooses it
    Then the Developer first reads that it runs no command and only changes how the figure is labelled, then its notice, and "Cost $1.10" in the status bar and Live's header, and no "API price"

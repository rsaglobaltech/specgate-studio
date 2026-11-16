Feature: A change from a ticket is reviewed first, opened on its branch, its commit and push said and confirmed

  @REQ-084 @SCN-247
  Scenario: KAN-13 on its own branch, on the desktop
    Given sprich checked out on `feature/parking/KAN-13`, and the ticket KAN-13 readable from Jira
    When the Developer opens a change from KAN-13 in the desktop app, reviews it, chooses "Don't push yet" and confirms
    Then before confirming they were told it opens on `feature/parking/KAN-13` and will not push, and the studio runs `specgate propose --from-ticket KAN-13 --no-branch --no-push`

  @REQ-084 @SCN-248
  Scenario: Nothing runs before the confirmation, in the browser
    Given the review of KAN-13 shown in the browser
    When the Developer closes it without confirming
    Then no command ran, no branch was created and nothing was committed or pushed

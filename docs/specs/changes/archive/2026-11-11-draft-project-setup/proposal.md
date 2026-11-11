# Proposal: draft-project-setup

## Intent

The project-setup module of the brief (`docs/briefs/phase-2-specgate-flow.md`),
written down as requirements and scenarios a person can review before anything
is built: from an empty folder or a folder with code to a project the studio
can build in — without asking an agent to configure it. Testers onboarding an
existing project with specgate 0.32 had to; specgate 0.33.0 saves what it
detects and says what is ready, and this module shows that in the studio.

## Scope

In scope:

- An empty folder: five questions, the `specgate init` they make, the project
  created in that folder.
- A folder with code: adopted in place after a preview of its files and of the
  settings it saves.
- After either: what is ready (tests, agent, architecture, CI gate) and a
  button for each that is not; the areas found as a map, not requirements.
- Home naming the setup the folder needs.

Out of scope: every other module of the brief; the brief's form (module
brief); building requirements (module build-live).

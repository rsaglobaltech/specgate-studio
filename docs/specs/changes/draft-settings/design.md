# Design: draft-settings

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

Project settings are read and saved through `SpecgatePort` (`specgate config
get|set --json`); user settings in the studio's own `settings.json` in the
user's configuration folder, per operating system. specgate 0.35.0 is expected
to say in JSON where each key lives, with a catalog of keys, and to add keys for
profiles, quality and ALM; the studio builds against it and never edits
specgate's files itself (A6, A7, A12, Q1).

## Channels

<!-- APIs, events, queues. -->

## Decisions


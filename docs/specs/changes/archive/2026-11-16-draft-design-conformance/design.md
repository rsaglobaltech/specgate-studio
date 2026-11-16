# Design: draft-design-conformance

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

UI only, except the next step's sentence, which the core builds from
`specgate status` as it builds the next step today. The fonts are bundled as
WOFF2 files with the UI; the tokens stay in `apps/ui/src/styles.css`. One
side-panel component serves the explorer tree, Changes, Questions and Build.
The help popover reuses the catalog of draft-help: only where and how it opens
changes. Each requirement is proven by a browser test that names it, with a
screenshot compared to its board by eye in review; nothing goes through
`SpecgatePort` that does not today.

## Channels

<!-- APIs, events, queues. -->

## Decisions


# Discover: visual-regression

> Owner: product — what the business needs and why. No technology here: the
> design says how.

## Context

The studio's end-to-end tests read the page's text and attributes. In the
screenshots taken after specgate-1-4-setup, a Developer saw three faults
those tests had passed: the readiness list titled "Create the project" for a
project that existed, a line flush against the card under it, and demo text
("pedidos") in a real project. Each was visible at a glance, and none failed
a test.

## Use case

1. A Developer changes the UI and opens a pull request.
2. The gate compares each key screen with the image kept for it.
3. A screen that changed fails, with the screen as it is now and its
   differences in red, for the Developer to look at.
4. Intended: the Developer rewrites the images in one command, and the
   reviewer sees the new images in the pull request.

## Acceptance criteria

- AC-1: every key screen has an image kept in the repository, per system that draws it.
- AC-2: a screen that differs beyond a small share of its pixels fails, saying how much.
- AC-3: the failure leaves the screen as it is now and an image of its differences.
- AC-4: the images are rewritten in one command when the change is intended.
- AC-5: a screen with no image is written on a Developer's machine and fails on CI, with what it took.
- AC-6: the same screen draws the same on every run: dates, paths and branches do not make it fail.

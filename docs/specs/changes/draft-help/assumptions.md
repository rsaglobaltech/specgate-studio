# Assumptions — draft-help

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The explanation's five parts are labelled What it does · Command · Files it changes · What it does not do · Next (Qué hace · Comando · Archivos que cambia · Qué no hace · Siguiente) | REQ-061, REQ-062, REQ-065 | The brief's five items, as headings a test can find | confirmed |
| A2 | Opening a "?" runs nothing and reads nothing from specgate: explanations are data shipped with the studio | REQ-061, REQ-062 | Help must be instant and safe to click | confirmed |
| A3 | Explanations and notices are a catalog in the core, keyed by action id (`check`, `build`, `apply`, `archive`, `ask-change`, …) and language (`en`, `es`); the UI only renders it | REQ-061 … REQ-065 | Hexagonal (ADR-0001): one source the tests can check for completeness | confirmed |
| A4 | The two languages are English (`en`) and Spanish (`es`), as the workbench's language switch | REQ-065 | The workbench module names Spanish and English | confirmed |
| A5 | The example is sprich, its draft `draft-pedidos` (module `pedidos`) and its requirement REQ-031, as in the brief's core-host and editor examples | REQ-061 … REQ-064 | Values the brief already uses | confirmed |
| A6 | Build runs `specgate harness run --req <REQ>`; Ask for a change writes to the draft's `review.md`; drafting again is `specgate propose --from-brief <module>` | REQ-061 … REQ-064 | What specgate does today | confirmed |
| A7 | A notice of a refused or failed action carries specgate's finding code and fix (`apply_no_test`, "write a test that names REQ-031") | REQ-063 | The port returns findings with code and fix (REQ-012) | confirmed |
| A8 | Read-only features (opening a view, a file, a search) have no "?" required | REQ-061 | The brief names features that write, run, commit, push or send | confirmed |
| A9 | The Reviewer's request text "Orders can be cancelled until they are shipped" | REQ-064 | An example request about Q2's subject (until when an order can be cancelled) | confirmed |

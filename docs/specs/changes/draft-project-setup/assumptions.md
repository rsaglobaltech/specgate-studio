# Assumptions — draft-project-setup

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft. Several follow what specgate 0.33.0
does on its own (the onboarding fixes); the studio shows it, it does not
repeat it.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The five questions are the project's name, what it is (web app, API, mobile, library, desktop…), its stack, the agent that builds it, and its architecture | REQ-111, SCN-331, SCN-332 | What `specgate init`'s wizard asks; the example names a name, a kind, a stack and an agent | confirmed |
| A2 | The example's answers: name "academia", a web app, Node.js and React, Claude Code, the minimal architecture | SCN-331, SCN-332 | The brief's example; minimal is init's default architecture | confirmed |
| A3 | The empty folder is `~/projects/academia`; the studio runs `specgate init` so the project lands in that folder itself (its answers as a config, the folder's parent as `--out`, its name as the slug), not in a folder inside it | REQ-111, SCN-331, SCN-332, SCN-342 | `specgate init --yes` alone scaffolds a sub-folder | confirmed |
| A4 | The folder with code in the adoption scenarios is `~/projects/shop`, a Node.js project with a `package.json` | REQ-112 … REQ-116 | A small project a test can build; the brief names none | confirmed |
| A5 | The preview is `specgate adopt --dry-run`; the files listed include `spec.md`, `AGENTS.md`, `features/adoption/baseline.feature`, `docs/specs/traceability.md`; adoption writes no file that exists and no line of code | REQ-112, SCN-333, SCN-334 | What specgate's adopt does (it skips existing files) | confirmed |
| A6 | Adoption saves `test_cmd` only when the project declares a test command (`test` script) or has test files — `npm test` for shop — and the agent only when its CLI is on the PATH; the preview shows both | REQ-113, SCN-335, SCN-336 | specgate 0.33.0 (REQ-470); a test command with no test fails the first gate | confirmed |
| A7 | The readiness list's items are Tests, Agent, Architecture and CI gate; the CI gate is `.github/workflows/spec-gate.yml`; each unset item's button runs `specgate config set test_cmd`/`arch_cmd` or `specgate agents init --tool <tool>` | REQ-114, SCN-337, SCN-338 | specgate 0.33.0's readiness list (REQ-470, REQ-473) | confirmed |
| A8 | Claude Code is the agent found on the PATH as `claude`; Build runs it as `claude -p < {prompt_file}`, as `config set agent` saves it | SCN-335, SCN-337, SCN-338 | specgate's agent command | confirmed |
| A9 | The areas are read by specgate into `docs/specs/adoption.md`: shop's `src/billing` and `src/invoices` are Billing and Invoices, `src/utils` is not an area; a split mostly into components, hooks, utils gives no area | REQ-115, SCN-339, SCN-340 | specgate's ADR-0041 (REQ-471, REQ-476) | confirmed |
| A10 | The labels "Create the project", "Adopt this folder" and "Specify a behaviour you rely on" are the studio's English ones; the Spanish ones are "Crea el proyecto", "Adopta esta carpeta", "Especifica un comportamiento que ya usas" | REQ-115, REQ-116 | specgate's studio uses them since 0.33.0 | confirmed |
| A11 | Whether a folder is empty, has code or is a specgate project is the workspace module's answer (phase 1, REQ-021) | REQ-116, SCN-341, SCN-342 | Built already | confirmed |
| A12 | The browser runs the same UI from `specgate-studio serve` on `http://127.0.0.1:4180` | SCN-332, SCN-334, SCN-336, SCN-338, SCN-340, SCN-342 | Phase 1 (draft-core-host A2) | confirmed |

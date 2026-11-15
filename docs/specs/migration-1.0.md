# Migration to Specgate 1.0

Written by `specgate migrate 1.0` on 2026-11-15. What it did, and what is still yours to do.

## Open changes in three layers: discover.md, design.md, tasks.md

- moved `docs/specs/changes/approve-layers/proposal.md` to `docs/specs/changes/approve-layers/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/approve-layers/design.md` (a first design, drafted from the proposal)
- updated `docs/specs/changes/approve-layers/change.yaml` (schema: layered)
- moved `docs/specs/changes/demo-findings/proposal.md` to `docs/specs/changes/demo-findings/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/demo-findings/design.md` (a first design, drafted from the proposal)
- updated `docs/specs/changes/demo-findings/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-brief/proposal.md` to `docs/specs/changes/draft-brief/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-brief/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-brief/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-brief/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-changes/proposal.md` to `docs/specs/changes/draft-changes/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-changes/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-changes/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-changes/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-design-conformance/proposal.md` to `docs/specs/changes/draft-design-conformance/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-design-conformance/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-design-conformance/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-design-conformance/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-desktop/proposal.md` to `docs/specs/changes/draft-desktop/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-desktop/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-desktop/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-desktop/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-explorer-tree/proposal.md` to `docs/specs/changes/draft-explorer-tree/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-explorer-tree/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-explorer-tree/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-explorer-tree/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-live-polish/proposal.md` to `docs/specs/changes/draft-live-polish/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-live-polish/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-live-polish/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-live-polish/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-report/proposal.md` to `docs/specs/changes/draft-report/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-report/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-report/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-report/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-settings/proposal.md` to `docs/specs/changes/draft-settings/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-settings/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-settings/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-settings/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-traceability/proposal.md` to `docs/specs/changes/draft-traceability/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-traceability/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-traceability/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-traceability/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-workbench/proposal.md` to `docs/specs/changes/draft-workbench/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-workbench/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-workbench/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-workbench/change.yaml` (schema: layered)
- moved `docs/specs/changes/draft-workbench-v2/proposal.md` to `docs/specs/changes/draft-workbench-v2/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/draft-workbench-v2/design.md` (a first design, drafted from the proposal)
- wrote `docs/specs/changes/draft-workbench-v2/tasks.md` (the developer's layer)
- updated `docs/specs/changes/draft-workbench-v2/change.yaml` (schema: layered)
- moved `docs/specs/changes/specgate-1-0/proposal.md` to `docs/specs/changes/specgate-1-0/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/specgate-1-0/design.md` (a first design, drafted from the proposal)
- updated `docs/specs/changes/specgate-1-0/change.yaml` (schema: layered)
- moved `docs/specs/changes/workspace-repos/proposal.md` to `docs/specs/changes/workspace-repos/discover.md` (the proposal is the Discover, word for word)
- wrote `docs/specs/changes/workspace-repos/design.md` (a first design, drafted from the proposal)
- updated `docs/specs/changes/workspace-repos/change.yaml` (schema: layered)

## Configuration versions

Nothing to change.

## Lanes, not roles

Nothing to change.

## Roles and approvals

Nothing to change.

## Still to do

- Review docs/specs/changes/approve-layers/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate approve-layers: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/demo-findings/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate demo-findings: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-brief/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-brief: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-changes/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-changes: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-design-conformance/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-design-conformance: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-desktop/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-desktop: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-explorer-tree/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-explorer-tree: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-live-polish/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-live-polish: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-report/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-report: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-settings/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-settings: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-traceability/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-traceability: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-workbench/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-workbench: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/draft-workbench-v2/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate draft-workbench-v2: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/specgate-1-0/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate specgate-1-0: a 0.27 proposal often names technology the Discover should leave to the design.
- Review docs/specs/changes/workspace-repos/design.md: the architect answers each acceptance criterion (AC-1…) there.
- Run specgate change validate workspace-repos: a 0.27 proposal often names technology the Discover should leave to the design.
- Name who holds product, architect and developer under `roles:` in harness.config.yaml (ADR-0045); until then a role is open to anyone.
- The harness now builds a layered change only once its layers are approved: `specgate change approve <id> --layer discover|design|tasks` — or set `approvals: { required: never }` to keep 0.27's behaviour.

# Proposal: approve-layers

## Intent

specgate 1.0 builds a change only once each of its written layers is approved — discover by product, design by the architect, tasks by the developer. Since specgate-1-0, Changes shows each layer and whether it waits, but approving one still meant leaving the studio for a terminal and typing `specgate change approve <change> --layer <layer>`.

## Scope

In scope:

- REQ-217: an "Approve <layer>" / "Aprobar <layer>" button, with its "?", beside each written layer of a change that is not approved yet, running `specgate change approve <change> --layer <layer>` with `--json`; its notice names `approvals.json`, or specgate's refusal and its fix.

Out of scope:

- Approving a 0.x change, which has no layers: `specgate change approve <change>` in the terminal, as before.
- Who may approve which layer: specgate decides it from `roles:` and the person git names; the studio does not check it again.

## Approach

A new command `change-approve` with the change and one of the three layers, validated like every command from the wire; `Commands` reads `approve.ok` from the answer to name `approvals.json`; a help entry `approve` in English and Spanish; the button in Changes' layer list.

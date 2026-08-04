# src CONTRACT

<!-- BEGIN INHERITED — generated from .agents/cg/principles/ · do not edit -->
<!-- END INHERITED -->

<!--
  Leave the two markers above empty and adjacent on a fresh install. This folder is listed in
  `.agents/cg/map/inheritance.json` with the rule IDs that bind it; `cg sync` fills the block in
  and `cg verify` fails if anyone hand-edits it. Never write rules between the markers by hand.

  This file is a working example, not a fixture. Rename the folder, rewrite every section,
  and update `inheritance.json` to match — or delete both and add your own modules.
-->

## Module Identity
- Purpose: <one-sentence module purpose>.
- Owns: <bounded capabilities and components owned by this module>.
- Depends on: <allowed upstream and downstream module dependencies>.

## Allowed Responsibilities
- <responsibility this module is the right home for>

## Forbidden Responsibilities
- <responsibility that belongs to a sibling, and where it belongs instead>

## Hard Invariants
- <something that must always hold here, stated so a test could fail on it>

## Key Entry Points
- <the class, interface, or endpoint another module calls>

## Integration Boundaries
- Incoming: <who may call in, through what port>
- Outgoing: <what this module may call, and how>
- Forbidden Directions: <dependency directions that must never be introduced>

## Verify Command
`<the command that tests this module>` — how an agent scoped to this folder checks its own work.

## Sibling Contracts
<relative paths to the contracts this folder interacts with, so a scoped agent knows what exists
beyond its window without loading it>

## Agent Workflow Hook
Before changing this module:
1. Read the inherited rules above; read `../.agents/cg/principles/` for the full text.
2. Read `../.agents/cg/workflow.md` and this contract.
3. Update this contract when boundaries, invariants, dependency rules, or entry points change.

## Update Checklist
- Any boundary or dependency-direction change captured here?
- Any new or removed entry point reflected here?
- Any invariant changed and re-stated here?
- Any future-agent operational assumption missing?

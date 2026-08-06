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
- Project role: <why the parent system contains this module and how it uses the capability>.
- Parent contract: <relative path to the contract that owns this module, or repository root>.
- Used by: <modules, surfaces, or actors that enter through this module's public boundary>.
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

## Child Contracts
<relative paths to sub-module contracts, with one phrase saying how each child decomposes this
module's responsibility. An agent follows only the children relevant to its task. Write `None —
leaf module` only when this contract already describes the smallest owned boundary.>

## Verify Command
`<the command that tests this module>` — how an agent scoped to this folder checks its own work.

## Sibling Contracts
<relative paths to the contracts this folder interacts with, so a scoped agent knows what exists
beyond its window without loading it>

## Agent Workflow Hook
Before changing this module:
1. Read the inherited rules above; read `../.agents/cg/principles/` for the full text.
2. Read `../.agents/cg/workflow.md` and this contract to understand how the project uses the module.
3. Follow Child Contracts until the smallest responsible sub-module is clear; only then read its
   implementation.
4. Update this contract when project role, child composition, boundaries, invariants, dependency
   rules, or entry points change.

## Update Checklist
- Any boundary or dependency-direction change captured here?
- Any change to how the parent uses this module captured here?
- Any child contract added, removed, or repurposed?
- Any new or removed entry point reflected here?
- Any invariant changed and re-stated here?
- Any future-agent operational assumption missing?

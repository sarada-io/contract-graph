# <module-name> CONTRACT

<!-- BEGIN INHERITED — generated from .agents/cg/principles/architecture.md · do not edit -->
<!-- END INHERITED -->

<!--
  Leave the two markers above empty and adjacent. Add this folder to
  `.agents/cg/map/inheritance.json` with the rule IDs that bind it, then run
  `cg sync` — the generator fills the block in and `cg verify`
  fails if anyone hand-edits it. Never write rules between the markers by hand.
-->

## Module Identity
- Purpose: <one-sentence module purpose>.
- Owns: <bounded capabilities and components owned by this module>.
- Depends on: <allowed upstream/downstream module dependencies>.

## Allowed Responsibilities
- <responsibility 1>
- <responsibility 2>
- <responsibility 3>

## Forbidden Responsibilities
- <forbidden 1>
- <forbidden 2>
- <forbidden 3>

## Hard Invariants
- <invariant 1 that must always hold>
- <invariant 2 that must always hold>
- <invariant 3 that must always hold>

## Key Entry Points
- <class/interface/endpoint 1>
- <class/interface/endpoint 2>
- <class/interface/endpoint 3>

## Integration Boundaries
- Incoming: <who may call into this module and through what ports/interfaces>
- Outgoing: <which modules/services this module can call and how>
- Forbidden Directions: <dependency directions that must never be introduced>

## Verify Command
`<the command that tests this module>` — how an agent scoped to this folder checks its own work.

## Sibling Contracts
<relative paths to the contracts this folder interacts with, so a scoped agent knows what
exists beyond its window without loading it — e.g. `../../../<sibling-module>/.agents/cg/contract.md`>

## Agent Workflow Hook
Before changing this module:
1. Read the inherited rules above; read `../../../.agents/cg/principles/architecture.md` for the full text if the
   repository root is reachable.
2. Read `../../../.agents/cg/workflow.md` and this contract.
3. Update this contract when boundaries, invariants, dependency rules, or entry points change.

## Update Checklist
- Any boundary or dependency-direction change captured here?
- Any new/removed entry point reflected here?
- Any invariant changed and re-stated here?
- Any stale package/module name removed?
- Any future-agent operational assumption missing?
- Is this file still readable near the suggested 200-line threshold? If it grows past that signal,
  consider whether the implementation owns more than one real boundary. Never split a folder or
  shrink governing truth solely to satisfy the threshold.

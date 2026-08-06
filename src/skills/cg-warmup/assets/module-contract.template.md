# <module-name> CONTRACT

<!-- BEGIN INHERITED — generated from .agents/cg/principles/ · do not edit -->
<!-- END INHERITED -->

<!--
  Leave the two markers above empty and adjacent. Add this folder to
  `.agents/cg/map/inheritance.json` with the rule IDs that bind it, then run
  `cg sync` — the generator fills the block in and `cg verify`
  fails if anyone hand-edits it. Never write rules between the markers by hand.
-->

<!--
  Replace every <angle-bracket> placeholder. Where you genuinely could not determine
  the answer, leave an HTML comment reading "Replace this section" in its place and
  raise a decision-log entry for it — a marker with nothing behind it is a hole nobody
  finds again.
-->

## Module Identity
- Purpose: <one-sentence module purpose>.
- Project role: <why the parent system contains this module and how it uses the capability>.
- Parent contract: <relative path to the contract that owns this module, or repository root>.
- Used by: <modules, surfaces, or actors that enter through this module's public boundary>.
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

## Child Contracts
<relative paths to sub-module contracts, with one phrase saying how each child decomposes this
module's responsibility. An agent follows only the children relevant to its task. Write `None —
leaf module` only when this contract already describes the smallest owned boundary.>

## Verify Command
`<the command that tests this module>` — how an agent scoped to this folder checks its own work.

## Sibling Contracts
<relative paths to the contracts this folder interacts with, so a scoped agent knows what
exists beyond its window without loading it — e.g. `../../../<sibling-module>/.agents/cg/contract.md`>

## Agent Workflow Hook
Before changing this module:
1. Read the inherited rules above; read `../../../.agents/cg/principles/` for the full text if the
   repository root is reachable.
2. Read `../../../.agents/cg/workflow.md` and this contract to understand how the project uses
   this module.
3. Follow Child Contracts until the smallest responsible sub-module is clear; only then read its
   implementation.
4. Update this contract when project role, child composition, boundaries, invariants, dependency
   rules, or entry points change.

## Update Checklist
- Any boundary or dependency-direction change captured here?
- Any change to how the parent uses this module captured here?
- Any child contract added, removed, or repurposed?
- Any new/removed entry point reflected here?
- Any invariant changed and re-stated here?
- Any stale package/module name removed?
- Any future-agent operational assumption missing?
- Is this file still readable near the suggested 200-line threshold? If it grows past that signal,
  consider whether the implementation owns more than one real boundary. Never split a folder or
  shrink governing truth solely to satisfy the threshold.

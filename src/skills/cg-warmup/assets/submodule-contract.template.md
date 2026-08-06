# <sub-module-name> CONTRACT

<!-- BEGIN INHERITED — generated from .agents/cg/principles/ · do not edit -->
<!-- END INHERITED -->

<!--
  Leave the two markers above empty and adjacent. Add this folder to
  `.agents/cg/map/inheritance.json` with `"kind": "folder"`, a `depth` matching its
  segment count, and the rule IDs that bind it, then run `cg sync`.
-->

## Scope
- Purpose: <the one responsibility this sub-module owns, in a sentence>.
- Project role: <why the parent module contains this unit, and what the parent does with it>.
- Parent contract: <relative path to the module contract that declares this child>.
- Used by: <the callers that enter through this boundary — usually the parent, sometimes a sibling>.

## Forbidden Responsibilities
- <what must never move here, even though it would be convenient>
- <the neighbouring responsibility this unit is most likely to absorb>

## Hard Invariants
- <what must hold no matter who edits this folder>

## Key Entry Points
- <the types or functions callers actually reach for>

## Child Contracts
<relative paths to narrower contracts, with one phrase each on how they decompose this scope.
Write `None — leaf` when this contract already describes the smallest owned boundary. Most
sub-modules are leaves; say so explicitly rather than omitting the section.>

## Verify Command
`<the command that tests this folder>` — the smallest command that proves a change confined here.

## Sibling Contracts
<relative paths to the contracts this folder interacts with, so a scoped agent knows what exists
beyond its window without loading it>

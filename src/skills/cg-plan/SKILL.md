---
name: cg-plan
description: Create or revise a phase-wise Contract Graph roadmap from binding contracts, measured repository truth, and cg-sign-off successor handovers. Use when a broad product, architecture, migration, restructuring, or completion finding must be divided into ordered phases before one phase is prepared as sequential executable Steps. Defines phase outcomes, dependencies, acceptance gates, risks, assumptions, and status without allocating files, Steps, branches, or execution contexts; hands one selected phase to cg-prepare.
---

# CG Plan

Turn a broad outcome into an ordered phase roadmap. Do not prepare implementation Steps here.

Read `.agents/skills/cg-unblock/SKILL.md` only when a fork fails D-1: unresolvable from contracts
and accepted decisions, material, costly to reverse, and nothing else can proceed.

## Required outcome

Finish with all eight true:

1. The roadmap names the final product or architecture outcome.
2. Current repository truth and prerequisites are measured.
3. Work is divided into ordered phases with no hidden dependency cycles.
4. Every phase has one observable outcome and one acceptance gate.
5. Risks, costs, assumptions, and protected decisions are explicit.
6. Every phase status is exactly one of `Current`, `Blocked`, `Complete`, or `Future`.
7. One phase can be selected and handed to `cg-prepare` without redesigning the roadmap.
8. The response ends with the `Next action` block in §9.

## 1. Establish truth

Before writing or revising the roadmap:

1. Load `.agents/cg/principles/architecture.yaml`. Apply `hierarchy.kinds` and `graph` when
   dividing work across boundaries.
2. Load `.agents/cg/contract.yaml`. Run `cg contract route --task "<outcome>"`. Load only the
   matched contracts and their named children; then scoped `P` rules on those contracts, then the
   repository constitution and specifications. Consult `E` only for a remaining design fork; it is
   not a compliance list and does not replace `graph`. Run `cg graph show` if composition is still
   unclear.
3. Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with
   `cg residue`, which prints `<docs>/plans/`. Find the active roadmap by `Status: Proposed` or
   `Status: Active` under `<docs>/plans/*/roadmap.md`, not by filename.
4. Inspect source, tests, resources, and the worktree inside the selected units only.
5. Run `cg verify` and the narrowest useful baseline. Record existing failures as facts.
6. Read accepted decisions in `<docs>/plans/decision-log.md`.
7. If invoked from `cg-sign-off`, validate the handover against the fields in §8 before placing it.

Record measured facts separately from proposals. The roadmap is transient: current behavior stays
in contracts. Do not cite a plan path as the source of a rule.

## 2. Define the final outcome

State:

- the user or operator outcome;
- the final ownership and trust boundaries;
- what is deliberately removed or unchanged;
- the command or evidence that proves the programme is complete.

Do not use a directory name or diagram as proof that the target already exists.

## 3. Design phases

Each phase delivers one independently verifiable change in capability or architecture.

| Phase | Observable outcome | Prerequisites | Scope | Acceptance gate | Status |
|---|---|---|---|---|---|
| 1 | user/system result | decisions/phases | contract nodes | command/evidence | Future |

Phase status is exactly one of: `Current` (selected or in delivery), `Blocked`, `Complete`, `Future`.

Rules:

- Start with a walking skeleton when a new shape must be established.
- Put published boundaries before their consumers.
- Put migrations before removal of the compatibility path.
- Put production measurement after the environment it measures exists.
- Name the components, libraries, sub-modules, or modules a phase introduces. Each is a node in
  the context graph: pick its `hierarchy.kinds` value and apply `graph` (stay, add-child, elsewhere).
  A self-sufficient unit owes its own contract when it is delivered — say so here so preparation
  allocates it.
- Do not create phases merely to distribute equal amounts of work.
- Never assign files, execution Steps, or branches in this skill.

## 4. Make dependencies explicit

For every phase, name:

- prior phases it requires;
- owner decisions that block it;
- external systems, credentials, data, or environments it requires;
- what independent work may continue while a prerequisite is blocked.

If two proposed phases repeatedly modify one atomic migration or must land together to work, they
are one phase.

## 5. Define acceptance

Every phase has one acceptance gate that proves its outcome. It may call several checks, but it must
be runnable or objectively measurable. Write the command or evidence for this phase's outcome, not
a copy of every later concern.

Detailed Step tests and per-Step `Done when` commands belong to `cg-prepare`.

## 6. Record decisions and assumptions

Follow `cg-unblock`. Put reversible assumptions in this roadmap with a bounded reversal. Log
protected or costly choices in the decision log. Continue planning phases the unresolved choice
does not affect.

Do not hide a product decision inside phase ordering.

## 7. Roadmap format and where it lives

Write `<docs>/plans/<programme>/roadmap.md`. The programme slug names the outcome, not a date or
ticket. One folder per programme:

```
<docs>/plans/<programme>/roadmap.md
<docs>/plans/<programme>/<phase>_detailed_preparation.md
```

Do not put a roadmap at `<docs>/plans/` with phase files as siblings. `cg-prepare` writes each phase
document; the roadmap links it. `cg residue` treats `<programme>/roadmap.md` as a root: link every
other file under the folder from it.

The roadmap contains:

```markdown
# <programme or workstream>
Status: <Proposed | Active | Complete>

## Final outcome
<observable end state>

## Measured baseline
<facts and existing failures>

## Assumptions and decisions
<references and reversible assumptions>

## Phase map
<ordered phase table>

## Dependencies and risks
<phase graph, blockers, cost, operations>

## Completion handovers
<unconsumed or consumed successor inputs from cg-sign-off>

## Programme completion gate
<command or objective evidence>
```

## 8. Handoff to preparation

Select exactly one phase whose prerequisites are satisfied. Mark it `Current`. Give `cg-prepare`:

- the roadmap and selected phase;
- its outcome, scope, dependencies, and acceptance gate;
- relevant contracts and accepted decisions; and
- the repository execution context policy.

`cg-prepare` may refine implementation Steps but must not change the phase outcome. A changed
outcome returns to `cg-plan`.

For a `cg-sign-off` successor handover, first place the finding into a new or existing roadmap
phase with an explicit dependency on its source phase. Validate evidence, affected scope, contract
and decision impact, proposed acceptance gate, dependencies, blocking status, and the reason it
cannot be repaired safely within its source phase. Do not pass an unplanned defect directly to
execution or treat a handover as evidence that the source phase passed. Mark it Consumed with the
receiving phase only after that phase exists.

## Stage boundary — yield here

**Finish your stage, then return to the user.** Do not invoke the next skill yourself, however
obvious the route is. The `Next action` block names the successor so a person can choose it and so
`cg-auto-run` can follow it under a granted authority — naming it is not permission to take it.
The single exception is a dispatch from `cg-auto-run`. If you were not dispatched by it, you are
the last stage of this turn.

## 9. Next-action response

Choose exactly one immediate route from the measured roadmap:

- selected phase ready: use `cg-prepare` with that phase;
- protected decision blocks selection: use `cg-unblock` with the exact decision-log entry;
- programme outcome already complete: name no next skill.

End the user-facing response with:

```markdown
## Next action — <Ready | Blocked | Programme complete>
- **User action:** <one concrete action>
- **Next input:** <$cg-prepare | $cg-unblock | None — programme complete> — <exact roadmap, selected phase, handover, or decision entry>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Do not say only "continue" or list several possible next skills. Name the selected phase when
`cg-prepare` is next.

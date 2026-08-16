---
name: cg-plan
description: Create or revise a phase-wise Contract Graph roadmap from binding contracts, measured repository truth, and cg-sign-off successor handovers. Use when a broad product, architecture, migration, restructuring, or completion finding must be divided into ordered phases before one phase is prepared as sequential executable Steps. Defines phase outcomes, dependencies, acceptance gates, risks, assumptions, and status without allocating files, Steps, branches, or execution contexts; hands one selected phase to cg-prepare.
---

# CG Plan

Turn a broad outcome into an ordered phase roadmap. Do not prepare implementation Steps here.
Read `.agents/skills/cg-unblock/SKILL.md` when a fork fails D-1, not before.

## Required outcome

Finish with all eight true:

1. The roadmap names the final product or architecture outcome.
2. Current repository truth and prerequisites are measured.
3. Work is divided into ordered phases with no hidden dependency cycles.
4. Every phase has one observable outcome and one acceptance gate.
5. Risks, costs, assumptions, and protected decisions are explicit.
6. Current, completed, blocked, and future phases are distinguishable.
7. One phase can be selected and handed to `cg-prepare` without redesigning the roadmap.
8. The user-facing response names the next action, next skill, input artifact, and readiness
   condition.

## 1. Establish truth

Before writing or revising the roadmap:

1. Read the global structural binding catalog, repository constitution and specifications,
   workflow, contract map, and applicable scoped `P` rules. Apply `.agents/cg/principles/architecture.yaml`
   `hierarchy.kinds` and `graph` (recurse, selfSufficient, surface, adapters, stay, add-child, elsewhere) when dividing
   work across boundaries. Consult `E` guidance only when the work reaches a
   remaining design decision; those are not compliance rules and do not replace `graph`.
2. Find the active roadmap by status rather than filename.
3. Load only contracts needed to understand the target and confirmed dependencies.
4. Inspect the actual source, tests, resources, build graph, and current worktree.
5. Run the repository's contract gate and the narrowest useful baseline.
6. Read accepted decisions and use `cg-unblock` for unresolved forks.
7. If invoked from `cg-sign-off`, validate the completion handover's evidence, affected scope,
   contract and decision impact, proposed acceptance gate, dependencies, blocking status, and
   reason it cannot be repaired safely within its source phase.

Record measured facts separately from proposals.

## 2. Define the final outcome

State:

- the user or operator outcome;
- the final ownership and trust boundaries;
- what is deliberately removed or unchanged;
- the required quality, security, cost, and operational properties;
- the command or evidence that proves the programme is complete.

Do not use a directory name or diagram as proof that the target already exists.

## 3. Design phases

Each phase delivers one independently verifiable change in capability or architecture.

Use this table:

| Phase | Observable outcome | Prerequisites | Scope | Acceptance gate | Status |
|---|---|---|---|---|---|
| 1 | user/system result | decisions/phases | modules or capabilities | command/evidence | Proposed |

Rules:

- Start with a walking skeleton when a new shape must be established.
- Put published boundaries before their consumers.
- Put migrations before removal of the compatibility path.
- Put production measurement after the environment it measures exists.
- Name the components, libraries, sub-modules, or modules a phase introduces. Each is a node in
  the context graph: pick its `hierarchy.kinds` value and apply `graph` (recurse, selfSufficient,
  adapters, stay, add-child, elsewhere). It owes its own contract when it is delivered — say so here so
  preparation allocates it, rather than leaving the graph to be reconstructed later.
- Keep a phase small enough to prepare and complete without carrying half-applied invariants.
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
be runnable or objectively measurable.

Include, where relevant:

- positive product behavior;
- negative security or ownership behavior;
- migration completeness and residue absence;
- contract and detector verification;
- cost or operational measurement.

Detailed Step tests and per-Step `Done when` commands belong to `cg-prepare`.

## 6. Record decisions and assumptions

Use `cg-unblock` to:

- apply existing contracts and accepted decisions;
- record reversible assumptions with a bounded reversal;
- log protected or costly choices for owner review;
- continue planning phases unaffected by an unresolved choice.

Do not hide a product decision inside phase ordering.

## 7. Roadmap format and where it lives

Write the roadmap to `docs/plans/<programme>/roadmap.md`, and give the programme a slug that names
the outcome rather than a date or a ticket. Every artifact the programme produces lives beside it:

```
docs/plans/<programme>/roadmap.md
docs/plans/<programme>/<phase>_detailed_preparation.md
```

One document per phase, holding every Step. `cg-prepare` writes it; the roadmap links it.

One folder per programme, because closing one must be a single move. A roadmap at the top of
`docs/plans/` with its phases as siblings leaves nothing saying which phase belongs to which
programme, and archiving means chasing a roadmap plus every phase separately — which is how a
half-finished move leaves an empty folder behind that `git status` cannot see.

`cg residue` treats `<programme>/roadmap.md` as a root: nothing links to a roadmap, it is where a
reader starts. Everything else under the programme folder must be reachable by a link from it, so
link each phase document from the roadmap as you write it.

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

Select exactly one phase whose prerequisites are satisfied. Give `cg-prepare`:

- the roadmap and selected phase;
- its outcome, scope, dependencies, and acceptance gate;
- relevant contracts and accepted decisions; and
- the repository execution context policy.

`cg-prepare` may refine implementation Steps but must not change the phase outcome. A changed
outcome returns to `cg-plan`.

For a `cg-sign-off` successor handover, first place the finding into a new or existing roadmap
phase with an explicit dependency on its source phase. Do not pass an unplanned defect directly to
execution or treat a handover as evidence that the source phase passed. Mark it Consumed with the
receiving phase only after that phase exists.

## Stage boundary — yield here

**Finish your stage, then return to the user.** Do not invoke the next skill yourself, however
obvious the route is. The `Next action` block names the successor so a person can choose it and so
`cg-auto-run` can follow it under a granted authority — naming it is not permission to take it.

Crossing a stage boundary unasked removes the review the boundary exists for. Someone who runs this
skill to read what it produced, and gets back a closed phase instead, cannot act on the thing they
asked for: the decision point is gone and the work is already downstream of it.

Continuing *within* your own stage is different and expected — `cg-produce` drains its queue, and a
resumed Step is the same stage, not a new one. The rule is one stage per invocation, not one unit
of work per invocation.

The single exception is a dispatch from `cg-auto-run`, which holds an explicit authority level, a
stage budget, and a ledger. If you were not dispatched by it, you are the last stage of this turn.

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

## Completion check

- [ ] Final outcome is observable.
- [ ] Phases are ordered by real dependencies.
- [ ] Every phase has one outcome and acceptance gate.
- [ ] No file, Step, branch, or execution-context allocation leaked into roadmap design.
- [ ] Risks, costs, assumptions, and protected decisions are explicit.
- [ ] The selected phase is ready for `cg-prepare`.
- [ ] The response ends with one exact next action and skill.

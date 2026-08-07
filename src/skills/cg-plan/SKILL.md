---
name: cg-plan
description: Create or revise a phase-wise Contract Graph roadmap from binding contracts, measured repository truth, and cg-sign-off successor handovers. Use when a broad product, architecture, migration, restructuring, or completion finding must be divided into ordered phases before one phase is prepared as sequential executable Steps. Defines phase outcomes, dependencies, acceptance gates, risks, assumptions, and status without allocating files, Steps, branches, or execution contexts; hands one selected phase to cg-prepare.
---

# Contract Graph Plan

Turn a broad outcome into an ordered phase roadmap. Do not prepare implementation Steps here.
Read `.agents/skills/cg-unblock/SKILL.md` alongside this skill.

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

1. Read the repository constitution, principles, workflow, and contract map.
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
  the context graph and owes its own contract when it is delivered — say so here so preparation
  allocates it, rather than leaving the graph to be reconstructed later.
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

## 7. Roadmap format

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

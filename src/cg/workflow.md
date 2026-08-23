# Repository Agent Workflow

This is the default delivery workflow installed by Contract Graph. It is repository-owned and
preserved by later `cg init` runs, so an adopting repository may keep it, amend it, or integrate it
with a workflow supplied by SpecKit or another framework. While retained, its sequence governs
repository code tasks. The separate `.agents/cg/principles/architecture.yaml` remains the machine-enforced
source for Contract Graph structural integrity.

## Development Principles

1. **Specs are the behavioral source of truth; contracts are the structural source of truth.**
   Generated code is disposable; neither product intent nor the graph describing its ownership is.
   Fold behavioral clarification into the specification and structural change into the affected
   YAML contracts.
2. **Requirement and rule IDs are stable.** Redefine in place or append — never renumber.
3. **Small vertical slices**, small enough that skimming the diff is genuinely feasible. Skim
   every one — not for correctness (tests cover that) but for whether the agent solved the
   problem you meant.
4. **Walking skeleton before features.** The first deployed slice goes end to end and is read
   line by line. Everything after is pattern-matched to it.
5. **Verify with commands.** Never assert something works without running the build, the tests,
   or the check.
6. **Decide, don't ask live.** Unspecified detail is resolved from the principles, the existing
   code, or the owner's recorded priors — and logged as an assumption — not escalated. Stopping
   mid-task costs the slice; a wrong reversible decision costs one edit. Follow
   `.agents/skills/cg-unblock/SKILL.md`: it is binding for every non-trivial task. Its Rule D-4
   requires every surviving question to be enumerated at plan time; Rule D-5 requires it be
   **logged as a `DU-NN` entry in `docs/plans/decision-log.md`**, not asked in chat, unless the
   entire remaining task is blocked with nothing else to work on.

After structural bindings, scoped product rules, the repository constitution, contracts, accepted
decisions, durable requirements, and existing green patterns have been applied, load only the
guidance relevant to the remaining fork from `.agents/cg/guidelines/`. Cite any preference used, its
reason, and its stated cost into the assumption or decision. `E` practices are
decision inputs, never inherited ambient rules and never compliance findings. The recursive
mapping and node decision — kinds, self-sufficiency, stay, add a child, or route elsewhere —
live in `.agents/cg/principles/architecture.yaml` `hierarchy` and `graph`, not in
this workflow, so a SpecKit (or other) delivery workflow cannot drop them by replacing this file.
During harvest, use `cg-unblock` D-5a: route a recurring decision once to a contract invariant, an
`E` guideline, an A promotion candidate, a scoped P binding, or drop.

## Required Sequence

1. Read `.agents/cg/contract.yaml` directly or with `cg contract show`.
2. Read `.agents/cg/principles/architecture.yaml`; its `hierarchy.kinds` and `graph` sections are the
   recursive mapping and node decision, and its A rules bind every governed boundary.
3. Read the repository's specification or constitution and resolve applicable P IDs from the
   selected contracts. Consult `E` only when it is relevant to a decision.
4. Identify impacted boundaries with `cg contract route --task "<request>"` and contract-owned routes.
5. Load those module contracts, then traverse their child-contract links until the smallest
   responsible boundary is clear. Before reading or editing implementation, apply
   `.agents/cg/principles/architecture.yaml` `graph`: stay on this node, add a child node, or route
   elsewhere. Recurse until `graph.selfSufficient` and `graph.stop` say this node is the leaf.
   If placement is wrong, re-route or prepare that graph change — do not add the
   behavior to the boundary already opened. Read implementation only after this placement is known.
6. Use `cg-plan` to create or update the phase-wise roadmap for non-trivial work.
7. Use `cg-prepare` to turn one selected phase into one prioritized, dependency-ordered Step queue
   in a single execution branch or worktree.
8. Use `cg-produce` to run the earliest `Ready` Step, one at a time. After each verified handoff,
   recalculate the queue and continue through ready work until every Step is `Complete` or no
   `Ready` Step remains. Never execute Steps concurrently.
9. Every new class ships with its own test coverage in the same change; every materially modified
   class has its existing tests updated or extended to cover the change. A passing build is not
   evidence of this by itself — a new/changed class with no corresponding test file or test method
   is incomplete, whether or not everything else compiles and the existing suite is green.
10. If behavior, boundaries, invariants, entry points, or operational assumptions changed, the
   executing Step updates impacted contract(s) and detectors in the same change.
11. Use `cg-sign-off` to verify the accumulated Step sequence, drive defects through corrective
    Steps and re-verification, and close the selected phase only when its acceptance gate passes.

A task that changes behavior but skips contract updates is incomplete. A task that adds or
materially changes a class but skips its test coverage is incomplete the same way.

Contract correctness is an execution responsibility. `cg-prepare` assigns each required contract
change to the Step that changes the behavior; `cg-produce` changes the contract and detector with
the implementation; `cg-sign-off` verifies the accumulated result. When completion finds a
current-phase defect, it owns the repair loop: completion-only composition work is fixed directly,
while behavior- or contract-affecting work is run through a corrective `cg-produce` Step.
`cg-prepare` is used first only when the remaining order or editable paths must change.
`cg-sign-off` never edits a contract outside an execution Step, and its documentation half never
repairs contract truth: a stale contract found while writing the durable record returns to
`cg-produce` as a corrective Step.

`cg-sign-off` may create a successor handover for `cg-plan` or `cg-prepare` only when the finding
is genuinely outside the selected phase or exposes a missing prerequisite or outcome error that
requires roadmap correction. The handover must contain evidence, current and required behavior,
affected scope, contract and decision impact, a proposed acceptance gate, dependencies, blocking
status, and the reason it cannot be fixed safely in the selected phase. Only truly out-of-scope
work may be carried forward while closing a green phase. A failing phase acceptance gate remains
Incomplete or Blocked and must not be archived as Complete.

## Sequential Execution Rule

Core Contract Graph execution uses one branch or worktree for the whole selected phase and exactly one Step
`In progress` at a time. Preparation gives every Step a stable priority number, explicit
dependencies, exact blockers, and one state: `Waiting`, `Ready`, `Blocked`, `In progress`, or
`Complete`.

The executor always selects the lowest-numbered `Ready` Step. A Step is `Ready` only when every
declared dependency is `Complete`, no unresolved decision or external prerequisite blocks it, and
the current verified phase state satisfies its brief. After each handoff or decision answer, queue
states are recalculated deterministically.

A blocked Step is deferred, never skipped or waived. A later independent Step may run only when
its declared dependencies are complete and it neither consumes nor overwrites the blocked Step's
paths or handoff. Every repeated path creates an explicit dependency. If no `Ready` Step remains,
execution yields one consolidated blocker/decision set; after answers are recorded, execution
resumes from the recalculated earliest `Ready` Step. Completion requires every prepared Step to be
`Complete`.

Do not create per-Step branches, merge or rebase Steps, or run prepared Steps concurrently.

Independently enforced module roots may become a future
low-context parallel execution extension, but that extension is not part of core Contract Graph yet. It
requires automated root-confined write detection, no worker Git operations, no shared root build,
contract, generated, or cross-root seam writes, and coordinator-owned serialization of verification
and commits. Until those controls exist, `cg-prepare` emits sequential Steps only.

## Mandatory Next-Action Response

Every completed Contract Graph skill invocation, including a blocked or corrective result, ends its
user-facing response with exactly one `Next action` block:

```markdown
## Next action — <measured lifecycle status>
- **User action:** <one concrete action>
- **Next input:** <$cg-skill | None — terminal reason> — <exact artifact, brief, decision, or evidence>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Two body lines on an advancing status, three when something stops. The measured lifecycle status is
carried by the heading so a blocked or failed result is distinguishable at a glance, and the route
skill leads `Next input` as a `$cg-` token so the next hop stays mechanically extractable rather
than buried in prose.

**`Blocked by` appears if and only if the status does not advance.** On a green route it is omitted
entirely: a precondition that is already satisfied is not information, and a mandatory field with
nothing to say gets padded with restated status or completed-work evidence. Its presence is also the
single stop signal any auto-advance adapter reads — a block carrying `Blocked by` is never followed
automatically, at any authority level.

Select the immediate route from measured state. Do not list several possible skills, say only
"continue", or make the user infer which phase, Step, repair, or decision comes next. A prepared
phase names exactly one earliest `Ready` Step under `Next input`. When no Step is `Ready`, name the
consolidated blocker or decision set. When no lifecycle work remains, say `None` and why.

## Lazy-Loading Rule

Do not read all contracts by default.

- Start with module contracts selected by the root contract's task routes.
- Descend through explicitly named child contracts to locate the responsible sub-module.
- Add neighbor module contracts only after cross-module impact is confirmed.
- Stop loading contracts once constraints are clear, then inspect source inside that boundary.

The contracts are the reusable context map. Source code proves and implements their claims; it is
not the first mechanism for rediscovering the map on every session.

## Contract Update Triggers

Apply `.agents/cg/principles/architecture.yaml` `graph` first: recurse, selfSufficient, surface, adapters, stay, add-child, or elsewhere.

Update this node's `<boundary>/.agents/cg/contract.yaml` when the decision is `stay` and any of
these change:

- dependency direction or allowed/forbidden imports
- public entry points used by other modules
- security/workflow/schema invariants
- operational assumptions relied on by future agents

When the decision is `add-child`, create the child's `contract.yaml` and reciprocal parent/child
edges in the same change. Do not grow this node instead.

## Contract Self-Sufficiency Rule

Contracts must survive plan deletion. When writing or updating a contract:

- State every rule in full inside the contract. A plan/ticket ID or a
  `docs/plans/` path is never the definition of behavior.
- Do not cite `docs/plans/` paths or plan ticket IDs (e.g. `CS-4.2`) from
  `.agents/cg/` files or `docs/guides/`. Citing permanent `docs/decisions/`
  records (ADRs, accepted contracts, threat model) is allowed.
- Do not write scheduling language ("remains scheduled for `X-1.2`",
  "deferred to `X-3.5`") into contracts; describe the current state and update
  the contract when the state changes.

## Plan Harvest Step (before archiving a plan)

Before a completed plan moves to `docs/plans/archive/` (and eventually gets
deleted), follow `.agents/skills/cg-sign-off/SKILL.md`. In short:

1. If the roadmap declares a decision harvest, classify one declared producer-phase cohort. The
   harvest must not default to every resolved decision. Require that classification IDs exactly
   equal the eligible decision IDs. Other resolved decisions and every pending decision remain in
   the log for their own cohort or answer. Validate the transient manifest before any later gate:
   `cg harvest <decision-harvest.json>
   --decision-log docs/plans/decision-log.md`.
2. For a non-empty cohort, obtain one batch acceptance and route it through `cg-prepare`. The
   first prepared harvest Step carries the accepted classification digest, and its drain IDs
   exactly equal the eligible decision IDs. It remains blocked on source-phase completion while
   every later destination Step remains Waiting. Before closing the source, run the detector with
   `--stage close --preparation <destination-preparation.md>`. An empty cohort needs neither
   acceptance nor a route.
3. Confirm every normative rule the plan introduced is stated in full in the
   impacted `<boundary>/.agents/cg/contract.yaml` files.
4. If the plan contains accepted design rationale worth keeping, promote that
   content to a `docs/decisions/` document; otherwise let it go with the plan.
5. Verify no permanent document depends on the plan:
   `grep -rn "<plan-filename>\|<ticket-id>" .agents/cg */.agents/cg docs/decisions docs/guides`
   must return nothing before the plan is archived.

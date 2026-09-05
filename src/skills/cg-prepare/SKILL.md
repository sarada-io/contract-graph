---
name: cg-prepare
description: Prepare one selected Contract Graph phase as a prioritized queue of dependency-safe executable Steps. Use after cg-plan fixes the phase outcome and acceptance gate, or when cg-sign-off returns corrective work that changes the remaining queue. Measures affected source, tests, resources, dependencies, contracts and detectors; gives every Step explicit dependencies, blockers and state; defines one shared execution branch or worktree; and emits cold-start briefs that let cg-produce run ready Steps serially until completion or a genuine queue-wide block. Does not allocate parallel tracks, per-Step branches, merge order, or concurrent handoffs.
---

# CG Prepare

Turn one accepted phase into one ordered execution queue. Do not implement the phase or edit
permanent contracts here.

Read `.agents/skills/cg-unblock/SKILL.md` only when a fork fails D-1: unresolvable from contracts
and accepted decisions, material, costly to reverse, and nothing else can proceed.

## Required outcome

Finish with all twelve true:

1. The selected phase outcome and acceptance gate remain unchanged.
2. Every affected production file, test, resource, dependency, contract, detector, and durable
   document is assigned to one or more ordered Steps.
3. Every Step is one independently verifiable vertical slice.
4. Each Step owns every contract and detector change required by its behavior.
5. Steps have a stable priority order plus explicit dependency edges derived from real constraints.
6. Every Step has an initial `Waiting`, `Ready`, or `Blocked` state and names its exact blockers.
7. A later Step may reuse a path only after the earlier Step has completed and verified it.
8. One execution branch or worktree and one measured baseline are named for the whole phase.
9. No parallel track, per-Step branch, merge order, rebase plan, or concurrent handoff is emitted.
10. Every Step has one cold-start brief and one runnable `Done when` gate.
11. If an accepted decision-harvest cohort is in scope, the first prepared harvest Step carries an
    immutable classification digest and drain IDs exactly equal the eligible decision IDs.
12. The response ends with the `Next action` block in §9.

These twelve are this skill's disk facts, not a score. Item 11 is true when no harvest cohort is
in scope. Once the queue file has a `Ready` Step, emit §9 so `cg-auto-run` can dispatch
`cg-produce`. Do not hold the hop to re-score the list.

## 1. Admit one phase

Preparation starts only when `cg-plan` has selected one phase whose outcome, scope, and acceptance
gate are stable, its prerequisites are satisfied or explicitly blocked, and the repository's
execution branch or worktree policy is known. If the outcome or gate must change, stop with
`$cg-plan`.

1. Load `.agents/cg/principles/architecture.yaml`. Apply `hierarchy.kinds` and `graph` before
   assigning any path.
2. Load the selected phase from the roadmap. Run `cg contract route --task "<phase outcome>"`.
   Load only the matched contracts and their named children; then scoped `P` rules, then the
   repository constitution and specifications. Consult `E` only for a remaining design fork. A
   practice already cited on the selected phase is not remaining. An `E` disagreement is not
   `Blocked by` and not `$cg-unblock`.
3. Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with
   `cg residue`. The queue file is `<docs>/plans/<programme>/<phase>_detailed_preparation.md`.
4. Inspect source, tests, resources, and the worktree inside the selected units only.
5. Run `cg verify` and the narrowest useful baseline. Record existing failures as facts.

When `cg-sign-off` returns corrective work, preserve its reproduction, expected and actual result,
affected paths, contract and detector impact, dependencies, and `Done when` evidence. Re-prepare
the remaining sequence only when the phase outcome and gate are unchanged. A successor-planning
handover first goes through `cg-plan`.

After one batch acceptance, an accepted non-empty decision-harvest cohort may be prepared for its
already-planned destination phase while the source phase is still completing. Reserve the first
prepared harvest Step for that cohort, set it `Blocked` on source-phase completion, and keep every
later Step `Waiting` behind it. After writing the route, resume `cg-sign-off` for the source phase;
do not begin destination execution yet.

The roadmap is transient. Do not cite a plan path as the source of a rule.

## 2. Define Steps

Write numbered Steps `1…N`. Each Step contains:

- one observable outcome;
- exact file groups it may change;
- required contract and detector changes;
- a positive case and a negative or absence case for each boundary;
- one runnable verification command or named test;
- dependencies and decisions that block it; and
- the verified repository state and prerequisite handoffs it expects when selected.

Use only **Phase** (roadmap unit) and **Step** (executable vertical slice). Do not introduce
another unit between them.

For an accepted harvest route, place these markers in the first Step immediately after its heading:

```markdown
Source harvest manifest: `<path>`
Source harvest cohort: `<cohort-id>`
Source harvest classification digest: `sha256:<digest>`
Source harvest drain IDs: `<comma-separated exact eligible IDs>`
```

That Step has `Priority: 1`, `Depends on: None`, a named source-completion blocker, and `Status:
Blocked`. No later Step may be `Ready`, `In progress`, or `Complete` before the source phase closes.

## 3. Build the Step ledger

Before assigning paths, apply `.agents/cg/principles/architecture.yaml` `graph`: recurse until the
smallest node, then stay, add-child, or elsewhere. Size, reuse, or a new dependency is not a new
node. `graph.surface` is declared entry; a new entry point is a surface amendment or `add-child`.
`graph.adapters`: a second optional vendor client is `add-child` behind a parent-owned port.
Consumer-specific behavior stays behind its adapter; do not modify or branch the core while the
port can express the required product-neutral promise. If the phase already names an add-child,
elsewhere, service, or adapter target, assign paths to deliver it. Mixed code that matches that target is the work, not a return to `$cg-plan`. A Step
whose editable paths sit on the wrong domain is a preparation defect.

Inventory every affected item:

| Item | Current owner | Final owner | Action | Consumers | Step(s) | Verification |
|---|---|---|---|---|---|---|
| production type/package | source | target/delete | move/retain/delete | modules | ordered Steps | test |
| test/fixture | source | target/consumer | move/update/delete | test task | ordered Steps | named test |
| resource/config | source | target/app | move/retain | runtime | ordered Steps | startup/test |
| dependency | source/consumer | final module | add/remove/scope | modules | ordered Steps | dependency scan |
| new component/library/sub-module | — | its own contract | create | parent + callers | creating Step | `cg verify` |
| `.agents/cg` rule | governance owner | same/new contract | update/create | humans/agents | changing Step | detector |
| detector | test/script owner | enforcing location | add/update | contract rule | same Step | fail-on-demand |
| durable document | document owner | final document | update/create | humans/agents | describing Step | link/content gate |

No row may remain unknown. Preparation records the required contract change but does not write it.

A later Step may edit the same file because execution is sequential. For every repeated path, state
what the earlier Step leaves behind and what the later Step changes. Keep source removal,
destination addition, tests, resources, dependencies, contract truth, and residue checks for one
atomic move in the same Step.

## 4. Preserve contract co-delivery

- A behavior, boundary, invariant, entry point, or operational-assumption change owns the matching
  contract and detector update.
- A Step that introduces a self-sufficient unit — `graph.selfSufficient` in
  `.agents/cg/principles/architecture.yaml` — owns that unit's `contract.yaml`, its applicable `P`
  rules, and reciprocal parent/child edges. `cg verify` rejects a structurally incomplete graph, so
  this cannot be deferred to a later Step.
- A new or changed rule and its detector land with the implementation.
- No Step depends on `cg-sign-off` or a later cleanup Step to make its contract truthful.
- If a contract change is too wide for one Step, split the behavior before execution; never split
  contract truth from that behavior.

Every completed Step must leave the repository contract-complete. Closure owns only emergent
composition tests and phase-close records.

## 5. Build one continuous sequential queue

Assign stable priority numbers in this default order:

1. published interfaces and structural seams;
2. consumers and migrations;
3. removals and renames after consumers have moved;
4. durable documentation describing the implemented result;
5. environment or production measurement.

A priority number is a selection preference, not an undeclared dependency. Record every real
dependency explicitly. Do not optimize for equal size or theoretical concurrency.

Each Step carries:

| Field | Meaning |
|---|---|
| `Priority` | stable Step number used to break ties between ready Steps |
| `Depends on` | Steps whose verified handoffs this Step consumes |
| `Blocked by` | unresolved `DU-NN` entries or unavailable external prerequisites |
| `Status` | `Waiting`, `Ready`, `Blocked`, `In progress`, or `Complete` |

Set state deterministically:

- `Waiting`: at least one declared dependency is not `Complete`;
- `Ready`: all dependencies are `Complete`, no blocker remains, and the current verified state
  satisfies the brief;
- `Blocked`: dependencies permit work but an exact decision or external prerequisite does not;
- `In progress`: the one Step currently executing;
- `Complete`: the Step gate passed and its handoff is recorded.

At most one Step is `In progress`. Select the lowest-numbered `Ready` Step. A blocked Step is
deferred, never skipped or waived. Every repeated path creates a dependency on the earlier writer.
A later Step that consumes, overwrites, removes, or verifies a blocked Step's output stays
`Waiting`. When no `Ready` Step remains, present one consolidated blocker set.

For a decision-harvest route, the source phase's successful close is what removes the first Step's
blocker. Recalculate it to `Ready` only then.

## 6. Use one execution context

Record the single integration branch or current worktree, the measured baseline commit, the
clean-state preflight, whether the repository requires a coherent commit after each Step, and the
exact evidence each dependent Step consumes.

Do not allocate a branch or worktree per Step. Do not emit a merge order, rebase points, or
cross-branch handoffs. Prepare sequential Steps only.

## 7. Define verification

Every Step has one runnable `Done when` command. It includes Step-specific positive and negative
tests, `cg verify`, residue or ownership checks for moves, the full build when the repository
requires it, and a clean or explicitly accounted-for worktree.

In the phase preamble, name checks that only make sense after the full sequence: composition,
residue, and the phase acceptance gate. Do not put those in a Step `Done when`. Emergent checks
prove composition; they do not repair an incomplete Step.

## 8. Write cold-start Step briefs

Write one document per phase, beside the roadmap that owns it, and link it from the roadmap:

```
<docs>/plans/<programme>/<phase>_detailed_preparation.md
```

Do not split Steps into separate files. `cg next` reads every `## Step <n>` section in that file.
Put the phase context — outcome, acceptance gate, execution branch, ledger of affected items —
above the first `## Step` heading. Each Step must be readable cold: a section that leans on a
neighbouring Step is a diff, not a brief.

Each Step's first lines are its header block. `cg next` parses exactly these keys:

````markdown
## Step <number>: <name>
Weight: Design | Build | Mechanical
Priority: <stable number>
Depends on: <Step IDs | None>
Blocked by: <decision IDs or external prerequisites | None>
Status: <Waiting | Ready | Blocked>

### Read first
<contracts, decisions, phase, preparation, cg-produce, cg-unblock>

### Goal
<one observable outcome>

### Expected starting state
<latest verified phase state plus required prerequisite handoffs>

### Files I may edit
<exact paths or bounded path groups>

### Required contract and detector changes
<current truth that changes and the detector that proves it>

### Decisions already made
<decision and assumption references>

### Work
<implementation, tests, resources, dependencies, removals, and documentation>

### Done when
```bash
<one command including the contract gate>
```

### Handoff
<evidence, repository state, queue-state update, and dependent Steps this unblocks>
````

After writing, run `cg next`. If it reports `unreadable`, fix the headers before handing off.

## Stage boundary — yield here

**Finish your stage, then return to the user.** Do not invoke the next skill yourself, however
obvious the route is. The `Next action` block names the successor so a person can choose it and so
`cg-auto-run` can follow it under a granted authority — naming it is not permission to take it.
The single exception is a dispatch from `cg-auto-run`. If you were not dispatched by it, you are
the last stage of this turn.

## 9. Next-action response

Choose exactly one immediate route:

- gate passed and a Step is ready: use `cg-produce` with the earliest `Ready` Step;
- accepted harvest route prepared before its source closes: resume `cg-sign-off` with the source
  phase, accepted manifest, and destination preparation;
- phase outcome or acceptance changed: use `cg-plan` with the preparation finding;
- protected decisions leave no Step ready: use `cg-unblock` with the consolidated decision-log set;
- external prerequisites leave no Step ready: name no next skill until one is satisfied.

End the user-facing response with:

```markdown
## Next action — <Ready | Blocked | Returned to planning>
- **User action:** <one concrete action>
- **Next input:** <$cg-produce | $cg-sign-off | $cg-plan | $cg-unblock | None — waiting on prerequisite> — <exact preparation record and earliest Ready Step brief, finding, or blocker set>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Do not make the user choose among Steps. Name exactly the earliest `Ready` Step, or the consolidated
blocker set when none is ready.

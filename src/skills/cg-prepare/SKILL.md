---
name: cg-prepare
description: Prepare one selected Contract Graph phase as a prioritized queue of dependency-safe executable Steps. Use after cg-plan fixes the phase outcome and acceptance gate, or when cg-sign-off returns corrective work that changes the remaining queue. Measures affected source, tests, resources, dependencies, contracts and detectors; gives every Step explicit dependencies, blockers and state; defines one shared execution branch or worktree; and emits cold-start briefs that let cg-produce run ready Steps serially until completion or a genuine queue-wide block. Does not allocate parallel tracks, per-Step branches, merge order, or concurrent handoffs.
---

# Contract Graph Prepare

Turn one accepted phase into one ordered execution queue. Do not implement the phase or edit
permanent contracts here. Read `cg-unblock` while preparing.

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
11. An accepted decision-harvest cohort reserves the first prepared harvest Step, with an immutable
    classification digest and drain IDs exactly equal the eligible decision IDs.
12. The user-facing response names the next action, next skill, earliest ready Step brief, and readiness
    condition.

## 1. Admit one phase

Preparation starts only when:

- `cg-plan` identifies one selected phase;
- its prerequisites are satisfied or explicitly blocked;
- its outcome, scope, and phase acceptance gate are stable; and
- the repository's execution branch or worktree policy is known.

If preparation reveals that the outcome or acceptance gate must change, return to `cg-plan`.

When `cg-sign-off` returns corrective work, preserve its reproduction, expected and actual result,
affected paths, contract and detector impact, dependencies, and `Done when` evidence. Re-prepare the
remaining Step sequence only when the current phase outcome and gate remain unchanged. A
successor-planning handover first goes through `cg-plan`.

After one batch acceptance, an accepted non-empty decision-harvest cohort may be prepared for its already-planned destination
phase while the source phase is still completing. Reserve the first prepared harvest Step for that
cohort, set it `Blocked` on source-phase completion, and make every later Step remain Waiting behind
the harvest Step. Its cold-start brief must carry the exact source manifest path, cohort ID,
classification digest, and drain IDs exactly equal the eligible decision IDs. After writing the
route, resume `cg-sign-off` for the source phase; do not begin destination execution yet.

Run the narrowest useful baseline plus the repository contract gate and record existing failures.

## 2. Define Steps

Write numbered Steps `1…N`. Each Step contains:

- one observable outcome;
- exact file groups it may change;
- required contract and detector changes;
- a positive case and a negative or absence case for each boundary;
- one runnable verification command or named test;
- dependencies and decisions that block it; and
- the verified repository state and prerequisite handoffs it expects when selected.

Use only:

- **Phase:** one roadmap delivery unit.
- **Step:** one ordered, executable vertical slice inside the selected phase.

Track is retired for new preparation records. Do not introduce another unit between Phase and Step.

For an accepted harvest route, place these machine-readable markers in the first Step immediately
after its heading:

```markdown
Source harvest manifest: `<path>`
Source harvest cohort: `<cohort-id>`
Source harvest classification digest: `sha256:<digest>`
Source harvest drain IDs: `<comma-separated exact eligible IDs>`
```

That Step has `Priority: 1`, `Depends on: None`, a named source-completion blocker, and `Status:
Blocked`. No later Step may be `Ready`, `In progress`, or `Complete` before the source phase closes.

## 3. Build the Step ledger

Inventory every affected item:

| Item | Current owner | Final owner | Action | Consumers | Step(s) | Verification |
|---|---|---|---|---|---|---|
| production type/package | source | target/delete | move/retain/delete | modules | ordered Steps | test |
| test/fixture | source | target/consumer | move/update/delete | test task | ordered Steps | named test |
| resource/config | source | target/app | move/retain | runtime | ordered Steps | startup/test |
| dependency | source/consumer | final module | add/remove/scope | modules | ordered Steps | dependency scan |
| `.agents/cg` rule | governance owner | same/new contract | update/create | humans/agents | changing Step | detector |
| detector | test/script owner | enforcing location | add/update | contract rule | same Step | fail-on-demand |
| durable document | document owner | final document | update/create | humans/agents | describing Step | link/content gate |

No row may remain unknown. Preparation records the required contract change but does not write it.

A later Step may edit the same file because execution is sequential. For every repeated path, state
what the earlier Step leaves behind and what the later Step changes. Keep source removal,
destination addition, tests, resources, dependencies, contract truth, and residue checks for one
atomic move in the same Step.

## 4. Preserve contract co-delivery

Apply these rules to every Step:

- A behavior, boundary, invariant, entry point, or operational-assumption change owns the matching
  contract and detector update.
- A new or changed rule and its detector land with the implementation.
- No Step depends on `cg-sign-off` or a later cleanup Step to make its contract
  truthful.
- If a contract change is too wide for one Step, split the behavior before execution; never split
  contract truth from that behavior.

Every completed Step must leave the repository contract-complete.

## 5. Build one continuous sequential queue

Assign stable priority numbers using this default order:

1. published interfaces and structural seams;
2. consumers and migrations;
3. removals and renames after consumers have moved;
4. durable documentation describing the implemented result;
5. environment or production measurement.

Do not optimize for equal size or theoretical concurrency. A priority number is a deterministic
selection preference, not an undeclared dependency. Record every real dependency explicitly.

Each Step carries:

| Field | Meaning |
|---|---|
| `Priority` | stable Step number used to break ties between ready Steps |
| `Depends on` | Steps whose verified handoffs this Step consumes |
| `Blocked by` | unresolved `DL-02` entries or unavailable external prerequisites |
| `Status` | `Waiting`, `Ready`, `Blocked`, `In progress`, or `Complete` |

Set state deterministically:

- `Waiting`: at least one declared dependency is not `Complete`;
- `Ready`: all dependencies are `Complete`, no blocker remains, and the current verified state
  satisfies the brief;
- `Blocked`: dependencies permit work but an exact decision or external prerequisite does not;
- `In progress`: the one Step currently executing; and
- `Complete`: the Step gate passed and its handoff is recorded.

At most one Step is `In progress`. Select the lowest-numbered `Ready` Step. When a Step becomes
blocked, record its blocker and leave it in the queue; then select the next `Ready` Step whose
dependencies and paths are independent. A blocked Step is deferred, never skipped or waived.
Recalculate every state after each verified handoff and after each decision answer.

For a decision-harvest route, the source phase's successful close is the state transition that
removes the first Step's blocker. Recalculate it to `Ready` only then; later Steps remain governed
by their declared dependencies.

Every repeated path creates a dependency on the earlier writer. A later Step that consumes,
overwrites, removes, or verifies a blocked Step's output is not independent and stays `Waiting`.
When no `Ready` Step remains, present one consolidated blocker set instead of interrupting the user
for each blocked Step separately.

## 6. Use one execution context

Record:

- the single integration branch or current worktree used for all Steps;
- the measured baseline commit;
- the clean-state preflight;
- whether the repository requires a coherent commit after each Step; and
- the exact evidence each dependent Step consumes.

Do not allocate a branch or worktree per Step. Do not emit a merge order, rebase points, or
cross-branch handoffs. Every selected Step starts from the latest verified phase state plus all
declared prerequisite handoffs in the same execution context.

## 7. Keep future root-scoped parallelism out of core preparation

Independently enforced module roots may later become low-context parallel
execution boundaries. Do not emit that mode until the repository can enforce all of these:

- each worker is write-confined to one declared root;
- workers perform no Git staging, commits, rebases, or merges;
- no shared root contract, build file, generated file, or cross-root seam is writable in parallel;
- a coordinator serializes repository-wide verification and commits; and
- a detector proves the root allocations are disjoint.

Until those controls exist, prepare sequential Steps only.

## 8. Define verification

Every Step has one runnable `Done when` command. It includes:

- Step-specific positive and negative tests;
- the repository contract gate;
- residue or ownership checks for moves;
- the full build when the repository requires it; and
- a clean or explicitly accounted-for worktree result.

Separately list `cg-sign-off` checks that only make sense after the full sequence:

- declared graph equals built graph;
- exactly one final owner, writer, route, or resource;
- full role-by-route matrix;
- composed isolation across security domains; and
- every Step gate remains green in the accumulated result.

Emergent checks prove composition; they do not repair an incomplete Step.

## 9. Write cold-start Step briefs

Every Step gets:

````markdown
# Phase <phase> Step <number>: <name>
Weight: Design | Build | Mechanical
Priority: <stable number>
Depends on: <Step IDs | None>
Blocked by: <decision IDs or external prerequisites | None>
Status: <Waiting | Ready | Blocked>

## Read first
<contracts, decisions, phase, preparation, cg-produce, cg-unblock>

## Goal
<one observable outcome>

## Expected starting state
<latest verified phase state plus required prerequisite handoffs>

## Files I may edit
<exact paths or bounded path groups>

## Required contract and detector changes
<current truth that changes and the detector that proves it>

## Decisions already made
<decision and assumption references>

## Work
<implementation, tests, resources, dependencies, removals, and documentation>

## Done when
```bash
<one command including the contract gate>
```

## Handoff
<evidence, repository state, queue-state update, and dependent Steps this unblocks>
````

## Preparation-completeness gate

- [ ] The phase outcome and acceptance gate are unchanged.
- [ ] Every affected item appears in the Step ledger.
- [ ] Steps have one stable priority order and explicit dependency edges.
- [ ] Every Step has a valid initial queue state and exact blocker references.
- [ ] Every Step owns its contract and detector changes.
- [ ] Every atomic move stays inside one Step.
- [ ] Every repeated path has an explicit before/after handoff.
- [ ] One execution context and baseline are named.
- [ ] No parallel track or per-Step branch is allocated.
- [ ] Completion owns only emergent integrated tests and phase-close records.
- [ ] Every Step has a cold-start brief and one `Done when`.

Do not hand the earliest `Ready` Step to `cg-produce` until this gate passes.

## 10. Next-action response

Choose exactly one immediate route:

- gate passed and a Step is ready: use `cg-produce` with the earliest `Ready` Step brief;
- accepted harvest route prepared before its source closes: resume `cg-sign-off` with the source
  phase, accepted manifest, and destination preparation;
- phase outcome or acceptance changed: use `cg-plan` with the preparation finding;
- protected decisions leave no Step ready: use `cg-unblock` with the consolidated decision-log set;
- external prerequisites leave no Step ready: name no next skill until one is satisfied.

End the user-facing response with:

```markdown
## Next action — <Ready | Blocked | Returned to planning>
- **User action:** <one concrete action>
- **Next input:** <$cg-produce | $cg-plan | $cg-unblock | None — waiting on prerequisite> — <exact preparation record and earliest Ready Step brief, finding, or blocker set>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Do not make the user choose among Steps. Name exactly the earliest `Ready` Step, or the consolidated
blocker set when none is ready.

## Completion check

- [ ] The preparation-completeness gate passes.
- [ ] The response ends with one exact next action and skill.

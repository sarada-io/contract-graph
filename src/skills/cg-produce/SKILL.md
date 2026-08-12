---
name: cg-produce
description: Execute a prepared Contract Graph queue continuously and sequentially in one phase branch or worktree. Use with cg-prepare Step briefs that define priority, dependencies, blockers, expected state, editable paths, contract changes, handoff evidence and runnable gates. Selects the earliest Ready Step, delivers implementation, tests, resources, dependencies, contracts and detectors as one independently valid change, recalculates the queue after each verified handoff, and continues until every Step is complete or no ready work remains.
---

# CG Produce

Run the prepared queue with one Step `In progress` at a time. Do not redesign the phase, create
another execution branch, run Steps concurrently, or defer contract truth. Read `cg-unblock`, the
preparation record, and the selected Step brief before acting.

## Required outcome

Finish with all ten true:

1. The selected Step is the lowest-numbered `Ready` Step in the recalculated queue.
2. Each Step starts from the latest verified phase state plus its prerequisite handoffs.
3. Production behavior, tests, resources, dependencies, contracts, and detectors move together.
4. Every changed boundary, invariant, entry point, or operational assumption is truthful in its
   governing contract.
5. A new or changed rule and its detector land with the implementation.
6. The Step edits only its declared paths and preserves unrelated work.
7. Its `Done when` command and repository full gate pass.
8. Every handoff updates the Step report and all affected queue states.
9. Execution continues through ready work until the queue drains or no `Ready` Step remains.
10. The user-facing response names the next action, next skill, input artifact, and readiness
   condition.

## 1. Admission and preflight

Do not start if the brief lacks priority, dependencies, blockers, queue state, expected starting
state, editable paths, required contract changes, work, handoff, or `Done when`.

1. Read the constitution, principles, workflow, mapped contracts, selected phase, preparation
   record, and every `cg-*` skill named by the brief. Read `docs/plans/decision-log.md` alongside
   them: its *Resolved* entries are authority for any fork this Step meets — ranked above the
   walking skeleton and neighbouring green code by `cg-unblock` D-2 — while *Pending your review*
   entries are not authority at all, and a Step blocked on one stays blocked.
2. Recalculate queue states and confirm this is the lowest-numbered `Ready` Step.
3. Confirm the branch or worktree and baseline match the preparation.
4. Verify every declared prerequisite handoff and the latest accumulated phase state.
5. Inspect the worktree and preserve pre-existing unrelated changes.
6. Run the narrow baseline plus the repository contract gate.
7. Inventory assigned production files, tests, resources, dependencies, contracts, detectors, and
   retired names.

If the Step needs an undeclared path or a missing contract change, return to `cg-prepare`. Do not
edit first and hope completion repairs it.

## 2. Execute each selected vertical Step

Within the Step:

1. state the contract truth that changes;
2. update or add its executable detector;
3. implement the smallest end-to-end behavior;
4. update or add functional tests;
5. update resources and dependencies;
6. run the Step verification and contract gate;
7. inspect the diff and residue scan; and
8. create the coherent commit when repository policy authorizes commits.

Contract, detector, implementation, and tests are one delivery. Their internal edit order may
vary, but they are never separate handoffs.

After the Step handoff is green, mark it `Complete`, recalculate the queue, and select the new
lowest-numbered `Ready` Step. Continue in the same execution run while another Step is ready and
the execution context remains safe. Continuous means serial progress without unnecessary user
interruptions; it never means concurrent edits.

## 3. Contract co-delivery

For every changed behavior, boundary, invariant, public entry point, or operational assumption:

1. Update the impacted folder or module contract in this Step.
2. State current truth in full; never use a phase path or Step ID as the rule.
3. Add or update machine enforcement when the rule is testable.
4. Prove a new or changed detector fails on demand and evaluates a non-empty production set.
5. Update inheritance mappings and synchronize generated blocks when required.
6. Run the repository contract gate before the Step is complete.

Do not delegate these actions to a later Step or to `cg-sign-off`. Those may consume
the finished contract as evidence; none owns this Step's correctness.

When creating a new module contract, use
[the module contract template](assets/module-contract.template.md).

### A new self-sufficient unit owes a contract in the Step that creates it

A component, library, sub-module, or module is self-sufficient when it delivers a nameable
functionality and reaches outside itself only rarely. The moment a Step creates one, it owes four
things together — the same co-delivery rule as a rule and its detector:

1. its own `contract.md`, from the template;
2. an entry in `map/inheritance.json` with the rules that bind it, then `cg sync`;
3. a line in the **parent's Child Contracts** naming it and what it decomposes — an undeclared
   child is unreachable by traversal, which is the same as not existing;
4. `cg verify` green, which **fails** a parent that declares no children while its source branches.

Greenfield is where this is cheap and where it is skipped. A boundary is obvious in the Step that
introduces it and archaeology six phases later; retrofitting the graph is what `cg-warmup` exists
to do for repositories that never did this, and it costs far more than doing it here. If the unit
is genuinely not self-sufficient — it changes only when a sibling changes — do not give it a
contract; say in the parent why those packages are one boundary.

## 4. Complete moves and restructures atomically

For every move assigned to the Step:

1. move production code into the destination namespace;
2. move tests and fixtures;
3. move resources and configuration;
4. update qualified imports;
5. add direct dependencies to consumers;
6. remove dependencies the source no longer needs;
7. update source and destination contracts and detectors;
8. compile source, destination, and direct consumers;
9. search for old packages, registrations, launch targets, resources, and imports; and
10. inspect untracked files so a move is not mistaken for deletion.

Never maintain two live implementations unless the brief names temporary compatibility residue and
its removal condition.

## 5. Handle unexpected scope

- Edit only paths declared by the Step brief.
- Use `cg-unblock` when new evidence creates a protected design choice.
- Continue work that remains inside the Step and can still produce one coherent verified handoff.
- Return to `cg-prepare` when a new path, dependency, contract, or ordering change is required.
- If the Step cannot finish, leave the repository at its last contract-complete verified handoff,
  mark the Step `Blocked` with the exact decision or prerequisite, and recalculate the queue.
- Select a later Step only when it is `Ready`, consumes no blocked output, and neither overlaps nor
  invalidates the blocked Step's paths. Record the deferral; never treat it as completion.

Sequential execution removes ownership races; it does not authorize silent scope expansion.

## 6. Test obligations

**Every Step**

- Run its stated verification.
- Add a negative, failure, or absence case for each invariant.

**Security and route boundaries**

- Assert route behavior and the protected service or write call.
- Assert denied roles, denied binaries, and absent credentials.
- Do not substitute configuration-text inspection for service-level behavior.

**Isolation behavior, when required**

- Exercise two security domains through one service instance.
- Assert each domain sees only its own values.
- Assert a domain without an override receives the platform default.

**Moves**

- Prove the destination works and source ownership is absent.
- Leave only final cross-Step composition assertions to `cg-sign-off`.

## 7. Durable non-contract documentation

If the Step changes product behavior, operator procedures, architecture rationale, or diagrams,
those documents are written by `cg-sign-off` — it owns the durable record, and it has a standalone
entry path that writes documentation without closing a phase. Hand it the documentation paths the
Step brief assigned, and continue.

This never delays contract co-delivery. Product documentation is additional durable evidence, not
the source of the rule — and a contract update is never satisfied by writing a document about it.

## 8. Verify and hand off accumulated state

1. Run the Step's `Done when` verbatim.
2. Run the repository's full build-and-contract gate — its own build/test command plus `cg verify`.
   The exact command is named in the preparation record; if it is not, ask for it rather than
   inventing one, because a gate you guessed proves nothing.
3. Compare the diff with the Step's expected starting state.
4. Confirm only declared paths and preserved unrelated changes appear.
5. Record the commit or exact worktree state that dependent Steps consume.
6. Report commands/results, contracts/detectors changed, assumptions, decisions, residue, and
   rollback information.
7. Mark the Step `Complete`, recalculate every `Waiting`, `Ready`, and `Blocked` Step, and select
   the new lowest-numbered `Ready` Step.
8. Continue immediately when a Step is ready; otherwise emit the terminal handoff from §9.

Do not rebase or merge between Steps. Every selected Step continues from the verified accumulated
state in the phase's single execution context.

## 9. Next-action response

Choose exactly one immediate route:

- all Steps are `Complete`: use `cg-sign-off` with the preparation record and all Step reports;
- a `Ready` Step remains but the current execution run must yield: use `cg-produce` with the
  recalculated earliest `Ready` Step brief;
- scope or ordering changed: use `cg-prepare` with the exact finding;
- no Step is `Ready` and protected decisions remain: use `cg-unblock` with the consolidated
  decision-log set;
- no Step is `Ready` because of external prerequisites only: name no next skill until one changes.

End the user-facing response with:

```markdown
## Next action — <Queue complete | Ready handoff | Re-preparation required | Queue blocked>
- **User action:** <one concrete action>
- **Next input:** <$cg-produce | $cg-sign-off | $cg-prepare | $cg-unblock | None — waiting on prerequisite> — <earliest Ready Step brief, Step report set, preparation finding, or blocker set>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Do not stop for a user-facing response after every green Step while the current run can safely
continue. When yielding, name the recalculated earliest `Ready` Step, the consolidated blocker set,
or the exact evidence bundle that allows `cg-sign-off` to start.

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

## Completion check

- [ ] Every selected Step was the earliest `Ready` Step at selection time.
- [ ] Every expected starting state and prerequisite handoff matched.
- [ ] Every attempted Step is either `Complete` or explicitly `Blocked` from a verified state.
- [ ] Every behavior change has its contract update.
- [ ] Every new self-sufficient unit has its own contract, its inheritance entry, and a line in
      its parent's Child Contracts.
- [ ] Every rule and detector landed together and fails on demand.
- [ ] Only declared paths changed.
- [ ] Positive and negative tests pass.
- [ ] `Done when` and the full gate pass.
- [ ] Every handoff and queue-state transition is exact.
- [ ] Ready work continued until the queue drained or became blocked.
- [ ] The response ends with one exact next action and skill.

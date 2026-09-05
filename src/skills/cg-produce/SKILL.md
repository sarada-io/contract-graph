---
name: cg-produce
description: Execute a prepared Contract Graph queue continuously and sequentially in one phase branch or worktree. Use with cg-prepare Step briefs that define priority, dependencies, blockers, expected state, editable paths, contract changes, handoff evidence and runnable gates. Selects the earliest Ready Step, delivers implementation, tests, resources, dependencies, contracts and detectors as one independently valid change, recalculates the queue after each verified handoff, and continues until every Step is complete or no ready work remains.
---

# CG Produce

Run the prepared queue with one Step `In progress` at a time. Do not redesign the phase, create
another execution branch, run Steps concurrently, or defer contract truth.

Read `.agents/skills/cg-unblock/SKILL.md` only when a fork fails D-1: unresolvable from contracts
and accepted decisions, material, costly to reverse, and nothing else can proceed.

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
10. The response ends with the `Next action` block in §9.

## 1. Admission and preflight

Do not start if the brief lacks priority, dependencies, blockers, queue state, expected starting
state, editable paths, required contract changes, work, handoff, or `Done when`.

1. Apply `.agents/cg/principles/architecture.yaml` `graph` before any edit: recurse,
   selfSufficient, surface, adapters, stay, add-child, or elsewhere.
2. Load the contracts named by the brief. Run `cg contract route --task "<Step goal>"` if
   placement is still unclear. Then scoped `P` rules, then the repository constitution and
   specifications. Consult `E` only for a remaining design fork. A practice already cited on the
   phase or brief is not remaining. An `E` disagreement is not `Blocked by` and not `$cg-unblock`.
3. Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with
   `cg residue`. Read `<docs>/plans/decision-log.md`: *Resolved* entries are authority; *Pending
   your review* entries are not, and a Step blocked on one stays blocked.
4. Run `cg next`. Confirm this is the lowest-numbered `Ready` Step.
5. Confirm the branch or worktree and baseline match the preparation.
6. Verify every declared prerequisite handoff and the latest accumulated phase state.
7. Inspect the worktree and preserve pre-existing unrelated changes.
8. Run `cg verify` and the narrowest useful baseline. Record existing failures as facts.

If `graph` decides `add-child` or `elsewhere`, compare it to the Step brief. If the brief already
names that split, new child, service set, or vendor adapter as this Step's work, execute it:
still-mixed code is the starting state, not a reason to stop. If the brief adds new behavior to
the still-mixed node, or needs an undeclared path, stop with `$cg-prepare`. Do not add the
behavior to the current boundary because its files were already in the brief. If the phase
outcome or remaining order must change, stop with `$cg-prepare` carrying that finding — do not
emit `$cg-plan`; preparation returns to planning when the outcome moved.

A new undeclared entry, internals on the surface, or a bypass of the declared service is not
stay unless this Step's work is to declare or split that surface. `graph.adapters.mix` is
`add-child`: do not land a second optional vendor client on the open node unless the brief is
that split. Consumer-specific workflow is not stay on the core: keep it behind the adapter, or
amend the port only with a product-neutral concept.

If the Step needs an undeclared path or a missing contract change, return to `cg-prepare`. Do not
edit first and hope completion repairs it.

## 2. Execute each selected vertical Step

Within the Step:

1. state the contract truth that changes;
2. update or add its executable detector;
3. implement the smallest end-to-end behavior;
4. update or add functional tests;
5. update resources and dependencies;
6. run the Step verification and `cg verify`;
7. inspect the diff and residue scan; and
8. create the coherent commit when repository policy authorizes commits.

Contract, detector, implementation, and tests are one delivery. Their internal edit order may
vary; they are never separate handoffs.

After the handoff is green, mark the Step `Complete`, recalculate the queue, and select the new
lowest-numbered `Ready` Step. Continue in this invocation while another Step is ready and the
execution context remains safe. Serial, not concurrent.

## 3. Contract co-delivery

For every changed behavior, boundary, invariant, public entry point, or operational assumption:

1. Update the impacted contract in this Step.
2. State current truth in full; never use a phase path or Step ID as the rule.
3. Add or update machine enforcement when the rule is testable. Do not use `test -f` / `test -d`
   as verification — name the test or command that exercises the invariant.
4. Prove a new or changed detector fails on demand and evaluates a non-empty production set.
5. Update scoped `P` IDs, `.agents/cg/enforcement.yaml` rows, and reciprocal graph edges when
   required. A new generic `A` rule belongs only in a verifier-owning change that also registers
   its detector; do not add one by editing installed binding YAML.
6. Run `cg verify` before the Step is complete.

Do not delegate these to a later Step or to `cg-sign-off`.

When creating a new boundary contract, use
[the YAML contract template](assets/contract.template.yaml).

### A new self-sufficient unit owes a contract in the Step that creates it

A component, library, sub-module, or module is self-sufficient when it delivers a nameable
functionality and reaches outside itself only rarely. The Step that creates one owes four things
together:

1. its own `.agents/cg/contract.yaml`, from the template;
2. any applicable repository-owned P IDs in its `rules` array; global A rules apply automatically;
3. reciprocal relation edges: the parent names the child and the child names its parent — an
   undeclared child is unreachable by traversal, which is the same as not existing;
4. `cg verify` green.

If the unit is not self-sufficient — it changes only when a sibling changes — do not give it a
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
- Stop with `$cg-unblock` when new evidence creates a protected design choice. An `E`
  disagreement is not that evidence.
- Continue work that remains inside the Step and can still produce one coherent verified handoff.
- Stop with `$cg-prepare` when a new path, dependency, contract, or ordering change is required.
- If the Step cannot finish, leave the repository at its last contract-complete verified handoff,
  mark the Step `Blocked` with the exact decision or prerequisite, and recalculate the queue.
- Select a later Step only when it is `Ready`, consumes no blocked output, and neither overlaps nor
  invalidates the blocked Step's paths. Record the deferral; never treat it as completion.

## 6. Test obligations

Every Step: run its stated verification; add a negative, failure, or absence case for each
invariant. Moves: prove the destination works and source ownership is absent. Leave final
cross-Step composition assertions to `cg-sign-off`. Additional security, route, or isolation cases
belong only when the brief or a contract invariant requires them.

## 7. Durable non-contract documentation

If the Step changes product behavior, operator procedures, architecture rationale, or diagrams,
record those paths in the Step handoff. `cg-sign-off` writes them. Do not invoke `cg-sign-off`
from this skill. Product documentation is not the source of a rule, and a contract update is never
satisfied by writing a document about it.

## 8. Verify and hand off accumulated state

1. Run the Step's `Done when` verbatim.
2. Run the full build-and-contract gate named in the preparation record — its build/test command
   plus `cg verify`. If the command is not named, ask for it; do not invent one.
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

## Stage boundary — yield here

Drain every `Ready` Step in this invocation. That is this stage, not a new one. Then return to the
user. Do not invoke the next skill yourself, however obvious the route is. The `Next action` block
names the successor so a person can choose it and so `cg-auto-run` can follow it under a granted
authority — naming it is not permission to take it. The single exception is a dispatch from
`cg-auto-run`. If you were not dispatched by it, you are the last stage of this turn after the
queue drains or no `Ready` Step remains.

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

Do not stop for a user-facing response after every green Step while this run can safely continue.
When yielding, name the recalculated earliest `Ready` Step, the consolidated blocker set, or the
exact evidence bundle that allows `cg-sign-off` to start.

# Execute internal finishing and repair Steps

Run the prepared queue with one Step `In progress` at a time. Do not redesign the phase, create
another execution branch, run Steps concurrently, or defer contract truth.

Read `.agents/skills/cg-unblock/SKILL.md` when a fork remains unresolved by the Plan, contracts
and accepted decisions, or requires owner authority. Check existing authority first, then ask the user directly under D-6 when necessary. Record the answer and continue independent work.

Read `.agents/cg/phases.json` and load the families selected for `produce`. Shipped defaults
include `.agents/cg/guidelines/engineering.yaml` on every pass; retained repository phase policy
controls loading. Consider applicable E practices as advisory context. They create no acceptance
criteria, required changes, or blockers unless separately adopted through an authorized binding.
Do not reopen settled decisions merely because an E preference differs.

## Required outcome

Finish with all ten true:

1. The selected Step is the lowest-numbered `Ready` Step in the recalculated queue.
2. Each Step starts from the latest verified phase state plus its prerequisite handoffs.
3. Production behavior, tests, resources, dependencies, contracts, and detectors move together.
4. Every changed boundary, invariant, entry point, or operational assumption is truthful in its
   governing contract.
5. A new or changed rule and its detector land with the implementation.
6. The Step edits only its declared paths and preserves unrelated work.
7. Its assigned `Done when` gate passes, including broader checks when scope or policy requires them.
8. Every handoff updates that Step's existing Handoff section and all affected queue states.
   This section is the Step report; do not create a separate report file.
9. Execution continues through ready work until the queue drains or no `Ready` Step remains.
10. The response follows the cg-produce entrypoint’s item report and next-action rules.

## 1. Admission and preflight

Do not start if the brief lacks priority, dependencies, blockers, queue state, expected starting
state, editable paths, required contract changes, work, handoff, or `Done when`.

1. Apply `.agents/cg/principles/architecture.yaml` `graph` before any edit: recurse,
   selfSufficient, surface, adapters, stay, add-child, or elsewhere.
2. Load the contracts named by the brief. Run `cg contract route --task "<Step goal>"` if
   placement is still unclear. Then scoped `P` rules, then the repository constitution and
   specifications. Apply relevant `E` guidance to a remaining design fork. A practice already cited on the
   phase or brief is not remaining. An `E` disagreement is not `Blocked by` and not `$cg-unblock`.
3. Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with
   `cg status --programme <slug>`. Inspect `cg residue --programme <slug>` as a baseline;
   unrelated findings alone do not prevent this Step. Read `<docs>/plans/decision-log.md`: *Resolved* entries are authority; *Pending
   your review* entries are not, and a Step blocked on one stays blocked.
4. Run `cg next --programme <slug>`. Confirm this is the lowest-numbered `Ready` Step.
   For unreadable queue syntax, `repair-required`, or permission entry `execution-preparation`, repair the exact queue internally before selecting implementation work. A blocked or complete queue can admit preparation without selecting an executable Step; re-run cg next after preparing the correction. Do not work around a prepared gate or call routine plan repair a user decision.
5. Confirm the branch or worktree and baseline match the preparation.
6. Verify every declared prerequisite handoff and the latest accumulated phase state. The first
   prepared prototype repair may explicitly admit a measured provisional baseline; do not claim it
   is green or refuse the repair solely because the assigned defects still exist.
7. Inspect the worktree and preserve pre-existing unrelated changes.
8. Establish `cg verify` and the narrowest useful baseline; reuse applicable recorded evidence
   under [verification](verification.md), otherwise run the commands.
   Record existing failures as facts.

If `graph` decides `add-child` or `elsewhere`, compare it to the Step brief. If the brief already
names that split, new child, service set, or vendor adapter as this Step's work, execute it:
still-mixed code is the starting state, not a reason to stop. If the brief adds new behavior to
the still-mixed node, or needs an undeclared path, update the internal preparation before editing. Do not add the
behavior to the current boundary because its files were already in the brief. Refine remaining order internally when the agreed outcome is unchanged. A material outcome change needs affected agreement through cg-plan or cg-unblock.

An undeclared entry, exposure outside the declared promise, or a surface bypass requires an
affected contract or implementation correction within the Step. Apply `graph.adapters.mix`
and `selfSufficient` to adapter responsibilities; vendor count alone does not require a split.
Consumer-specific workflow stays outside a consumer-independent core while its promise suffices;
amend the port with a product-neutral concept when the promise needs to change.

If the Step needs an undeclared path or a missing contract change, update the internal preparation. Do not
edit first and hope completion repairs it.

## 2. Execute each selected vertical Step

Within the Step:

1. state the contract truth that changes;
2. update or add its executable detector;
3. implement the smallest end-to-end behavior;
4. update or add functional tests where changed promises lack adequate coverage;
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
[the shared contract template](../../../cg/templates/contract.template.yaml) only when the contract does not already exist. Choose its actual node kind, parent, composition and surface kind from the graph decision; the template examples do not prescribe a service architecture. The installed `.agents/cg/schema/contract.schema.json` remains the shape authority.

### A new self-sufficient unit owes a contract in the Step that creates it

A component, library, sub-module, or module is self-sufficient when it delivers a nameable
function with one owned responsibility, an explicit surface, and external dependencies through
declared contracts and surfaces. The Step that creates one owes four things
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
- Update the internal preparation when a new path, dependency, contract, or ordering change is required.
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
record those paths in the Step handoff. `cg-sign-off` writes them. Return repairs to the invoking sign-off coordinator. Otherwise continue into sign-off only when acceptance and the existing completion request authorize required finishing; stop for pending review or at the requested scope boundary. Product documentation is not the source of a rule, and a contract update is never
satisfied by writing a document about it.

## 8. Verify and hand off accumulated state

1. Run the Step's `Done when` verbatim.
2. Account for each assigned check once using [verification](verification.md).
   Do not add a second unconditional full gate. Run broader checks when the preparation or retained
   repository policy requires them; missing Step verification requires re-preparation.
3. Compare the diff with the Step's expected starting state.
4. Confirm only declared paths and preserved unrelated changes appear.
5. Record the commit or exact worktree state that dependent Steps consume.
6. Update the Step's Handoff section with commands/results and the consumed repository state.
   Link changed contracts, decisions, and external evidence. Record only applicable unresolved
   findings and rollback information; do not restate the Work section or add empty report sections.
7. Mark the Step `Complete`, recalculate every `Waiting`, `Ready`, and `Blocked` Step, and select
   the new lowest-numbered `Ready` Step.
8. Continue immediately when a Step is ready; otherwise use the cg-produce entrypoint’s report and next-action rules.

Do not rebase or merge between Steps. Every selected Step continues from the verified accumulated
state in the phase's single execution context.

## Continue inside production

Preparation is internal work, not a skill transition. Amend scope/order within the agreed outcome, re-evaluate dependencies, and continue eligible implementation under the current request. Preserve genuine blockers and final gates. For a changed outcome or material promise use cg-unblock or cg-plan; routine repairs stay here. Apply the cg-produce entrypoint's review cadence, item report and next-action rules. Return completed repair evidence to the invoking sign-off coordinator without requiring another user invocation.

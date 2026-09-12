# Shared closure checks

These checks define evidence, repairs, harvest, documentation, and archival for an already
selected scope. They do not select a programme or decide stage continuation. The invoking
phase-sign-off or prototype-completion procedure owns those decisions. Return corrective findings
to that procedure; never apply a different procedure's yield rule.

Read §§1–11 for phase closure. For documentation-only work, read §8 and §11 alone.
Use `cg-unblock` for unresolved material decisions under the caller's authority. Under auto-run,
ask the Manager first; otherwise follow its direct-user decision protocol.

## Required outcome

Close the phase only when all thirteen are true. Documentation-only work uses §8 and §11;
only outcomes 10, 12, and 13 apply to it.

1. Every prepared Step has a report from the expected accumulated state.
2. Every Step reached `Complete`; every deferral and resumption was recorded and dependency-safe.
3. Every Step gate and the repository full gate pass in the final state.
4. Emergent phase-level tests exist where composition needs proof.
5. Every discovered defect is fixed or has an explicit, valid disposition.
6. Every Step and the phase acceptance gate are accounted for.
7. Contracts and detectors delivered by Steps match the combined implementation.
8. Every decision harvest classifies one declared producer-phase cohort without capturing another
   cohort or a pending decision.
9. Every non-empty decision-harvest cohort has one batch acceptance and a validated first prepared
   harvest Step whose classification digest and drain IDs exactly equal the eligible decision IDs.
10. Durable rationale and product/operator guidance are harvested, written, and validated.
11. The phase status and roadmap reflect reality before archival.
12. No required contract update was displaced from `cg-produce` into a documentation edit.
13. The result includes the evidence inventory and next route described in §11.

If a protected decision, unavailable prerequisite, or roadmap correction prevents these outcomes,
return Incomplete or Blocked from §9 and §10 to the invoking procedure. That is actionable;
it is not phase completion.

## 1. Admit the accumulated phase

1. Apply `.agents/cg/principles/architecture.yaml` `graph` when judging whether the graph still
   describes the code.
2. Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with
   `cg status --programme <slug>` and inspect `cg residue --programme <slug>` for ownership.
   This scoped inspection does not replace the repository's required final gate.
3. Run `cg next --programme <slug>` for the already selected programme.
   Closure starts only when every prepared Step in the exact selected phase is `Complete`.
   Run the repository's selected-phase guard when present; aggregate routing cannot override it.
4. Build one final evidence inventory under [verification](../../cg-prepare/references/verification.md).
   Establish `cg verify`, Step checks, and the repository full gate for the final state; reuse only
   applicable evidence and execute missing or invalidated checks. Later sections consume this
   inventory rather than triggering duplicate runs.

Do not begin closure until every prepared Step is accounted for and `Complete`; each `Done when`
comes from the final accumulated state; the branch or worktree descends from the preparation
baseline through every Step handoff; every behavior, boundary, or invariant change includes its
contract and detector; detectors have fail-on-demand evidence; and assumptions, decisions,
residue, and rollback information are recorded.

An admission failure starts the repair loop in §2; it is not a terminal rejection report.

## 2. Run the repair loop

Classify every admission, test, contract, or acceptance finding:

| Finding | Required action |
|---|---|
| phase-level composition test or close record | fix directly in closure-owned paths and re-run affected gates |
| defect within an already prepared Step's paths | return a corrective Step brief for `$cg-produce` |
| defect requiring new paths or a changed remaining order | return the finding for `$cg-prepare` |
| competing design or protected decision | return a decision for `$cg-unblock`; keep the phase Blocked |
| genuinely out-of-phase work | return a handover for `$cg-plan`, or `$cg-prepare` when a matching future phase already exists |
| missing prerequisite or outcome error | return a handover for `$cg-plan`; mark the phase Incomplete or Blocked |

Routine bookkeeping within assigned paths does not need another user decision: repair a known
consumer link, refresh a stale status note, or reconcile a queue label against recorded evidence.
Use `cg-prepare` when the edit changes the prepared paths, prerequisites, or gate placement.
Acceptance, changed outcomes, disputed ownership, and destructive disposal still require their
existing authority. Do not relabel them as bookkeeping.

For residue, retain useful evidence with a Markdown consumer link or an explicit prototype
receipt reference (`cg prototype evidence --programme <slug> --evidence <owned-plan-file>`).
Registration records a consumer; it does not approve the evidence or prove delivery. Existing
bare paths are not links. Inspect the named file and its actual consumer before registering it;
never claim a whole directory merely to silence findings. Preserve other programmes' files and
report their owner, exact path, required action, and whether a retained global gate makes that
action a closure prerequisite. Resolve shared/unassigned findings explicitly. A scoped clean
result cannot waive a required repository-wide gate.

On interruption or repair, use `cg status --programme <slug>` as the current queue/receipt view.
Link handovers to its exact preparation file and Step; old sign-off reports and suspended ledgers
are history until reconciled against those facts. Update existing owned notes to identify
superseded blockers without discarding their evidence. Report one next action and the condition
preventing that action, rather than repeating every historical failure as a current blocker.

Closure-owned fixes are limited to paths reserved by `cg-prepare`: emergent composition tests and
phase-close records. If a repair changes production behavior, a boundary, an invariant, an entry
point, a contract, or a detector, return a corrective Step brief to the invoking procedure.
That procedure owns continuation; these checks never grant or cancel authority to run another stage.

Use this corrective brief:

```markdown
# Corrective Step <phase>-R<number>: <finding>
Source: cg-sign-off

## Expected starting state
<final accumulated phase state>

## Reproduction and evidence
<failing command, test, or observable behavior>

## Expected and actual result
<contract-backed expectation and measured result>

## Files I may edit
<exact paths>

## Required repair
<implementation, tests, contract, detector, resource, dependency, or documentation work>

## Done when
<one runnable command including the contract gate>

## Handoff
<state sign-off must re-admit>
```

When a corrective Step returns and sign-off is resumed: confirm the handoff matches the execution
context, repeat admission, invalidate affected evidence, establish the full phase gate and every
original Step obligation for the repaired state under the shared evidence rules, and continue
until green or blocked.

## 3. Verify the continuous sequential history

Walk the actual Step execution history:

1. confirm exactly one Step was `In progress` at each transition;
2. confirm every selected Step was the lowest-numbered `Ready` Step at selection time;
3. match each Step's expected starting state to the latest verified phase state and all declared
   prerequisite handoffs;
4. confirm every blocked deferral names an unresolved decision or external prerequisite;
5. confirm later work executed during a deferral had no dependency or path collision with the
   blocked Step;
6. confirm each observable outcome and its `Done when` evidence in the final inventory;
7. confirm positive and negative evidence;
8. compare implementation with the contracts and detectors delivered by that Step;
9. confirm repeated paths evolved in explicit dependency order; and
10. reject waived Steps, unrecorded deferrals, dependency violations, divergent histories, or
    unaccounted residue.

Account for the repository full gate in the final accumulated state; run it if the inventory lacks
applicable evidence. There is no branch merge,
per-Step rebase, or conflict-resolution phase.

## 4. Resolve accumulated contradictions

- Repeated path: preserve its explicit Step dependency order and the final contract-backed state.
- Undeclared path: create a preparation finding before repairing it.
- Competing designs or protected decisions: use `cg-unblock`.
- Contract contradiction: return it through a corrective Step; sign-off does not author a
  compromise contract after implementation.
- Detector contradiction: preserve enforcing scope; never weaken it merely to make green.

## 5. Write emergent verification

Write only in closure-owned test paths reserved by `cg-prepare`. Emergent tests prove phase
composition. They never compensate for a missing Step-owned contract, detector, or functional test.

Write the assertions the phase acceptance gate and the contracts actually require. Do not invent
role-by-route or isolation matrices unless those contracts or the gate name them.

## 6. Confirm the phase

1. Confirm every Step verification has applicable evidence for the final state in the inventory.
2. Confirm positive and negative evidence.
3. Confirm all detectors are non-vacuous and fail on demand.
4. Confirm decisions appear once in the decision log, their selected options or typed solutions
   and scoped interpretations are preserved, and the implementation follows the applicable
   resolved decisions. Pending answers remain pending and cannot satisfy phase acceptance.
5. Establish the phase acceptance gate from the roadmap, reusing only applicable evidence.
6. Confirm no unexpected worktree residue remains.

If an applicable P binding is absent from a contract, or an A detector fails, write a corrective
Step brief for `$cg-produce` and return it to the invoking procedure. If `.agents/cg/principles/architecture.yaml` `graph.recurse`
would add a child for a self-sufficient unit that has no contract, that is the same produce defect.

## 7. Harvest decisions

### 7.1 Classify one declared producer-phase cohort

When the active roadmap and preparation declare a decision-harvest cohort, classify only that
cohort. Do not default to every resolved decision in the log.

Before draining an entry, check active decision and phase dependencies. Preserve its authority
and relevant user-response evidence at an accessible destination and update transient consumers;
otherwise leave it in the log and report the harvest prerequisite. The original design answer
does not authorize a different harvest classification. Permanent contracts cannot cite plan IDs.

1. Create one versioned JSON manifest in the closure-owned phase-close path reserved by
   `cg-prepare`.
2. Copy the cohort's stable ID and exact eligible decision IDs from the accepted roadmap scope.
3. Classification IDs must exactly equal the eligible decision IDs.
4. Each eligible ID must be in the log's `Resolved` section. A pending or unknown ID is never
   eligible.
5. Classify each eligible decision once through `cg-unblock` D-5a: module contract, architecture
   principle, engineering guideline, product guideline, or drop. A `drop` carries one line saying
   why.
6. State each proposed permanent rule without citing its source decision, a plan ticket, or a
   `<docs>/plans/` path. Binding and invariant destinations name their detector. An `A` destination
   is valid only when the destination phase changes the verifier that registers its detector;
   otherwise retain it as `E`, adopt it as `P`, or record an upstream A proposal.
7. Run:

```bash
cg harvest <decision-harvest.json> --decision-log <docs>/plans/decision-log.md
```

The manifest is transient. Sign-off proposes classifications; it does not write promoted rules or
detectors outside an execution Step. Do not proceed until this detector passes.

### 7.2 Obtain one batch acceptance and validate the drain route

After classification passes, obtain one batch acceptance for the complete cohort. Acceptance
approves the proposed promotions; it does not reopen the underlying decisions.

1. Record `acceptance.status` as `accepted`, the owner in `acceptedBy`, an unambiguous UTC instant
   in `acceptedAt`, and `acceptedDecisionIds` exactly equal to the eligible decision IDs.
2. Route a non-empty accepted cohort to the next already-planned destination phase through
   `cg-prepare`. If no matching phase exists, return the work to `cg-plan` first.
   Under auto-run, return this request to the Manager's preparation-only exception and pause
   writes. The same source Engineer resumes sign-off with the returned preparation artifact;
   no destination Engineer executes before source closure.
3. The first prepared harvest Step must name the exact source manifest, cohort ID, classification
   digest, and drain IDs exactly equal the eligible decision IDs. That Step stays `Blocked` on
   source-phase completion; later Steps stay `Waiting` behind it.
4. Validate before closing the source:

```bash
cg harvest <decision-harvest.json> --decision-log <docs>/plans/decision-log.md \
  --stage close --preparation <destination-preparation.md>
```

A source phase cannot close until this gate passes. No permanent rule or detector is edited during
acceptance or routing. A valid empty cohort closes without acceptance or a route.

### 7.3 Classify other durable knowledge

- **Missing binding rule:** use the §2 repair loop (return a `$cg-produce` finding).
- **Durable rationale or threat model:** write it as a design record under §8.
- **Current product or operator procedure:** write it as a guide under §8.
- **Progress, sequencing, or command output:** leave it in the phase record.

Permanent documents must not depend on a transient phase path or ticket ID as their authority.

## 8. Write the durable record

Write durable non-contract documentation. Read contracts as evidence; never replace or defer them.
Design records live under `<docs>/decisions/`. Product and operator guides live under
`<docs>/guides/`. Both survive plan deletion. The roadmap is transient.

### 8.1 Respect lifecycle ownership

| Content | Owner |
|---|---|
| binding rule, invariant, entry point, forbidden dependency | `cg-produce` → `.agents/cg/` plus detector |
| programme outcome and phase map | `cg-plan` → roadmap |
| selected phase Steps, files, order, and execution context | `cg-prepare` → preparation record |
| Step implementation and contract co-delivery | `cg-produce` |
| integration evidence, phase closure, durable rationale, product and operator guidance, Mermaid | `cg-sign-off` |

Do not edit `.agents/cg/` as documentation cleanup. A missing or stale contract returns to
`cg-produce`.

### 8.2 Inspect evidence

Read relevant contracts and source. Identify audience. Decide whether the artifact is current truth
or a dated historical record. Search existing terminology and diagrams. Verify paths, routes,
modules, and commands. Preserve historical bodies; add a dated supersession banner rather than
rewriting history to look current.

### 8.3 Design records and guides

Design records (`<docs>/decisions/`): alternatives, accepted trade-offs, threat or failure model,
architecture consequences, supersession. Do not promote task logs or sequencing. Supersede a dated
record rather than silently changing it.

Guides (`<docs>/guides/`): current supported product — audience, happy path, authorization and
safety boundary, observable failure, recovery, and a runnable smoke test. Remove retired stores,
modules, routes, and deployment paths.

Name owner, forbidden owner, contract IDs, entry points, verification commands, and current paths
so a later session can route without chat history.

### 8.4 Mermaid diagrams

When creating or changing Mermaid, read [Mermaid diagrams](mermaid-diagrams.md) for view selection,
evidence, visual conventions, accessibility, and validation. Start from its focused examples only
when useful. Show the smallest relationship the reader needs; preserve contract facts and label
proposals explicitly. The VS Code integration is optional. Never claim an unperformed preview or
treat a diagram as proof that implementation matches the graph.

### 8.5 Validate the documentation set

Check changed relative links. Search live documents for retired names. Validate every changed
Mermaid diagram. Confirm durable documents do not cite transient plans as authority. Run
documented commands or state why they could not run.

## 9. Hand over out-of-phase work or roadmap corrections

Create a planning handover when the finding is genuinely outside the selected phase, or when it
exposes a missing prerequisite or outcome error that requires `cg-plan` to correct the roadmap.

Carrying work forward while closing is valid only in the first case and only when the phase
acceptance gate passes. In the second case, the phase remains Incomplete or Blocked.

Persist the input in the active roadmap's completion-handovers register. A chat summary is not a
handover.

```markdown
# Sign-off handover: <finding>
Source phase: <phase and sign-off record>
Target: cg-plan | cg-prepare
Disposition: future phase | blocked prerequisite | roadmap correction

## Finding and evidence
<reproduction, commands, logs, and observed result>

## Current and required behavior
<what exists and the contract-backed or product-required outcome>

## Affected scope
<modules, paths, data, security boundaries, consumers, and operations>

## Contract and decision impact
<rules, detectors, accepted decisions, assumptions, and unresolved protected decisions>

## Proposed acceptance gate
<runnable command or objective evidence>

## Priority, dependencies, and blocking status
<ordering and what cannot proceed>

## Reason it cannot be fixed safely in the selected phase
<scope or prerequisite proof>
```

`cg-plan` converts a roadmap-level handover into a phase. `cg-prepare` may consume it directly
only when an already-planned phase outcome and gate remain unchanged. Mark it Consumed only after
the receiving phase or preparation is named.

A handover is not a waiver. If the phase gate fails, mark Incomplete or Blocked, link the handover
or decision that unblocks it, and do not archive it as Complete.

## 10. Close and archive

1. Confirm the phase acceptance gate is green.
2. Confirm every corrective Step is closed with fresh evidence.
3. Mark the phase Complete with the date.
4. Replace forward-looking instructions with measured results.
5. Add valid out-of-phase handovers to the roadmap or named future phase.
6. Update roadmap and current-state tables.
7. Archive the completed phase and preparation records under `<docs>/plans/archive/`.
8. Update links to archived paths.
9. Re-run `cg verify` and a sweep that durable documents do not cite `<docs>/plans/` paths.

If the gate cannot become green, return Incomplete or Blocked to the invoking procedure. Do not archive.

## 11. Return the evidence and next route

Return the report and immediate next route to the invoking procedure. It decides whether to
continue, yield to its caller, or ask the user. A failed gate keeps the phase incomplete; it does
not cancel an authorized corrective route. Include a blocker only when something prevents that
route itself, such as an unanswered decision or unavailable prerequisite.

Report the execution baseline, queue-state history, final gates, defects and dispositions,
emergent tests, phase acceptance result, contracts and detectors verified, durable documents and
their validation method, out-of-phase handovers, archive location when eligible, and the exact
final commands. For documentation-only work, report only the artifacts written, their evidence, and
their validation.

Choose exactly one immediate route:

- corrective Step ready: use `cg-produce` with its brief;
- repair changes paths or ordering: use `cg-prepare` with the finding;
- protected decision blocks closure: use `cg-unblock` with the decision-log entry;
- valid cohort classification awaits owner acceptance: resume `cg-sign-off` with its manifest
  after the owner records one batch acceptance;
- accepted non-empty cohort has no prepared drain route: use `cg-prepare` with the destination
  phase and accepted manifest;
- accepted cohort has a prepared route whose close-stage detector passes: resume `cg-sign-off`
  for the source phase;
- unavailable external prerequisite blocks closure: resume `cg-sign-off` when it is available;
- documentation was part of another Contract Graph activity: return to that invoking skill with
  the verified artifact;
- documentation exposed stale contract truth: use `cg-produce` with the exact contract defect and
  its owning implementation Step;
- phase complete and the next roadmap phase is ready: use `cg-prepare` with that phase;
- roadmap correction or successor phase required: use `cg-plan` with the handover;
- standalone documentation is complete, or the programme is complete: name no next skill.

The invoking procedure formats the user-facing `Next action` block using the repository workflow.
Preserve the selected programme and phase in the result; a suggested successor never selects a
different programme or expands the caller's authority.

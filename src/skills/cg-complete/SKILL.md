---
name: cg-complete
description: Complete one selected Contract Graph phase after its continuous sequential cg-execute queue has drained in one branch or worktree. Use after every prepared Step reports complete or when final composition exposes a defect. Verifies dependency-safe queue history, blocked-Step deferrals and resumptions, every Step handoff, and combined phase behavior; fixes completion-owned composition issues directly; drives behavior or contract defects through corrective cg-execute Steps; harvests durable knowledge; and emits planning handovers for out-of-phase work or roadmap corrections. Never closes or archives a phase with an incomplete Step or failing acceptance gate.
---

# Contract Graph Complete

Own closure, not observation. Verify the accumulated repository, repair failures, and keep the
phase active until it is green or honestly blocked. Read `cg-decide`; use `cg-document` for
durable non-contract knowledge harvested during closure.

## Required outcome

Close the phase only when all twelve are true:

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
10. Durable rationale and product/operator guidance are harvested.
11. The phase status and roadmap reflect reality before archival.
12. The user-facing response names the next action, next skill, input artifact, and readiness
    condition.

If a protected decision, unavailable prerequisite, or roadmap correction prevents these outcomes,
finish this completion attempt with the explicit Incomplete or Blocked continuation state from §8
and §9. That state is actionable but is not phase completion.

## 1. Admit the accumulated phase

Do not begin closure until:

- every prepared Step is accounted for;
- every prepared Step is `Complete`, with no `Waiting`, `Ready`, `Blocked`, or `In progress`
  residue;
- each Step's `Done when` evidence comes from its final accumulated state;
- the current branch or worktree descends from the preparation baseline through every Step handoff;
- the full build-and-contract gate is green;
- every behavior, boundary, or invariant change includes its contract and detector;
- detectors have non-vacuous fail-on-demand evidence; and
- assumptions, decisions, residue, and rollback information are recorded.

An admission failure starts the repair loop in §2; it is not a terminal rejection report.

## 2. Run the repair loop

Classify every admission, test, contract, or acceptance finding:

| Finding | Required action |
|---|---|
| phase-level composition test or close record | fix directly in completion-owned paths and re-run affected gates |
| defect within an already prepared Step's paths | write a corrective Step brief, run `cg-execute`, then resume completion |
| defect requiring new paths or a changed remaining order | send the finding through `cg-prepare`, run the corrective Step, then resume completion |
| competing design or protected decision | use `cg-decide`; keep the phase Blocked while independent verification continues |
| genuinely out-of-phase work | hand it to `cg-plan`, or to `cg-prepare` only when a matching future phase already exists |
| missing prerequisite or outcome error | hand it to `cg-plan`, mark the phase Incomplete or Blocked, and resume after correction |

Completion-owned fixes are limited to paths reserved by `cg-prepare`: emergent composition tests
and phase-close records. If a repair changes production behavior, a boundary, an invariant, an
entry point, a contract, or a detector, execute a corrective Step instead. The same human or agent
may perform it; the transition to `cg-execute` is a responsibility boundary, not a requirement for
another task or person.

Use this corrective brief:

```markdown
# Corrective Step <phase>-R<number>: <finding>
Source: cg-complete

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
<state completion must re-admit>
```

After every repair:

1. run its `cg-execute` completion gate;
2. confirm the corrective handoff matches the current execution context;
3. repeat admission;
4. re-run the full phase gate and every original Step gate; and
5. continue until green or blocked by a recorded decision or unavailable prerequisite.

Do not leave a current-phase rejection as prose. Completion owns driving the corrective Step
through the loop.

## 3. Verify the continuous sequential history

Walk the actual Step execution history:

1. confirm exactly one Step was `In progress` at each transition;
2. confirm every selected Step was the lowest-numbered `Ready` Step at selection time;
3. match each Step's expected starting state to the latest verified phase state and all declared
   prerequisite handoffs;
4. confirm every blocked deferral names an unresolved decision or external prerequisite;
5. confirm later work executed during a deferral had no dependency or path collision with the
   blocked Step;
6. confirm each observable outcome and run its `Done when`;
7. confirm positive and negative evidence;
8. compare implementation with the contracts and detectors delivered by that Step;
9. confirm repeated paths evolved in explicit dependency order; and
10. reject waived Steps, unrecorded deferrals, dependency violations, divergent histories, or
    unaccounted residue.

Then run the repository full gate in the final accumulated state. There is no branch merge,
per-Step rebase, or conflict-resolution phase in the sequential model.

## 4. Resolve accumulated contradictions

- Repeated path: preserve its explicit Step dependency order and the final contract-backed state.
- Undeclared path: create a preparation finding before repairing it.
- Competing designs or protected decisions: use `cg-decide`.
- Contract contradiction: return it through a corrective Step; completion does not author a
  compromise contract after implementation.
- Detector contradiction: preserve enforcing scope; never weaken it merely to make green.

## 5. Write emergent verification

Write only in completion-owned test paths reserved by `cg-prepare`.

Typical assertions:

| Accumulated shape | Assertion |
|---|---|
| surface moved through several Steps | route/resource resolves in exactly one final binary |
| published contract plus consumers | detector evaluates all consumers and fails on demand |
| roles redistributed | complete role-by-route matrix permits only intended roles |
| shared record evolved | exactly one final writer per field |
| module registration changed | declared graph equals built graph and launch targets |
| read/write paths compose | security domains remain isolated with correct fallback |

Emergent tests prove phase composition. They never compensate for a missing Step-owned contract,
detector, or functional test.

## 6. Confirm the phase

1. Run every Step verification in the final state.
2. Confirm positive and negative evidence.
3. Confirm all detectors are non-vacuous and fail on demand.
4. Confirm decisions appear once in the decision log.
5. Run the phase acceptance gate from `cg-plan`.
6. Confirm no unexpected worktree residue remains.

If a binding rule is absent from a contract, create and run a corrective Step, then resume
confirmation. Do not write it as an isolated completion cleanup.

## 7. Harvest durable knowledge

### 7.1 Classify one declared producer-phase cohort

When the active roadmap and preparation declare a decision-harvest cohort, completion triages only
that cohort. It must not default to every resolved decision in the shared decision log.

1. Create one versioned JSON manifest in the completion-owned phase-close path reserved by
   `cg-prepare`.
2. Copy the cohort's stable ID and exact eligible decision IDs from the accepted roadmap scope.
   Roadmap review owns producer provenance; the manifest makes membership executable.
3. Require that classification IDs exactly equal the eligible decision IDs: no omission,
   duplicate, or extra ID is valid.
4. Confirm each eligible ID is in the log's `Resolved` section. A pending or unknown ID is never
   eligible. Other resolved decisions and every pending decision remain in the log for their own
   cohort or answer.
5. Classify each eligible decision once through `cg-decide` D-5a: module contract, Architecture
   Principle, Product Principle, Design Principle, or drop.
6. State each proposed permanent rule and delivery obligation without citing its source decision,
   a plan ticket, or a `docs-plans/` path. Binding and invariant destinations name their detector
   and enforcement-map treatment; a design guide names its cost and no detector/map row.
7. Run the same executable detector used by tests and preparation:

```bash
python3 scripts/contracts/verify_decision_harvest.py \
  --manifest <decision-harvest.json> \
  --decision-log docs-plans/decision-log.md
```

The manifest is transient execution state, not authority. Completion proposes classifications; it
does not write promoted rules or detectors outside an execution Step. Do not proceed to later
harvest lifecycle gates until this classification detector passes.

### 7.2 Obtain one batch acceptance and validate the drain route

After the classification detector passes, obtain one batch acceptance for the complete cohort.
Acceptance approves the proposed permanent-rule promotions as a batch; it does not answer or
reopen the underlying decisions.

1. Record `acceptance.status` as `accepted`, the accepting owner in `acceptedBy`, an unambiguous UTC
   instant in `acceptedAt`, and `acceptedDecisionIds` exactly equal to the eligible decision IDs.
   Partial acceptance, pending acceptance, omission, and extra IDs are invalid.
2. Route a non-empty accepted cohort to the next already-planned destination phase through
   `cg-prepare`. If no matching phase exists, return the proposed work to `cg-plan` first.
3. Require the first prepared harvest Step to name the exact source manifest, cohort ID,
   classification digest, and drain IDs exactly equal the eligible decision IDs. That Step stays
   `Blocked` on completion of the source phase; all later Steps stay `Waiting` behind it.
4. Validate acceptance and the prepared route before closing the source phase:

```bash
python3 scripts/contracts/verify_decision_harvest.py \
  --manifest <decision-harvest.json> \
  --decision-log docs-plans/decision-log.md \
  --stage close \
  --preparation <destination-preparation.md>
```

The route's stored classification digest makes the accepted classification set immutable across
the handoff. Its drain IDs make cohort membership explicit. A source phase cannot close until this
gate passes; no permanent rule or detector is edited during acceptance or routing. Once the source
phase closes, its prepared harvest Step may become `Ready` and normal sequential execution begins.
A valid empty cohort closes without acceptance or a route.

### 7.3 Classify other durable knowledge

Classify phase content:

- **Missing binding rule:** run the §2 repair loop through `cg-execute`.
- **Durable rationale or threat model:** promote through `cg-document`.
- **Current product/operator procedure:** promote through `cg-document`.
- **Progress, sequencing, or command output:** leave in the phase record.

Permanent documents must not depend on a transient phase path or ticket ID as their authority.

## 8. Hand over out-of-phase work or roadmap corrections

Create a planning handover when either:

- the finding is genuinely outside the selected phase; or
- it exposes a missing prerequisite or outcome error that requires `cg-plan` to correct the
  roadmap before the phase can continue.

Carrying work forward while closing is valid only in the first case and only when the original
phase acceptance gate passes. In the second case, the phase remains Incomplete or Blocked.

Persist the input in the active roadmap's `Completion handovers` register, or the repository's
equivalent named planning intake; a chat summary alone is not a handover.

```markdown
# Completion handover: <finding>
Source phase: <phase and completion record>
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

`cg-plan` converts a roadmap-level handover into a phase or revises an existing future phase.
`cg-prepare` may consume it directly only when an already-planned phase outcome and acceptance
gate remain unchanged. Mark it Consumed only after the receiving phase or preparation is named.

A handover is not a waiver. If the phase gate fails, mark the phase Incomplete or Blocked, link the
handover or decision that unblocks it, and do not archive it as Complete.

## 9. Close and archive

1. Confirm the phase acceptance gate is green.
2. Confirm every corrective Step is closed with fresh evidence.
3. Mark the phase Complete with the date.
4. Replace forward-looking instructions with measured results.
5. Add valid out-of-phase handovers to the roadmap or named future phase.
6. Update roadmap and current-state tables.
7. Archive the completed phase and preparation records where repository convention requires it.
8. Update links to archived paths.
9. Re-run permanent-reference sweeps and full verification.

If the gate cannot become green, stop at Incomplete or Blocked with corrective and handover records
ready for continuation. Do not perform archival steps.

## 10. Completion report

Report:

- execution baseline, queue-state transitions, and actual Step history;
- final gate results;
- defects found, classification, corrective Steps, and closed-loop evidence;
- emergent tests added;
- phase acceptance result;
- contracts and detectors verified;
- durable documents updated;
- out-of-phase handovers, blocked work, and archive location when eligible; and
- exact final commands.

## 11. Next-action response

Choose exactly one immediate route:

- corrective Step ready: use `cg-execute` with its brief;
- repair changes paths or ordering: use `cg-prepare` with the finding;
- protected decision blocks completion: use `cg-decide` with the decision-log entry;
- valid cohort classification awaits owner acceptance: resume `cg-complete` with its manifest
  after the owner records one batch acceptance;
- accepted non-empty cohort has no prepared drain route: use `cg-prepare` with the destination
  phase and accepted manifest;
- accepted cohort has a prepared route whose close-stage detector passes: resume `cg-complete`
  for the source phase;
- unavailable external prerequisite blocks completion: resume `cg-complete` when it is available;
- phase complete and the next roadmap phase is ready: use `cg-prepare` with that phase;
- roadmap correction or successor phase required: use `cg-plan` with the completion handover;
- programme complete: name no next skill.

End the user-facing response with:

```markdown
## Next action — <Corrective Step ready | Phase blocked | Phase complete | Programme complete>
- **User action:** <one concrete action>
- **Next input:** <$cg-execute | $cg-prepare | $cg-decide | $cg-complete | $cg-plan | None — programme complete> — <exact corrective brief, finding, decision entry, next phase, handover, or completion evidence>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Name the next selected phase and skill, or state explicitly that the programme is complete.

## Completion check

- [ ] Every Step report matches the continuous sequential history.
- [ ] Every prepared Step is `Complete`; no blocked or waiting residue remains.
- [ ] Every Step and corrective gate passes in the final state.
- [ ] Every current-phase defect completed the repair loop.
- [ ] Emergent tests pass.
- [ ] The phase acceptance gate passes.
- [ ] Contract-affecting repairs ran through `cg-execute`.
- [ ] Every carried-forward item has a complete planning handover.
- [ ] Durable knowledge survives plan deletion.
- [ ] Roadmap and phase status are current.
- [ ] No failing phase was marked or archived Complete.
- [ ] Final repository verification is green.
- [ ] The response ends with one exact next action and skill.

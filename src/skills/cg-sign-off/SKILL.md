---
name: cg-sign-off
description: Close one selected Contract Graph phase and own the durable record it leaves behind. Use after every prepared cg-produce Step reports complete, when final composition exposes a defect, or standalone whenever implemented behavior or durable rationale must be explained outside .agents/cg files. Verifies dependency-safe queue history, blocked-Step deferrals and resumptions, every Step handoff, and combined phase behavior; fixes closure-owned composition issues directly; drives behavior or contract defects through corrective cg-produce Steps; harvests decisions and durable knowledge; maintains architecture and design records, product and operator guides, and Mermaid diagrams; and emits planning handovers for out-of-phase work or roadmap corrections. Never closes or archives a phase with an incomplete Step or failing acceptance gate, and never displaces a required contract update from cg-produce.
---

# Contract Graph Sign Off

Own closure and the record it leaves behind. Verify the accumulated repository, repair failures,
keep the phase active until it is green or honestly blocked, and write the durable knowledge that
must survive the plan. Read `cg-unblock` for any fork encountered on the way.

## Two entry paths

| Invocation | Run |
|---|---|
| a prepared phase queue has drained, or composition exposed a defect | §1–§10, then §11 |
| durable rationale or product/operator guidance must be written, with no phase closing | §8 alone, then §11 |

The standalone path is a first-class entry, not a shortcut through closure. It never marks a phase
Complete and never edits `.agents/cg/`.

## Required outcome

Close the phase only when all thirteen are true. On the standalone path, only 10, 12, and 13 apply.

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
13. The user-facing response names the next action, next skill, input artifact, and readiness
    condition.

If a protected decision, unavailable prerequisite, or roadmap correction prevents these outcomes,
finish this attempt with the explicit Incomplete or Blocked continuation state from §9 and §10.
That state is actionable but is not phase completion.

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
| phase-level composition test or close record | fix directly in closure-owned paths and re-run affected gates |
| defect within an already prepared Step's paths | write a corrective Step brief, run `cg-produce`, then resume sign-off |
| defect requiring new paths or a changed remaining order | send the finding through `cg-prepare`, run the corrective Step, then resume sign-off |
| competing design or protected decision | use `cg-unblock`; keep the phase Blocked while independent verification continues |
| genuinely out-of-phase work | hand it to `cg-plan`, or to `cg-prepare` only when a matching future phase already exists |
| missing prerequisite or outcome error | hand it to `cg-plan`, mark the phase Incomplete or Blocked, and resume after correction |

Closure-owned fixes are limited to paths reserved by `cg-prepare`: emergent composition tests and
phase-close records. If a repair changes production behavior, a boundary, an invariant, an entry
point, a contract, or a detector, execute a corrective Step instead. The same human or agent may
perform it; the transition to `cg-produce` is a responsibility boundary, not a requirement for
another task or person.

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

After every repair:

1. run its `cg-produce` completion gate;
2. confirm the corrective handoff matches the current execution context;
3. repeat admission;
4. re-run the full phase gate and every original Step gate; and
5. continue until green or blocked by a recorded decision or unavailable prerequisite.

Do not leave a current-phase rejection as prose. Sign-off owns driving the corrective Step through
the loop.

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
- Competing designs or protected decisions: use `cg-unblock`.
- Contract contradiction: return it through a corrective Step; sign-off does not author a
  compromise contract after implementation.
- Detector contradiction: preserve enforcing scope; never weaken it merely to make green.

## 5. Write emergent verification

Write only in closure-owned test paths reserved by `cg-prepare`.

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
confirmation. Do not write it as an isolated closure cleanup.

## 7. Harvest decisions

### 7.1 Classify one declared producer-phase cohort

When the active roadmap and preparation declare a decision-harvest cohort, sign-off triages only
that cohort. It must not default to every resolved decision in the shared decision log.

1. Create one versioned JSON manifest in the closure-owned phase-close path reserved by
   `cg-prepare`.
2. Copy the cohort's stable ID and exact eligible decision IDs from the accepted roadmap scope.
   Roadmap review owns producer provenance; the manifest makes membership executable.
3. Require that classification IDs exactly equal the eligible decision IDs: no omission,
   duplicate, or extra ID is valid.
4. Confirm each eligible ID is in the log's `Resolved` section. A pending or unknown ID is never
   eligible. Other resolved decisions and every pending decision remain in the log for their own
   cohort or answer.
5. Classify each eligible decision once through `cg-unblock` D-5a: module contract, Architecture
   Principle, Product Principle, Design Principle, or drop. A `drop` carries one line saying why:
   the entry was binding authority under D-2 until this moment, and the manifest is the archived
   record that it existed and stopped.
6. State each proposed permanent rule and delivery obligation without citing its source decision,
   a plan ticket, or a `docs/plans/` path. Binding and invariant destinations name their detector
   and enforcement-map treatment; a design guide names its cost and no detector/map row.
7. Run the shipped detector. It checks cohort membership in both directions, that every
   promotion owes what its destination owes, that no promoted rule cites its own decision or a
   transient path, and that every dropped decision carries its reason:

```bash
cg harvest <decision-harvest.json> --decision-log docs/plans/decision-log.md
```

The manifest is transient execution state, not authority. Sign-off proposes classifications; it
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
cg harvest <decision-harvest.json> --decision-log docs/plans/decision-log.md \
  --stage close --preparation <destination-preparation.md>
```

The route's stored classification digest makes the accepted classification set immutable across
the handoff. Its drain IDs make cohort membership explicit. A source phase cannot close until this
gate passes; no permanent rule or detector is edited during acceptance or routing. Once the source
phase closes, its prepared harvest Step may become `Ready` and normal sequential execution begins.
A valid empty cohort closes without acceptance or a route.

### 7.3 Classify other durable knowledge

Classify phase content:

- **Missing binding rule:** run the §2 repair loop through `cg-produce`.
- **Durable rationale or threat model:** write it as a design record under §8.
- **Current product or operator procedure:** write it as a guide under §8.
- **Progress, sequencing, or command output:** leave it in the phase record.

Permanent documents must not depend on a transient phase path or ticket ID as their authority.

## 8. Write the durable record

Write durable non-contract documentation that stays useful to humans and agents. Read contracts as
evidence; never replace or defer them.

### 8.1 Respect lifecycle ownership

| Content | Owner |
|---|---|
| binding rule, invariant, entry point, forbidden dependency | `cg-produce` → `.agents/cg/` plus detector |
| programme outcome and phase map | `cg-plan` → roadmap |
| selected phase Steps, files, order, and execution context | `cg-prepare` → preparation record |
| Step implementation and contract co-delivery | `cg-produce` |
| integration evidence, phase closure, durable rationale, product and operator guidance, Mermaid | `cg-sign-off` |

Do not edit `.agents/cg/` as a documentation cleanup detached from implementation. A missing or
stale contract returns to its owning execution Step through `cg-produce`.

### 8.2 Inspect evidence

Before editing:

1. Read relevant contracts and source.
2. Identify audience and lifecycle tier.
3. Determine whether the artifact is current truth or a dated historical record.
4. Search existing terminology, diagrams, and neighboring explanations.
5. Verify paths, routes, modules, roles, stores, and commands.

Preserve historical bodies. Add a dated measurement or supersession banner rather than rewriting
history to look current.

### 8.3 Write for humans and agents

For human readers, include what the product or subsystem does, why the boundary exists, who owns or
operates it, and the failure, security, cost, and recovery consequences.

For agent readers, include the exact owner and forbidden owner, stable contract or requirement IDs,
entry points and trust boundaries, allowed and forbidden dependency directions, verification
commands, and current names and paths.

Use plain language first, then precise identifiers. Avoid prose that requires chat history.

### 8.4 Design records

Use design records for durable reasoning: alternatives considered, accepted trade-offs, threat or
failure model, architecture consequences, and supersession relationships.

Do not promote task logs, branch names, or temporary sequencing. A dated design record is historical
evidence; supersede it rather than silently changing its decision.

### 8.5 Product and operator guides

Guides describe the current supported product: audience and prerequisites, happy path, authorization
and safety boundary, observable failure, recovery and rollback, and a smoke test or verification.

Commands must be runnable. Remove retired stores, modules, routes, and deployment paths instead of
leaving contradictory operating stories.

### 8.6 Mermaid diagrams

Create the smallest diagram that materially clarifies a relationship.

1. Inspect source, contracts, and existing diagrams.
2. Check for Mermaid Chart frontmatter or managed synchronization.
3. Choose the semantic type: flowchart, sequence, state, class/ER, C4, journey, timeline, or Git.
4. Preserve repository artifact style.
5. Validate syntax and render or preview when tooling exists.
6. Inspect clipping, density, crossings, abstraction level, and legends.
7. Update surrounding prose and references.

Syntax rules: start with the exact diagram keyword; use stable IDs and quote punctuation-heavy
labels; keep one abstraction level; use subgraphs only for real ownership or deployment boundaries;
label ambiguous edges; avoid color-only meaning; split unreadable diagrams.

Validation order:

1. Mermaid extension validator and preview, if callable.
2. Mermaid CLI render to a temporary SVG or PNG, then inspect.
3. Static validation of keywords, delimiters, IDs, arrows, and `subgraph`/`end`.

State the validation method. Never claim a preview that did not occur.

Read [the VS Code Mermaid Chart reference](references/vscode-mermaid-chart.md) when extension
commands, AI repair, cloud synchronization, or sync review is relevant. Warn before credit-consuming
AI repair.

### 8.7 Validate the documentation set

- Check changed relative links.
- Search live documents for retired names and ambiguous terminology.
- Validate every changed Mermaid diagram.
- Confirm durable documents do not cite transient plans as authority.
- Run documented commands or state why they could not run.
- Confirm a human understands the outcome and an agent can find owner, boundary, and gate.

## 9. Hand over out-of-phase work or roadmap corrections

Create a planning handover when either:

- the finding is genuinely outside the selected phase; or
- it exposes a missing prerequisite or outcome error that requires `cg-plan` to correct the
  roadmap before the phase can continue.

Carrying work forward while closing is valid only in the first case and only when the original
phase acceptance gate passes. In the second case, the phase remains Incomplete or Blocked.

Persist the input in the active roadmap's `Sign-off handovers` register, or the repository's
equivalent named planning intake; a chat summary alone is not a handover.

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

`cg-plan` converts a roadmap-level handover into a phase or revises an existing future phase.
`cg-prepare` may consume it directly only when an already-planned phase outcome and acceptance
gate remain unchanged. Mark it Consumed only after the receiving phase or preparation is named.

A handover is not a waiver. If the phase gate fails, mark the phase Incomplete or Blocked, link the
handover or decision that unblocks it, and do not archive it as Complete.

## 10. Close and archive

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

## 11. Sign-off report and next action

Report the execution baseline, queue-state transitions, and actual Step history; final gate results;
defects found, their classification, corrective Steps, and closed-loop evidence; emergent tests
added; the phase acceptance result; contracts and detectors verified; durable documents and diagrams
updated with their validation method; out-of-phase handovers, blocked work, and the archive location
when eligible; and the exact final commands. On the standalone path, report only the artifacts
written, their evidence, and their validation.

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

End the user-facing response with:

```markdown
## Next action — <Corrective Step ready | Phase blocked | Phase complete | Documentation complete | Programme complete>
- **User action:** <one concrete action>
- **Next input:** <$cg-produce | $cg-prepare | $cg-unblock | $cg-sign-off | $cg-plan | None — documentation or programme complete> — <exact corrective brief, finding, decision entry, next phase, handover, verified artifact, or closure evidence>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Name the next selected phase and skill, or state explicitly that no next skill remains. Do not
invent a lifecycle transition for a standalone documentation task.

## Sign-off check

- [ ] Every Step report matches the continuous sequential history.
- [ ] Every prepared Step is `Complete`; no blocked or waiting residue remains.
- [ ] Every Step and corrective gate passes in the final state.
- [ ] Every current-phase defect completed the repair loop.
- [ ] Emergent tests pass.
- [ ] The phase acceptance gate passes.
- [ ] Contract-affecting repairs ran through `cg-produce`.
- [ ] Every carried-forward item has a complete planning handover.
- [ ] Durable knowledge survives plan deletion.
- [ ] Artifact tier and owner are correct; historical records remain historical.
- [ ] Product and operator procedures are runnable; diagrams validate and match source.
- [ ] Links and terminology are clean.
- [ ] Roadmap and phase status are current.
- [ ] No failing phase was marked or archived Complete.
- [ ] Final repository verification is green.
- [ ] The response ends with one exact next action and skill.

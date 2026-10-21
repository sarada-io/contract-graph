# Declared harvest cohort

Load only when the selected plan declares a producer-phase harvest cohort. Ordinary decision reconciliation remains in closure checks §7.0.

### 7.1 Classify one declared producer-phase cohort

Use the JSON directory for migrated evidence and the original Markdown path for an unmigrated cohort. Complete a mixed cohort’s migration before checking the directory. If no decision directory exists and the declared cohort is empty, omit `--decision-log`; never omit eligibility evidence for a non-empty cohort.

When the active roadmap and preparation declare a decision-harvest cohort, classify only that
cohort. Do not default to every resolved decision in the log.

Before draining an entry, check active decision and phase dependencies. Preserve its authority
and relevant user-response evidence at an accessible destination and update transient consumers;
otherwise leave it in the log and report the harvest prerequisite. The original design answer
does not authorize a different harvest classification. Permanent contracts cannot cite plan IDs.

1. Create one versioned JSON manifest in the closure-owned phase-close path reserved by
   `cg-produce`.
2. Copy the cohort's stable ID and exact eligible decision IDs from the accepted roadmap scope.
3. Classification IDs must exactly equal the eligible decision IDs.
4. Each eligible ID must have a resolved agent JSON record (or appear in the legacy log’s `Resolved` section during migration). A pending or unknown ID is never
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
cg harvest <decision-harvest.json> --decision-log .agents/cg/decisions
```

The manifest is transient. Sign-off proposes classifications; it does not write promoted rules or
detectors outside an execution Step. Do not proceed until this detector passes.

### 7.2 Obtain one batch acceptance and validate the drain route

After classification passes, obtain one batch acceptance for the complete cohort. Acceptance
approves the proposed promotions; it does not reopen the underlying decisions.

1. Record `acceptance.status` as `accepted`, the owner in `acceptedBy`, an unambiguous UTC instant
   in `acceptedAt`, and `acceptedDecisionIds` exactly equal to the eligible decision IDs.
2. Route a non-empty accepted cohort to the next already-planned destination phase through
   `cg-produce`. If no matching phase exists, return the work to `cg-plan` first.
   Use cg-produce’s internal preparation for the exact destination work list, preserving the source dependency; do not execute destination work before its prerequisites pass.
3. The first prepared harvest Step must name the exact source manifest, cohort ID, classification digest, and drain IDs exactly equal the eligible decision IDs. That Step stays `Blocked` on source-phase completion; later Steps stay `Waiting` behind it.
4. Validate before closing the source:

```bash
cg harvest <decision-harvest.json> --decision-log .agents/cg/decisions \
  --stage close --preparation <destination-preparation.md>
```

A source phase cannot close until this gate passes. No permanent rule or detector is edited during
acceptance or routing. A valid empty cohort closes without acceptance or a route.


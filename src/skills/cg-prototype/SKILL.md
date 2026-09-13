---
name: cg-prototype
description: Build a working prototype and refine it through manual human feedback when the desired experience needs exploration. Launch the existing application, make small scoped changes without application test automation, preserve contract truth, and turn explicit prototype acceptance into a roadmap for prepare, produce, and sign-off.
---

# CG Prototype

Reach a usable preview early. Iterate with the user until the intended result is accepted, then
hand the actual implementation and remaining delivery work to the standard lifecycle. Prototype
approval is not final sign-off. Do not invent human acceptance or silently begin auto-run.

Read `.agents/cg/phases.json` and load the families selected for `prototype`. Shipped defaults
include `.agents/cg/guidelines/engineering.yaml` on every pass; retained repository phase policy
controls loading. E remains advisory context: use relevant practices without reopening settled
decisions or treating disagreement as a compliance failure.

## 1. Route, start, launch — once per session

Read the root contract and `.agents/cg/workflow.md`. Route through contract-owned routes to the
smallest responsible boundary before reading implementation. Apply `hierarchy.kinds` and `graph`
from `.agents/cg/principles/architecture.yaml`; resolve applicable P rules and product intent.
Apply relevant E guidance to a remaining choice. Keep structural bindings and detectors.

Resolve `<docs>` from `.agents/cg/profile.json`, select one programme, and inspect `cg prototype
status` and `cg next`. Start with `cg prototype start --programme <slug>` or recover its existing
record and roadmap. Use a Git worktree containing the intended starting changes; preserve unrelated
work. The command creates the starter roadmap, not a branch or commit.

Read [session setup](references/session-setup.md) once to declare writes and resolve any older
installation conflict. Load [concurrent work](references/concurrent-work.md) only when another
writer or shared resource needs coordination. Revisit setup when scope, ownership, or policy
changes; do not reload it for ordinary feedback turns.

Use the existing application launch path. Do not prepare Steps, enumerate all future files, run
application test suites, or finish the roadmap before showing a preview. Fix launch problems
inside scope; report the exact access or environment prerequisite if the preview cannot run.

## 2. Implement and review in one continuing loop

Make the smallest useful change and present the running application. The user manually checks the
experience and supplies feedback. Execute authorized feedback within scope without separate plan,
prepare, produce, or sign-off invocations. Preserve context; do not create a phase per adjustment.
Do not author application tests or run application suites or automated browser regression tests
during this loop. Commands needed to build and serve the preview still run. Browser navigation
for presentation is not a browser test suite. Do not claim visual inspection without actual access.

Keep one short cumulative note in the roadmap: what changed, feedback and accepted choices,
review conditions, unfinished behavior, and deferred verification. Link evidence when useful;
source control holds exact edits. Ordinary feedback does not need a new receipt or checkpoint.
Use cg-unblock only for consequential choices, missing prerequisites, or retained-policy conflicts.

Keep contracts truthful in this iteration. Changes to boundaries, surfaces, relations, routes,
or invariants need corresponding YAML edits. If contract YAML changed, run `cg verify` in this
iteration and repair introduced graph failures before treating it as complete. If contract YAML
did not change, do not rerun graph verification for an ordinary feedback turn. Record existing
failures explicitly; prototype status never weakens a binding. Application tests stay deferred.

Only when presenting a review checkpoint, run `cg prototype review --programme <slug> --session
<id>`. Review fingerprints cover the programme's declared writes, including prior and released
writers' declarations. Include affected shared inputs in that scope; declarations do not discover
dependencies. New scope or changed reviewed files requires affected review. Records without write
declarations retain whole-repository snapshots. Do not hide implementation in plans or ignored
paths; ignored assets and external inputs require separate evidence.
Inspect the receipt's `reviewUnscopedDirty` paths: expand the declaration and refresh review for
related edits, or note briefly why they are unrelated in the existing roadmap. The list is a
review-time observation, not authorship proof or an automatic approval blocker.

After new feedback, `cg prototype resume --programme <slug>` clears acceptance and returns to
iteration. If the user pauses, use `suspend`. If they abandon, use `abandon` without deleting code.
Suspended or abandoned work does not become mergeable. A new session reads the roadmap and record
before resuming; silence and elapsed time never approve a prototype.

## 3. Record acceptance and finalise the roadmap

Obtain explicit acceptance of the whole requested prototype, distinguishing it from approval of
one adjustment. Record the actual answer and its scope in a JSON evidence file linked from the
roadmap, normally `<docs>/plans/<slug>/approval.json`:

```json
{"by":"the user who answered","response":"their actual answer","scope":"reviewed screens, interactions, devices and data"}
```

Use `cg prototype approve --programme <slug> --evidence <approval.json>`. The command rejects
source changed since the review checkpoint. This records attributed evidence, not authenticated
identity or a machine judgment of satisfaction. Never generate an answer on the user's behalf.

Finalise the existing roadmap from the accepted result. State the final observable outcome,
retained code and provisional choices, exact starting worktree, and dependencies or decisions.
Under `## Phase map`, use this shared roadmap table:

| Phase | Observable outcome | Prerequisites | Scope | Acceptance gate | Status |
|---|---|---|---|---|---|
| 1 — <name> | <independently verifiable result> | <phases, decisions, or None> | <contract boundaries> | <command or objective evidence> | Current |

Name concrete remaining phases and measurable gates. Include `## Deferred tests and known gaps`
with tests, mocks, failures and integration obligations assigned to those phases, or an explicit
account of why none remain. Give `## Programme completion gate` the final command or objective
evidence. Remove starter placeholders. Set the programme's top-level `Status: Active` before
any sections; phase table statuses are `Current`, `Blocked`, `Complete`, or `Future`.

Select one phase with stable scope and gate whose prerequisites are satisfied or explicitly
blocked. An accepted prototype is not a green prerequisite. Use cg-plan only for unresolved
programme outcomes, dependencies, or acceptance questions; a settled prototype goes directly to
prepare without another planning invocation.

Establish `cg verify` before handoff, reusing unchanged evidence under
[verification](../cg-prepare/references/verification.md) when applicable. Run `cg prototype handoff
--programme <slug> --session <id>`. It checks acceptance against the reviewed scope and rejects
missing or placeholder roadmap phases, completion gate, and deferred-work sections. These are
minimum structure checks; preparation still judges whether the plan covers the accepted outcome.
`cg next --programme <slug>` then selects preparation or an existing eligible queue. Changed
reviewed inputs before handoff require affected human review.

## 4. Hand over without rebuilding the prototype

When the user asks to finish or sign off this prototype, use
[cg-sign-off prototype completion](../cg-sign-off/references/prototype-completion.md). It owns the
remaining delivery and final verification without requiring the user to invoke every stage.
Record actual UX acceptance separately; a completion request alone is not acceptance. This is an
explicit exception to the prototype stage boundary for that selected completion request.

Give prepare the roadmap, accepted source snapshot, actual worktree including uncommitted files,
recorded feedback and approval, and remaining obligations. Ensure a fresh worker can access those
files; do not send only a plan into a clean checkout that lacks the implementation.

Normal produce completes and verifies the implementation. Sign-off closes only after final gates
pass. Any changes to the accepted experience need affected human review; tests and internal repairs
that preserve it do not require repeating the entire prototype review.

If a PR is explicitly requested, identify it as Prototype with verification and sign-off pending.
Draft status and labels are warnings, not enforcement. The optional `cg delivery verify --base`
check can be required by repository policy; do not configure external protection or open a PR just
because this skill was invoked. Never claim a local record alone blocks merging.

## Stage boundary — yield here

Continue the prototype loop through authorized feedback; yield when human review or a prerequisite
is needed. After an accepted handoff, follow an explicit prototype-completion request through cg-sign-off.
Otherwise return to the user unless auto-run continuation was already
explicitly authorized. In that case pass the accepted roadmap to cg-auto-run within that authority.
Do not require another approval of the plan merely because it was written after the prototype.

End every result with one block:

```markdown
## Next action — <Awaiting review | Iterating | Delivery ready | Blocked>
- **User action:** <review the preview, supply the prerequisite, or invoke the named next skill; None when already-authorized auto-run continues>
- **Next input:** <$cg-prototype | $cg-sign-off | $cg-prepare | $cg-plan | $cg-unblock | $cg-auto-run> — <one exact preview, roadmap, or decision>
- **Blocked by:** <human review or prerequisite preventing the next action; omit on an advancing route>
```

---
name: cg-prototype
description: Build a working prototype and refine it through manual human feedback when the desired experience needs exploration. Launch the existing application, make small scoped changes without application test automation, preserve contract truth, and turn explicit prototype acceptance into a roadmap for prepare, produce, and sign-off.
---

# CG Prototype

Reach a usable preview early. Iterate with the user until the intended result is accepted, then
hand the actual implementation and remaining delivery work to the standard lifecycle. Prototype
approval is not final sign-off. Do not invent human acceptance or silently begin auto-run.

## 1. Enter with the smallest useful context

Read the root contract and `.agents/cg/workflow.md`. Route the request through contract-owned
routes, then descend to the smallest responsible boundary before reading implementation. Read
`.agents/cg/principles/architecture.yaml`; apply `hierarchy.kinds` and `graph`: recurse,
selfSufficient, surface, adapters, stay, add-child, or elsewhere. Resolve applicable P rules and
product intent; consult E only for a remaining choice. Keep structural bindings and detectors.

On an older installation, workflow, phase policy, and the root skill catalog may be preserved
while this skill is new. Explain any conflict with prototype test timing. An explicit request to
use this prototype workflow authorizes its scoped adoption; amend only the necessary workflow
exception and add this skill's canonical catalog entry and prototype A/P/E phase row. Preserve all
other policy. If a separate explicit repository restriction remains unresolved, use cg-unblock;
do not silently waive it or ask again for authority already granted.

Resolve `<docs>` from `.agents/cg/profile.json`. Select one programme slug. Inspect existing
prototype records with `cg prototype status` and existing queues with `cg next`. Preserve unrelated
changes. Record launch instructions, selected scope, and the current execution context. Apply
[concurrent work](references/concurrent-work.md) when another programme or session is active.
Declare this session's scope before editing; stop your own overlapping writes until ownership and
affected evidence are resolved. Do not suspend another session's execution without authority.

Start a new record with `cg prototype start --programme <slug>`. It creates the initial roadmap
under `<docs>/plans/<slug>/roadmap.md` without replacing an existing one. The command requires a
Git worktree; it does not create branches or commits. Choose an existing safe worktree or create
one when repository policy requires isolation, preserving access to any starting changes.

Do not prepare Steps, enumerate all future files, run application test suites, or require a full
roadmap before launching. Use the existing application launch path. Fix launch problems inside
scope; report a specific access or environment prerequisite when it prevents a usable preview.

## 2. Implement and review in one continuing loop

Make the smallest useful change and present the running application. The user manually checks the
experience and supplies feedback. Execute authorized feedback within scope without separate plan,
prepare, produce, or sign-off invocations. Preserve context; do not create a phase per adjustment.
Do not author application tests or run application suites or automated browser regression tests
during this loop. Commands needed to build and serve the preview still run. Browser navigation
for presentation is not a browser test suite. Do not claim visual inspection without actual access.

Maintain a short cumulative record in the roadmap: objective, scope, current implementation,
feedback, accepted choices, review conditions, known failures, mocks or unfinished behavior, and
deferred verification. Link supporting evidence. Exact edits remain in source control or the
worktree; do not transcribe every CSS adjustment. Use cg-unblock only for consequential choices,
unanswered prerequisites, or conflicts with retained authority. Ordinary feedback stays here.

Keep contracts truthful. Internal changes with unchanged contract facts need no YAML edit.
Changed boundaries, surfaces, relations, routes, or invariants need corresponding contract changes.
Run `cg verify` before handoff; an unchanged result can follow the evidence rules in
[verification](../cg-prepare/references/verification.md). A known failure stays explicit and blocks
verified delivery; prototype status never authorizes weakening a binding or hiding a violation.

At a review checkpoint, run `cg prototype review --programme <slug>`. Its snapshot includes tracked
and non-ignored untracked files, including uncommitted changes. Do not place implementation in the
transient plans tree or ignore production files to bypass the snapshot. Record ignored assets and
external dependencies separately; the snapshot does not establish their correctness.

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

Finalise the existing roadmap using the outcome, phase, dependency, and acceptance requirements
in [cg-plan sections 2–7](../cg-plan/SKILL.md). Read them as the shared planning contract, not as
another stage invocation. Name concrete remaining phases and measurable gates; remove the starter
placeholders and set `Status: Active`. Record retained prototype code, provisional choices,
deferred tests, integration gaps, and the exact starting worktree. An accepted prototype is not
a green prerequisite. Route through cg-plan only if programme questions remain unresolved.

Run `cg prototype handoff --programme <slug>`. It checks acceptance against current source and
requires an active roadmap. Then `cg next --programme <slug>` selects preparation or an existing
eligible queue. Preparation still assesses the roadmap's substance; header presence alone does
not prove a complete plan. If approved source changes before handoff, return for affected review.

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

---
name: cg-prototype
description: Build a working prototype and refine it through manual human feedback when the desired experience needs exploration. Launch the existing application, make small scoped changes without application test automation, preserve contract truth, and turn explicit prototype acceptance into a roadmap for production and sign-off.
---

# CG Prototype

Read the shared Lifecycle bootstrap in `.agents/cg/contract-graph-agent.md` once per session. For programme recovery, perform its selection check immediately after this skill and the bootstrap, before following links to the root contract, workflow, catalogs or other references. Reuse unchanged context.

After scope is known, for chat, decision reviews and results, read [owner communication](../cg-unblock/references/owner-communication.md). Explain outcomes and choices for functional leaders; keep framework commands and approval mechanics in internal evidence.

Apply the shared selection gate before loading repository contracts, policy catalogs, plan/receipt history or implementation. Run `cg intent verify` before dependent delivery once scope is known. Missing or stale intent routes to cg-warmup; independent inspection and clarification remain available. Preserve repository-owned workflow restrictions and never fabricate owner approval.

Reach a usable preview early. Iterate with the user until the intended result is accepted, then
hand the actual implementation and remaining delivery work to the standard lifecycle. Prototype
approval is not final sign-off. Do not invent human acceptance or silently begin delivery.

Use the shared bootstrap's loading policy for `prototype`; retained phase policy controls loading and E remains advisory.

## 1. Route, start, launch — once per session

First recover the requested experience and intended checkout. A bare `/cg-prototype` resumes the clearly selected prototype and opens its preview; do not ask whether to launch. Run `cg status` once, or `cg status --programme <slug>` for an explicit target. If selection is required, stop and ask which listed experience to open; do not inspect candidates or Git history to choose. If no outcome exists, ask what experience to explore. Once selected, read only its roadmap's checkpoint, scope and launch instructions; read a scoped receipt only for a missing state/evidence field. Do not offer acceptance before showing the experience.

Resolve `<docs>` from `.agents/cg/profile.json` after selection. Reuse the status result rather than requesting delivery history. Before state-changing delivery or implementation, check `cg next --for cg-prototype --programme <slug>`; preview-only recovery does not need a second admission query merely to reopen the existing app. Start a new record only for a new selected outcome with `cg delivery start --programme <slug>`; preserve an existing record and roadmap. Use the intended checkout with its starting changes and preserve unrelated work. Start creates the starter roadmap, not a branch or commit.

For preview-only recovery, use the recorded launch instructions; do not load architecture/product catalogs or application source solely to serve an existing build unless retained policy requires it. Check the recorded endpoint and process/build location together where possible. If the correct preview responds, present it immediately. Otherwise start it using the recorded command, check readiness once and present it. Poll again only if still starting or failed, not after readiness is established. State build freshness uncertainty rather than infer source/build equivalence from timestamps. Before launch repair or feedback edits, load the root contract, product intent, retained workflow and required families, descend to the owning boundary and apply architecture `graph` and applicable P rules.

Read [session setup](references/session-setup.md) once when declaring writes or resolving an older installation conflict. Opening an existing preview alone needs no speculative write declaration. Load [concurrent work](references/concurrent-work.md) only when another writer or shared resource needs coordination. Revisit setup when scope, ownership, or policy changes; do not reload it for ordinary feedback turns.

Use the existing application launch path. Do not prepare Steps, enumerate all future files, run
application test suites, or finish the roadmap before showing a preview. Fix launch problems
inside scope; report the exact access or environment prerequisite if the preview cannot run.
Present the working URL or host preview and the next feedback action. If launch or browser access is unavailable, state what was actually checked and the missing prerequisite; source inspection alone does not establish that the interface works or looks correct. Do not replace the preview with a source-file inventory or a generic continue/accept menu.

For useful, permitted delegation, read the shared [coordinator and specialists](../cg-produce/references/coordination.md) procedure. The coordinator owns feedback, accepted choices, preview integration and review; bounded specialists follow prototype timing and return evidence. Keep small iterations direct when coordination would delay the preview. Delegation does not introduce production Steps, application test automation or a second owner conversation.

## 2. Implement and review in one continuing loop

Use the shared [responsibility review](../cg-warmup/references/responsibility-review.md) when adding a parallel path or changing ownership. Keep comparison proportional to the preview; record necessary cleanup and its owner in the existing roadmap/handoff. Deferred application tests do not justify silently accepting duplicate responsibilities or false contract boundaries.

Make the smallest useful change and present the running application. The user manually checks the
experience and supplies feedback. Execute authorized feedback within scope without separate plan,
production or sign-off invocations. Preserve context; do not create a phase per adjustment.
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

Only when presenting a review checkpoint, run `cg delivery review --programme <slug> --session
<id>`. Review fingerprints cover the programme's declared writes, including prior and released
writers' declarations. Include affected shared inputs in that scope; declarations do not discover
dependencies. New scope or changed reviewed files requires affected review. Records without write
declarations retain whole-repository snapshots. Do not hide implementation in plans or ignored
paths; ignored assets and external inputs require separate evidence.
Inspect the receipt's `reviewUnscopedDirty` paths: expand the declaration and refresh review for
related edits, or note briefly why they are unrelated in the existing roadmap. The list is a
review-time observation, not authorship proof or an automatic approval blocker.

After new feedback, `cg delivery resume --programme <slug>` clears acceptance and returns to
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

Use `cg delivery approve --programme <slug> --evidence <approval.json>`. The command rejects
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
the shared delivery handoff without another planning invocation.

Establish `cg verify` before handoff, reusing unchanged evidence under
[verification](../cg-produce/references/verification.md) when applicable. Run `cg delivery handoff
--programme <slug> --session <id>`. It checks acceptance against the reviewed scope and rejects
missing or placeholder roadmap phases, completion gate, and deferred-work sections. These are
minimum structure checks; preparation still judges whether the plan covers the accepted outcome.
`cg next --programme <slug>` then selects cg-sign-off as the common finishing owner. Changed
reviewed inputs before handoff require affected human review.

## 4. Hand over without rebuilding the prototype

When the user asks to finish or sign off this prototype, use
[cg-sign-off delivery completion](../cg-sign-off/references/delivery-completion.md). It owns the
remaining delivery and final verification without requiring the user to invoke every stage.
Record actual UX acceptance separately; a completion request alone is not acceptance. This is an
explicit exception to the prototype stage boundary for that selected completion request.

Give cg-sign-off the roadmap, accepted source snapshot, actual worktree including uncommitted files,
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
is needed. After an accepted handoff, follow an explicit completion request through cg-sign-off.
Otherwise return to the user. Completion continuation uses the same sign-off entry; sign-off returns implementation repairs to cg-produce within that authority.
Do not require another approval of the plan merely because it was written after the prototype.

End with the next practical action in functional language: review the preview, provide a missing answer, or continue the agreed work. Use the four-field review for a pending decision. Keep next-skill selection and exact evidence in the internal checkpoint; do not require a skill invocation to answer a question or continue already-authorized work.

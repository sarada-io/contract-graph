---
name: cg-sign-off
description: Finish a selected prototype through preparation, implementation, repairs, and final verification; verify and close a selected delivery phase; or write standalone durable documentation. Resolve the intended programme and scope first, then load only the matching procedure. Prototype completion owns continued delivery; phase sign-off owns its selected queue.
---

# CG Sign Off

Select the intended scope and sign-off type first, then read only its procedure. This entry point
routes work; it does not run closure checks or impose a stage-yield rule.

## Resolve the target before assessing readiness

Read the root contract, `.agents/cg/workflow.md`, and `.agents/cg/profile.json` for the docs root.
Use the global `cg` on PATH. `cg --version --json` identifies its actual executable and build;
`cg status` checks it against the installed framework. An unknown command or build mismatch is an
installation problem, not evidence of a phase blocker. Restore the intended global build and
re-init with the existing docs root/profiles; do not substitute a different lifecycle route.
Users can invoke this skill or say "continue sign-off". They do not need programme slugs, a mode
flag, a recovery prompt, or instructions about other runs. Resolve those details yourself:

1. Apply the user's current explicit scope or correction. A current phase-worker assignment
   limits that worker to its assigned phase; finding a suspended ledger does not create an assignment.
2. For an unqualified continuation, read `cg status --json` and its `signOffRecovery` field.
   Resume one matching recorded completion request. `cg next --for cg-sign-off --json` can resolve
   a single active request without a programme flag. An explicit target always takes precedence.
3. If no request is recorded yet, inspect the ongoing conversation, prototype receipts, and
   roadmap summaries. Establish the intended outcome before reading a phase's repair records.
   Phase readiness, branch names, recency, and prior assistant claims do not establish user intent.
4. When multiple outcomes remain plausible or records conflict with the current request, ask one
   plain-language question naming the outcomes. Resolve their internal identifiers yourself and
   record the answer through the selected procedure. Do not ask the user which CLI, phase repair,
   or internal mode to choose. Do not edit a guessed target while waiting.

Record prototype completion intent at admission, before awaiting acceptance or preparing delivery,
as described in its procedure. An interrupted review then has a recoverable parent task. A
readiness-only request does not create completion authority. Never record request-sign-off at
prototype start or “just in case”; it requires an actual request to finish that prototype.
Resume with one concise statement of the selected outcome and immediate next action; recovery must not require a special user prompt.

## Choose by the requested outcome

Use the request and established scope to choose one case below. File presence and lifecycle state
tell you what remains to be done after selection; they do not decide the type of sign-off. The
CLI’s `entry` field admits assessment and is a routing hint, not user authority; an explicit
phase-only request still wins. A Closed prototype receipt uses ordinary programme routing.

### Prototype completion — finish the working prototype

Choose this when the user wants the selected prototype brought through its remaining production
work to final sign-off. For example: "Finish the dashboard prototype", or "Sign this off" in the
conversation already developing that prototype.

- **Scope:** the selected prototype's accepted outcome, including unfinished behavior, tests,
  contract updates, documentation, repairs, and final checks.
- **Starting state:** a working prototype may have no prepared queue, deferred tests, known
  failures, or missing UX acceptance. These are admission tasks within this same procedure.
  Ask for missing acceptance while independent assessment continues; never invent it.
- **Continuation:** the completion coordinator runs necessary prepare/produce stages and receives
  corrective findings back until completion or a real blocker. A prepared phase inside this work
  does not change the selected sign-off type.
- **Read:** [Prototype completion](references/prototype-completion.md). Do not load phase sign-off.

### Phase sign-off — close one selected delivery phase

Choose this when the user's current request or this worker's current auto-run assignment limits the task to a particular phase and its
prepared queue. For example: "Sign off Phase 3 of the billing roadmap". The target must identify
both the programme and the phase, directly or through an unambiguous preparation artifact.

- **Scope:** verify the selected phase's Step evidence, contracts, acceptance gate, and durable
  records; archive it only after its closure requirements pass.
- **Starting state:** the queue is expected to be complete, but incomplete Steps, unreadable
  dependencies, or stale test commands remain findings for this exact phase.
- **Continuation:** ordinary phase sign-off returns preparation/production corrections as
  handoffs. An existing auto-run owner may continue them under its assigned authority.
- **Read:** [Phase sign-off](references/phase-sign-off.md). A phase that belongs to a prototype
  still uses this path when the request explicitly limits sign-off to that phase.

### Documentation only — produce a durable document

Choose this only when the requested result is a document, without completing a prototype or
closing a phase. For example: "Write the accepted storage decision as an ADR".

- **Scope:** write and validate the requested rationale or current product/operator guidance.
  Do not change contracts or mark any phase or prototype Complete.
- **Continuation:** return the verified artifact to the user or invoking activity. Report a
  discovered contract defect for its owning implementation Step.
- **Read:** [Shared closure checks §8 and §11](references/closure-checks.md#8-write-the-durable-record)
  only. Documentation required by prototype or phase completion stays within that procedure;
  it does not select this standalone path.

### Apply scope limits without changing the target

"Assess readiness only" limits the selected procedure to assessment and findings; it does not
authorize production or closure. For example, "Assess the dashboard prototype's readiness" reads
prototype completion in assessment mode, even if another programme has a completed queue.

An explicit phase-only request takes precedence over broader prototype context. Conversely,
"Finish this prototype, currently in Phase 3" retains whole-prototype completion scope: naming
the current phase is not a restriction to closing only that phase. If the distinction is unclear,
ask before starting either procedure.

For a bare invocation with both a current prototype and an older ready phase, use established
conversation scope; when there is none, ask which target the user means. Never choose the older
phase merely because `cg next` reports it ready for sign-off.

State the selected type, programme, and scope briefly before proceeding. On resumption, say
"Continuing prototype sign-off for <programme>" when prototype completion remains the parent
task, even if its next action is preparation or a phase check. Name any delivery phase as a child
obligation of that programme, not as a replacement for the parent task. "Ordinary phase sign-off"
requires an actual phase-only request or current worker assignment.

Keep that selection in
the existing roadmap/phase record when the procedure writes its ledger. Do not create a separate
routing document. After selection, read `.agents/cg/principles/architecture.yaml` `graph` and
resolve applicable P rules. Run `cg next --programme <slug>` for that target and route through the
selected contracts before reading implementation.

Prototype completion and phase sign-off own different continuation rules. Do not load both
procedures by default or switch between them because a gate fails. Both use shared closure checks
when relevant; those checks return findings to the selected procedure without changing its scope.

## Documentation-only work and unresolved selection

For documentation-only work, use §8 and §11 of the shared checks. Never edit `.agents/cg/` or mark
a phase Complete on that path. Return verified artifacts to the invoking activity; if a contract
defect is found, report its owning implementation Step for `cg-produce`.

Use the repository workflow's `Next action` format for user-facing handoffs. Documentation-only
work ends with `Documentation complete` and no next skill when nothing remains. If selection is
unresolved, use `Selection required`, name the missing target or scope under `Blocked by`, and
name `$cg-sign-off` as the next input after the user's answer. Do not invent UX acceptance.

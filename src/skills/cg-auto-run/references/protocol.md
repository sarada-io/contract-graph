# Auto-Run protocol

Shared by Manager and Engineer. This file has no spawn instructions, no
user-facing run report, and no harvest-Manager path. Apply it with the role
file named from `../SKILL.md`.

## Authority

Authority is granted per run and never widened by a worker, clarification, or
user answer. A phase Engineer receives at most the authority needed for its one
assigned phase (`queue` or `phase`). A next-phase or planning route returns to
the Manager, even when the whole run has wider authority.

The Engineer does not invoke `cg-plan`, spawn workers, or prepare a successor
phase. `cg-plan` is Manager work at `programme` authority only.

## Measure from disk

Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`); confirm
with `cg status --programme <slug>`; inspect residue ownership without requiring global cleanup
before preparing or producing its corrections.
Read the root contract, the active Plan/roadmap, selected phase, relevant
resolved and pending `DU-NN` decisions, preparation queue, prerequisite
sign-offs, and existing auto-run ledgers.
Read `.agents/cg/principles/architecture.yaml` for structural authority; the
Engineer applies its `graph` walk through the stage skills before implementation.
Use `cg next --programme <slug>` to check queue state against the selected phase; if multiple
active queues make the repository-wide result ambiguous, report that limitation
rather than selecting another phase's Step. Record the checkout and pre-existing
changes; a dirty tree alone is not a stop. Preserve unrelated work, and clarify
a conflicting write before editing it.

This adapter adds no graph rules and no `E` rules, and does not rewrite a
`Next input` because a catalog disagrees with still-mixed code. Stage skills own
graph traversal and checks.

| Measured state | Next work |
|---|---|
| no accepted Plan or no phase selected | Manager invokes `cg-plan` only at `programme` authority; otherwise returns that requirement |
| selected phase, no queue | Engineer invokes `cg-prepare` |
| an eligible Step is `Ready`, or an unblocked Step is `In progress` | Engineer invokes `cg-produce` |
| every Step complete | Engineer invokes `cg-sign-off` |
| phase signed off and archived, another planned phase remains | Manager checks evidence, disposes the Closed phase ledger, then assigns a new Engineer within authority |
| unresolved decision, no eligible Step | Manager handles `cg-unblock`; Engineer waits for resolution |

## Ledgers

Use `<docs>/plans/auto-run/<programme>/manager.auto-run.md` for compact programme
continuity and `<docs>/plans/auto-run/<programme>/<phase>.auto-run.md` for each
phase's dispatch history. Resolve `<programme>` from the roadmap's
repository-relative path so different roadmaps do not share a ledger. `cg init`
ignores `auto-run/` and `*.auto-run.md`; these are resumable working state, not
the durable sign-off record. Use canonical Plan and decision artifacts for
enduring authority. Do not copy ledgers into `archive/`.

The Manager records the accepted Plan, authority, selected phase, Engineer
identity, model choices, pending decision IDs, sign-off links, and forward
implications with their source paths. Replace stale summaries; do not append
every chat message or copy complete catalogs into each handoff.

Before each stage dispatch the Engineer writes:

```markdown
# Auto-run phase ledger
- **Status:** Active
- **Phase:** <Plan path and phase>
- **Authority:** <queue | phase>
- **Engineer:** <host worker ID, or mixed-context>
- **Model / reasoning:** <requested; effective if exposed, otherwise unverified>
- **About to dispatch:** <$cg-skill> — <exact input artifact>
- **Pending decisions:** <IDs, or None>

## History
| # | Stage | Returned status | Route taken | Evidence |
|---|---|---|---|---|
| 1 | $cg-prepare | Ready | $cg-produce | <queue path> |
```

The Manager writes its checkpoint before spawning or resuming a worker. On
recovery, check for a live Engineer and inspect disk progress before
dispatching: do not duplicate a still-running worker or blindly replay the
ledger's last intention. Stop a failed worker before replacing it. Replacement
Engineers resume the same phase from the Plan, queue, decisions and verification
artifacts, with incomplete work clearly marked.

Dispatch exactly one lifecycle stage at a time with the exact artifact named by
measured state or the previous `Next input`. Never substitute the Manager's
summary for that artifact. Skills are loaded when their stage is needed, not all
at Engineer startup.

## Outcomes and stop rules

Read the returned `Next action` status, `$cg-` token, artifact, and
`Blocked by` verbatim. Compare them with current disk state before proceeding.
Advance lifecycle work only when the block is well formed, no `Blocked by` is
present, and the route is within authority and phase assignment.

An incomplete phase with a runnable corrective route is advancing: dispatch
`cg-prepare` or `cg-produce` to repair it rather than asking the user to add a
Step or restart. A product failure does not itself block preparation of its
repair. For a corrective preparation route, use `cg next --programme <slug> --for cg-prepare` to
check permission; the queue's default execution stage need not be preparation.
Stage permission does not grant wider run authority. If a handoff names an
authorized repair but lists only the repairable defect as `Blocked by`, return
that contradictory handoff to the same Engineer for correction. Do not silently
ignore its blocking field or stop as though a new user decision were needed.
Preserve the failure evidence and the original block in history.

A blocking block stops its dependent work, not clarification. Send a decision or
`$cg-unblock` route to the Manager under `cg-unblock` D-6. Independent work can
continue while the question is pending where the host supports asynchronous
interaction. If every Step is blocked, keep the same Engineer waiting rather
than starting the next phase.

When an answer arrives, the Engineer clears only satisfied blockers, updates
queue readiness, and remeasures with `cg next`. Resume within the original
authority immediately; do not require another start command. Keep the old
blocking block in history as evidence, never rewrite it as an advance.

Stop lifecycle dispatch for a failed gate without a valid corrective route, a
malformed block, unknown state, route above authority, conflicting writes, or
repeated identical route with no state change. A pending question is not a
polling loop: await a message or checkpoint and yield when the host cannot wait.
User cancellation ends the run. A `None`, `Programme complete`, or
`Documentation complete` result ends the corresponding work. Phase closure at
`queue` or `phase` authority ends that run; otherwise it returns control to the
Manager for the next planned phase.

An Engineer reports its next action to the Manager. It does not emit the
user-facing run report.

A harvest destination-prepare or decision-log write handoff is Manager-only.
The Engineer returns that request and pauses; it does not open the Manager
instructions to perform it.

## Dispose working files

Use one current `**Status:** Active`, `**Status:** Suspended`,
`**Status:** Awaiting acceptance`, or `**Status:** Closed` field outside code fences.
The Engineer marks `Awaiting acceptance` after sign-off; only the Manager marks
`Closed` after accepting the handoff and satisfying the cleanup conditions below.
A Closed ledger is safe to delete even if an obsolete link still points at it.

Cancellation, a question, authority exhaustion, and a host failure stop execution;
they do not by themselves authorize deleting recovery state. Before closing or
removing any ledger or handoff file:

1. Confirm affected workers have stopped writing and reconcile the actual queue,
   decision log and handoff ownership. Do not delete a live ownership record.
2. Persist every queued user answer verbatim under its existing decision ID in the
   authoritative decision log, with timestamp and scoped interpretation. Re-read
   the entry before clearing the queued copy. Do not release cancelled work.
3. Preserve any unresolved question, partial work, required model/authority choice,
   or recovery pointer that has no other reader-accessible record. If reconciliation
   cannot finish safely, mark the run Suspended, retain its ledgers and handoff,
   and report the exact recovery action. A later session reconciles before writing.
4. Retain sign-off and gate evidence in canonical phase artifacts, and any requested
   external observation before disposal. An observer may capture the accepted
   handoff before deletion; this measurement barrier is not a new owner approval.

| File | When all cleanup conditions hold | End |
|---|---|---|
| `<phase>.auto-run.md` | Manager accepted this phase and confirmed its worker stopped writing | Mark Closed, then delete |
| `manager.auto-run.md` | Run ended and no outstanding recovery state depends on this file | Mark Closed, then delete |
| `harvest.auto-run.md` | Ownership returned or abandonment was reconciled, and queued answers are persisted | Mark Closed, then delete |

An incomplete phase remains Suspended on cancellation or authority exhaustion;
never label it complete to tidy the working tree. Resume from retained state,
not from a remembered conversation. Delete closed ledgers rather than archiving
copies. Reconcile stale links and remove empty auto-run directories after disposal.
`cg residue` reports Closed ledgers, including ones with stale inbound links;
it is an advisory detector, not authorization to delete Active or Suspended state.

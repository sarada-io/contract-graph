# Auto-Run Manager

Own programme continuity and user interaction. Keep implementation context with
the phase Engineer. Apply the shared authority, ledger, dispatch, stop, and
dispose rules in [protocol.md](protocol.md). Do not give those shared rules to
the Engineer by pointing it at this file.

## Starting a phase

Read the accepted Plan's outcome, constraints, ordered phases and acceptance
gates. Resolve the selected phase's prerequisites from their actual sign-off
records. Retain a compact working index of generic context: contract and policy
paths, accepted decisions and their scopes, completed phase evidence, pending
questions and relevant forward obligations. The index is a locator, not a
replacement for the Plan or binding catalogs.

Assign one Engineer the exact Plan path, phase ID, preparation path if any,
permitted authority, checkout and initial worktree state, root and relevant
starting contracts, prerequisite sign-offs, applicable decision IDs and source
paths, and phase ledger. Tell it to read the Plan directly: programme intent
and constraints, phase order, the complete assigned phase, and any dependencies
needed to understand it. It may read further when a dependency or ambiguity
requires it. Tell it to load `cg-auto-run` in Engineer role, then protocol.md
and engineer.md only.

Use the host's agent tools when available to start one fresh Engineer for the
selected phase, with an explicit brief and no inherited conversation history
where supported. Keep the same Engineer through phase sign-off and correction.
At a phase boundary, confirm it has stopped writing, then delete its Closed
phase ledger before starting its successor. Neither worker identity nor
conversation memory is a substitute for a recorded queue and truthful graph.

## Models and host capabilities

Honor the user's Manager and Engineer model and reasoning selections
independently. They may be supplied in the invocation or an explicit
repository-owned workflow setting; record them in the Manager ledger at run
start. A phase-specific override applies only when explicitly selected. Absent
selections, retain the current Manager model and the host's inherited Engineer
defaults. Do not choose a cheaper or different model silently.

Use actual host model-selection controls when spawning the Engineer. For the
Manager, use the main session's selected model; if a different requested
Manager model cannot be applied here, checkpoint and explain the required
session change. An unavailable required worker model or reasoning level is a
configuration blocker, not permission to substitute another. Record requested
and effective settings separately; when the host does not expose the effective
model, say unverified. Freeze choices for the run unless the user changes them.
These are orchestration instructions, not claims that skill metadata selects a
model or that `cg` implements model flags.

## Clarification and decisions

The Engineer asks you first, with evidence, options and a proposed
interpretation. Check the Plan, contracts, scoped authorizations and accepted
decisions. Return a cited answer if they settle it. For an unresolved owner
choice, use `cg-unblock` D-5 and D-6: write a pending entry, ask directly with
all viable options and free-text input, preserve the response and resulting
scoped decision, and notify the Engineer immediately. Keep one authoritative
entry and do not expand the user's answer beyond its scope. Save the full
decision request before presenting it. On a fresh session, recover pending
questions and recorded answers from the decision log; re-present unanswered
questions under their existing IDs. The user must be able to abandon the
previous session and continue without its chat. Do not re-ask a resolved
question or duplicate a pending entry.
You own ordinary decision-log writes; the Engineer owns queue and
implementation writes. For a prepared decision-harvest Step that must drain
entries, grant that Engineer an explicit temporary write handoff for the exact
cohort and pause your own log writes.
Before the handoff, write
`<docs>/plans/auto-run/<programme>/harvest.auto-run.md` with owner, Engineer ID,
exact cohort, and handoff status. Persist incoming user answers in the Manager
ledger with decision ID, timestamp and verbatim text until the Engineer returns
the log; do not rely on chat memory. On recovery, reconcile the lock, live
worker ownership, and the authoritative log before either role writes. Clear a
queued response only after its answer has been recorded in the authoritative
entry; avoid duplicating an already-applied answer.
Then re-read it and record those answers. Release resolutions only while the run
is authorized to continue. On cancellation, stop and reconcile the worker before
log writes, persist queued answers without resuming work, and retain Suspended
state if reconciliation cannot finish. Delete the lock only after ownership has
returned and all queued answers have been verified in the authoritative log. Never grant concurrent log ownership. Coordinate
any Plan updates before either role edits the same file.

Keep interacting while an Engineer can do independent work. If the host
supports only blocking questions, checkpoint and yield honestly. If no answer
can be received unattended, return the pending question; do not decide by
timeout. Reuse a live worker when the answer arrives, or resume from its phase
ledger if it no longer exists. A received decision does not automatically
satisfy other prerequisites or grant wider run authority.

## Accepting a handoff

There is one preparation-only cross-phase exception: `cg-sign-off` may require
an accepted harvest cohort's destination queue before the source phase can
close. With `roadmap` or `programme` authority and an already-planned
destination, pause the source Engineer and invoke `cg-prepare` for that exact
destination yourself under its stage instructions. Write
`<docs>/plans/auto-run/<programme>/harvest.auto-run.md` for the temporary
queue-write handoff, recording the source and destination phase/queue paths,
current owner, paused Engineer ID and status before writing the queue. On
recovery, reconcile that ownership and actual queue state before resuming.
Do not start a destination Engineer or execute its Steps:
its first harvest Step stays blocked on source closure and later Steps wait.
Return the prepared artifact to the same source Engineer for the harvest close
gate and sign-off. Delete the lock when that handoff returns. At narrower
authority request the additional preparation authority; do not grant it
implicitly. If a host gate cannot address this selected preparation while the
source queue is still active, report that prerequisite rather than bypassing
the gate. This exception does not permit implementation or routine sign-off in
the Manager.

Accept the phase only when all of these exist on disk. Do not reread the
implementation.

1. Sign-off artifact for the phase.
2. Archived queue path under `<docs>/plans/archive/`.
3. Phase acceptance command from the Plan, exit 0, with captured stdout.
4. `cg verify` exit 0, with captured stdout.
5. Engineer Next action with no `Blocked by`.

A claim of success alone is insufficient. Return gaps to the same Engineer.
If a later phase needs a new outcome or authority, route that issue rather than
silently amending the Plan.

Persist only what later work needs: canonical durable-record links, scoped
accepted decisions, forward implications and unresolved obligations. Decisions
already embodied in contracts need a locator, not another copy of their prose.
Do not build an unbounded lessons file. Replace stale Manager notes after each
handoff and ensure a replacement Manager can recover from disk.

After acceptance, dispose ledgers per protocol.md: delete the Closed phase
ledger before assigning the next Engineer. Delete `manager.auto-run.md` only
after the run ends and every cleanup condition is met; otherwise retain it as
Suspended. Cancellation or authority exhaustion alone never permits disposal.
Then report the whole run: authority, requested/effective models
and host limitations, phases completed, what shipped, acceptance commands and
results, decisions and outstanding answers, durable records, forward handovers,
and which working ledgers were deleted or retained for recovery. Do not report
measured token savings unless measured.
End with one next action:

```markdown
## Next action — <Run complete | Waiting for decision | Blocked | Authority required>
- **User action:** <one concrete action, or None>
- **Next input:** <$cg-skill | None — run complete> — <exact artifact or decision>
- **Blocked by:** <condition preventing the named next action>   <!-- only for non-advancing status -->
```

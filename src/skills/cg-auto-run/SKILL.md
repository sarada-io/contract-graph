---
name: cg-auto-run
description: Coordinate an accepted Contract Graph roadmap with an Auto-Run Manager and one fresh Auto-Run Engineer per phase. Use when the owner wants planned preparation, execution, and sign-off driven automatically. Keeps resumable context on disk, routes Engineer questions through the Manager to direct user interaction, records decisions before resuming dependent work, and respects the run's authority. Lifecycle work remains in its stage skills; fresh workers and model selection use host capabilities.
---

# CG Auto Run

Coordinate lifecycle work; do not replace the stage skills. Read
`.agents/cg/workflow.md` §Mandatory Next-Action Response before dispatch.

## 1. Select the role and authority

The main session is the **Auto-Run Manager**. Read [Manager instructions](references/manager.md).
A worker explicitly assigned one phase is the **Auto-Run Engineer**; read only
[Engineer instructions](references/engineer.md). An Engineer does not spawn another Manager or
Engineer. Both use this entrypoint so hosts that register skill invocation can recognize the
auto-run stage chain in the worker session as well as the Manager session.

Use the host's agent tools when available to start one fresh Engineer for the selected phase,
with an explicit brief and no inherited conversation history where supported. Keep that Engineer
through preparation, execution, corrective work, and sign-off. Run only one Engineer at a time;
the Manager coordinates while the Engineer owns phase implementation and queue writes.

If the host cannot create fresh workers or message them, disclose the limitation and use the same
role separation sequentially in the current session, checkpointing before handoffs. Do not claim
context isolation in that fallback. If the owner requires fresh workers, stop with the exact host
limitation instead. No new CLI daemon or universal agent launcher is implied by this skill.

Authority is granted per run and never widened by a worker, clarification, or user answer. If the
invocation does not name a level, use `roadmap` and state it.

| Level | May auto-dispatch | Stops after |
|---|---|---|
| `queue` | `cg-produce`, then `cg-sign-off`, including correction of that queue | the current queue drains and closes |
| `phase` | `cg-prepare`, `cg-produce`, `cg-sign-off` | one phase closes |
| `roadmap` (default) | `cg-prepare`, `cg-produce`, `cg-sign-off` | every remaining planned phase closes |
| `programme` | all of the above plus `cg-plan` | the programme gate passes |

At every level the Manager may invoke `cg-unblock` to clarify, record, and ask; this grants no
permission to decide for the user or execute blocked work. Never auto-invoke `cg-warmup`.
If any remaining roadmap phase is a placeholder, reduce `roadmap` authority to `phase` and say so.
A phase Engineer receives at most the authority needed for its one assigned phase. A next-phase
or planning route returns to the Manager, even when the whole run has wider authority.

## 2. Measure from disk

Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`); confirm with `cg residue`.
Read the root contract, the active Plan/roadmap, selected phase, relevant resolved and pending
`DU-NN` decisions, preparation queue, prerequisite sign-offs, and existing auto-run ledgers.
Read `.agents/cg/principles/architecture.yaml` for structural authority; the Engineer applies its
`graph` walk through the stage skills before implementation.
Use `cg next` to check queue state against the selected phase; if multiple active queues make the
repository-wide result ambiguous, report that limitation rather than selecting another phase's
Step. Record the checkout and pre-existing changes; a dirty tree alone is not a stop. Preserve
unrelated work, and clarify a conflicting write before editing it.

This adapter adds no graph rules and no `E` rules, and does not rewrite a `Next input`
because a catalog disagrees with still-mixed code. Stage skills own graph traversal and checks.

| Measured state | Next work |
|---|---|
| no accepted Plan or no phase selected | Manager invokes `cg-plan` only at `programme` authority; otherwise returns that requirement |
| selected phase, no queue | Engineer invokes `cg-prepare` |
| an eligible Step is `Ready`, or an unblocked Step is `In progress` | Engineer invokes `cg-produce` |
| every Step complete | Engineer invokes `cg-sign-off` |
| phase signed off and archived, another planned phase remains | Manager checks evidence, then assigns a new Engineer within authority |
| unresolved decision, no eligible Step | Manager handles `cg-unblock`; Engineer waits for resolution |

## 3. Checkpoint and dispatch

Use `<docs>/plans/auto-run/<programme>/manager.auto-run.md` for compact programme continuity and
`<docs>/plans/auto-run/<programme>/<phase>.auto-run.md` for each phase's dispatch history. Resolve
`<programme>` from the roadmap's repository-relative path so different roadmaps do not share a
ledger. `cg init` ignores `auto-run/` and `*.auto-run.md`; these are resumable working state, not
the durable sign-off record. Use canonical Plan and decision artifacts for enduring authority.

The Manager records the accepted Plan, authority, selected phase, Engineer identity, model choices,
pending decision IDs, sign-off links, and forward implications with their source paths. Replace
stale summaries; do not append every chat message or copy complete catalogs into each handoff.

Before each stage dispatch the Engineer writes:

```markdown
# Auto-run phase ledger
- **Phase:** <Plan path and phase>
- **Authority:** <queue | phase>
- **Engineer:** <host worker ID, or same-session fallback>
- **Model / reasoning:** <requested; effective if exposed, otherwise unverified>
- **About to dispatch:** <$cg-skill> — <exact input artifact>
- **Pending decisions:** <IDs, or None>

## History
| # | Stage | Returned status | Route taken | Evidence |
|---|---|---|---|---|
| 1 | $cg-prepare | Ready | $cg-produce | <queue path> |
```

The Manager writes its checkpoint before spawning or resuming a worker. On recovery, check for a
live Engineer and inspect disk progress before dispatching: do not duplicate a still-running
worker or blindly replay the ledger's last intention. Stop a failed worker before replacing it.
Replacement Engineers resume the same phase from the Plan, queue, decisions and verification
artifacts, with incomplete work clearly marked.

Dispatch exactly one lifecycle stage at a time with the exact artifact named by measured state or
the previous `Next input`. Never substitute the Manager's summary for that artifact. Skills are
loaded when their stage is needed, not all at Engineer startup.

## 4. Interpret outcomes without bypassing blockers

Read the returned `Next action` status, `$cg-` token, artifact, and `Blocked by` verbatim. Compare
them with current disk state before proceeding. Advance lifecycle work only when the block is
well formed, no `Blocked by` is present, and the route is within authority and phase assignment.

An incomplete phase with a runnable corrective route is advancing: dispatch `cg-prepare` or
`cg-produce` to repair it rather than asking the user to add a Step or restart. A product failure
does not itself block preparation of its repair. For a corrective preparation route, use
`cg next --for cg-prepare` to check permission; the queue's default execution stage need not be
preparation. Stage permission does not grant wider run authority. If a handoff names an authorized
repair but lists only the repairable defect as `Blocked by`, return that contradictory handoff
to the same Engineer for correction. Do not silently ignore its blocking field or stop as though
a new user decision were needed. Preserve the failure evidence and the original block in history.

A blocking block stops its dependent work, not clarification. Send a decision or `$cg-unblock`
route to the Manager under `cg-unblock` D-6. The Manager asks the user directly when existing
authority cannot settle it, offering all viable options and a typed solution. Independent work
can continue while the question is pending where the host supports asynchronous interaction.
If every Step is blocked, keep the same Engineer waiting rather than starting the next phase.

When an answer arrives, the Manager records it in the same decision entry and notifies the
Engineer. The Engineer clears only satisfied blockers, updates queue readiness, and remeasures
with `cg next`. Resume within the original authority immediately; do not require another start
command. Keep the old blocking block in history as evidence, never rewrite it as an advance.

Stop lifecycle dispatch for a failed gate without a valid corrective route, a malformed block,
unknown state, route above authority, conflicting writes, or repeated identical route with no
state change. A pending question is not a polling loop: await a message or checkpoint and yield
when the host cannot wait. User cancellation ends the run. A `None`, `Programme complete`, or
`Documentation complete` result ends the corresponding work. Phase closure at `queue` or `phase`
authority ends that run; otherwise it returns control to the Manager for the next planned phase.

## 5. Phase isolation and reporting

Each Engineer is a fresh start from disk when the host supports it. A new agent is the intended
pattern for the next phase; there is no per-run cap and no dispatch budget. Context remains useful
within a phase, including sign-off and repair, while only relevant evidence crosses phases.

The Engineer returns sign-off status, exact verification results, changed contracts and durable
records, decision IDs and response implications, unresolved matters, and forward obligations with
source links. The Manager checks this evidence and the Plan's acceptance conditions before moving
on. This is completion checking, not an independent implementation review. Never soften a failed
gate or treat an unrun gate as passed. Mark a phase ledger `Closed` only after actual closure.

Report the whole run: authority, requested/effective models and host limitations, phases completed,
what shipped, acceptance commands and results, decisions and outstanding answers, durable records,
forward handovers, and the ledger paths. Do not report measured token savings unless measured.
End with one next action:

```markdown
## Next action — <Run complete | Waiting for decision | Blocked | Authority required>
- **User action:** <one concrete action, or None>
- **Next input:** <$cg-skill | None — run complete> — <exact artifact or decision>
- **Blocked by:** <condition preventing the named next action>   <!-- only for non-advancing status -->
```

An Engineer reports its next action to the Manager; the Manager owns the user-facing run report.

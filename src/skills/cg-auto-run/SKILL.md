---
name: cg-auto-run
description: Coordinate an accepted Contract Graph roadmap with an Auto-Run Manager and one fresh Auto-Run Engineer per phase. Use when the owner wants planned preparation, execution, and sign-off driven automatically. Keeps resumable context on disk, routes Engineer questions through the Manager to direct user interaction, records decisions before resuming dependent work, and respects the run's authority. Lifecycle work remains in its stage skills; fresh workers and model selection use host capabilities.
---

# CG Auto Run

Coordinate lifecycle work; do not replace the stage skills. Read
`.agents/cg/workflow.md` §Mandatory Next-Action Response before dispatch.
Read `.agents/cg/principles/architecture.yaml` for structural authority. This
adapter adds no graph rules and no `E` rules, and does not rewrite a `Next input`
because a catalog disagrees with still-mixed code.

## 1. Select the role and authority

The main session is the **Auto-Run Manager**. Read
[shared protocol](references/protocol.md), then
[Manager instructions](references/manager.md).
A worker explicitly assigned one phase is the **Auto-Run Engineer**; read
[shared protocol](references/protocol.md), then only
[Engineer instructions](references/engineer.md). Do not read
[Manager instructions](references/manager.md). An Engineer does not spawn
another Manager or Engineer. Both use this entrypoint so hosts that register
skill invocation can recognize the auto-run stage chain in the worker session
as well as the Manager session.

These roles exist only under `cg-auto-run`. Standalone `cg-plan`, `cg-prepare`,
`cg-produce`, and `cg-sign-off` are user-invoked skills. They are not Manager
or Engineer jobs. Do not spawn a phase worker to write a roadmap, and do not
treat a planning session as the Produce worker.

Authority is granted per run and never widened by a worker, clarification, or
user answer. If the invocation does not name a level, use `roadmap` and state
it.

| Level | May auto-dispatch | Stops after |
|---|---|---|
| `queue` | `cg-produce`, then `cg-sign-off`, including correction of that queue | the current queue drains and closes |
| `phase` | `cg-prepare`, `cg-produce`, `cg-sign-off` | one phase closes |
| `roadmap` (default) | `cg-prepare`, `cg-produce`, `cg-sign-off` | every remaining planned phase closes |
| `programme` | all of the above plus `cg-plan` | the programme gate passes |

At every level the Manager may invoke `cg-unblock` to clarify, record, and ask;
this grants no permission to decide for the user or execute blocked work.
Never auto-invoke `cg-warmup`. If any remaining roadmap phase is a placeholder,
reduce `roadmap` authority to `phase` and say so. A phase Engineer receives at
most the authority needed for its one assigned phase. A next-phase or planning
route returns to the Manager, even when the whole run has wider authority.

If the host cannot create fresh workers or message them, stop with the exact
host limitation unless the invocation names `mixed-context`. Mixed-context
runs the same role separation sequentially in the current session and does not
isolate context; disclose that. If the owner requires fresh workers, stop.
No new CLI daemon or universal agent launcher is implied by this skill.

## 2. Shared protocol

Apply [shared protocol](references/protocol.md) for measurement, ledgers under
`<docs>/plans/auto-run/`, dispatch, stop rules, and disposal. Stage skills own
graph traversal and checks. Confirm `<docs>` from `.agents/cg/profile.json`.

## 3. Phase grain

Keep that Engineer through preparation, execution, corrective work, and
sign-off. Run only one Engineer at a time; the Manager coordinates while the
Engineer owns phase implementation and queue writes.

Each Engineer is a fresh start from disk when the host supports it. A new agent is the intended
pattern for the next phase; there is no per-run cap and no dispatch budget.
That grain is one phase, not one skill and not one Step. Context remains useful
within a phase, including sign-off and repair, while only relevant evidence
crosses phases. Isolation caps accumulated phase context; do not report
measured token savings unless measured.

An Engineer reports its next action to the Manager; the Manager owns the
user-facing run report.

## Prototype delivery

For side-by-side prototype and delivery sessions, apply
[concurrent work](../cg-prototype/references/concurrent-work.md). Each writing Engineer records
its own session and scope; a Manager does not claim its worker's edits. Keep programme-qualified
ledgers and record the actual worker context. Arrange stable inputs before the final closing gate.

An accepted prototype roadmap may enter this lifecycle after its record is `Handed off`.
Use `cg next --programme <slug>` to avoid unrelated queues. On hosts using the optional gate,
set `CG_PROGRAMME` to that selected slug in the hook environment when multiple programmes exist.
Pass the actual prototype worktree, including relevant uncommitted files, to its Engineer. Do not
start a fresh checkout without those changes. Preparation measures the provisional baseline and
assigns deferred tests and repairs; prototype acceptance is not a verified handoff. Keep ordinary
authority limits and final sign-off. Do not dispatch cg-prototype automatically or infer human
approval. If the accepted experience must change, record the affected question and continue only
independent authorized work until it is resolved.

When resuming an interrupted run, read `cg status --programme <slug>` before trusting a suspended
ledger or old repair report. Reconcile the existing ledger against the current Step and receipt.
Dispatch queue syntax or misplaced Step-gate repairs to `cg-prepare` under the existing run
authority. Keep foreign residue with its programme owner; coordinate it only when a required
global closure gate depends on it. Report the exact file, owner, blocking condition, and next
action. Do not turn routine bookkeeping into a request for a new user decision.

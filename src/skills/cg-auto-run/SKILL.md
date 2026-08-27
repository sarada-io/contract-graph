---
name: cg-auto-run
description: Chain Contract Graph lifecycle stages automatically instead of returning each hop to the user. Use when the next stage is already determined by measured state and the owner wants the queue driven to a stop condition rather than resumed by hand. Dispatches one stage at a time, reads the mandatory Next action block it returns, and advances only on an advancing status within the granted authority level. Defaults to running preparation, execution, and closure unattended across every planned phase of a roadmap, stopping at planning and at any fork that reaches cg-unblock, and reports the whole run as one summary. Never follows a block carrying Blocked by, never auto-invokes cg-unblock or cg-warmup, never widens its own authority, and writes a resumable run ledger to disk before every dispatch so a context break resumes mid-run rather than restarting. Does not plan, prepare, implement, or close anything itself — every unit of work stays owned by the stage skill that owns it.
---

# CG Auto Run

Drive the lifecycle to its next genuine decision. Do no lifecycle work yourself.
Read `.agents/cg/workflow.md` §Mandatory Next-Action Response before dispatching anything.

## Why it exists

Each lifecycle skill ends by naming exactly one successor. That handoff is already mechanically
extractable — the route leads `Next input` as a `$cg-` token precisely so an adapter can follow it.
What it lacks is something to do the following. This skill is that adapter, and nothing more.

The value is not saved keystrokes. It is that the hop is taken from **measured state written to
disk** rather than from a user reconstructing where they were three days ago.

## Required outcome

Finish with all six true:

1. Every dispatched stage was named by the previous stage's `Next input`, or by measured state on
   the first dispatch.
2. Every stage ran under its own skill, unmodified. This skill added no rules to any of them.
3. Every advance was inside the granted authority level.
4. Every stop condition that fired is recorded with the block that triggered it.
5. The run ledger on disk matches what actually happened, and was written *before* each dispatch.
6. The response ends with one exact next action and skill.

## 1. Establish authority before dispatching anything

Authority is granted per run, never inferred, never widened mid-run. If the invocation does not
name one, use `roadmap` and say so.

| Level | May auto-dispatch | Stops after |
|---|---|---|
| `queue` | `cg-produce` repeatedly, then `cg-sign-off` | the current queue drains |
| `phase` | `cg-prepare`, `cg-produce`, `cg-sign-off` | one phase closes |
| `roadmap` (default) | `cg-prepare`, `cg-produce`, `cg-sign-off` | three phases close, or the budget is exhausted; remaining phases are a fresh run |
| `programme` | all of the above plus `cg-plan` | the programme gate passes |

`roadmap` is the default because a planned roadmap has already had its expensive review. Every
phase in it was ordered, given an outcome and an acceptance gate, and agreed before any of this
runs. A run should close a few phases, not one and not the whole programme. Yielding after three
is a context break, not a request to re-approve the next one. Re-invoke this skill; the ledger is
the resume point.

**`roadmap` authority requires a roadmap whose phases are all planned.** Check before the first
dispatch: if any phase is a placeholder, or the roadmap ends mid-sequence, drop to `phase` and say
so. Continuing across an unplanned boundary means preparing a phase whose outcome nobody wrote.

`cg-plan` sits outside the default deliberately. A roadmap is the one artifact whose cost of being
silently wrong is paid by every stage after it, and it is the cheapest one for an owner to read.
Once the plan is agreed, preparation, execution, and closure are mechanical consequences of it —
across successive runs, for every phase in it, not just the first.

`cg-unblock` is the other stop, for the same reason from the other end — see §5. A fork that
reaches it is one the contracts could not settle, so it is the owner's to settle.

`cg-warmup` is dispatchable at no level. It runs once, it rewrites the contract surface the other
stages depend on, and its `Harvested rules and structural candidates — please confirm` register
exists to be read by a person.

## 2. Measure state before the first dispatch

Do not ask the user where they are. Establish it:

1. Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with
   `cg residue`, which prints `<docs>/plans/`.
2. Read `.agents/cg/contract.yaml` and route through its connected contract graph. Dispatched
   skills apply `.agents/cg/principles/architecture.yaml` `graph` and consult `E` themselves.
   This adapter adds no graph rules and no `E` rules, and it does not rewrite a `Next input`
   token because a catalog disagrees with still-mixed code.
3. Read `<docs>/plans/` for the active roadmap and the selected phase.
4. Read the phase's preparation record: does a Step queue exist, and what is each Step's state?
5. Read `<docs>/plans/decision-log.md` for `DU-NN` entries that block the selected phase.
6. Read `<docs>/plans/auto-run/` if present — a prior run may have checkpointed this phase mid-queue.

Name the first stage from that measurement:

- no roadmap, or no phase selected → `cg-plan` is required, and only `programme` authority may
  dispatch it: stop, and say so;
- phase selected, no prepared queue → `cg-prepare`;
- queue prepared, a Step is `Ready` → `cg-produce`. Do not re-dispatch `cg-prepare` to re-score
  its required-outcome list; a Ready queue is sufficient to keep executing.
- every Step `Complete` → `cg-sign-off`;
- phase closed and the roadmap names an unstarted phase → `cg-prepare` with that phase, at
  `roadmap` or `programme` authority only; at `queue` or `phase`, stop and say the run finished
  what it was authorised for;
- queue prepared, no Step `Ready`, blockers present → stop; this is `cg-unblock`'s work, not yours.

## 3. Write the ledger, then dispatch one stage

Write `<docs>/plans/auto-run/<phase>.auto-run.md` **before** each dispatch, never after.

One file per phase in one directory, so running Phase 3 does not overwrite the record of Phase 2
and the clutter stays in a single place. `cg init` ignores both `auto-run/` and `*.auto-run.md` in
the root `.gitignore`, so these are local working state at whatever depth they land — keep them as
long as they are useful, they never reach history. The durable account of what a run produced is
`cg-sign-off`'s output, not this. A run that dies mid-stage must
leave behind what it was about to do, not what it last finished.

```markdown
# Auto-run ledger

- **Authority:** <queue | phase | roadmap | programme>
- **Started:** <timestamp>
- **Stage budget:** <n dispatched> of <cap>
- **About to dispatch:** <$cg-skill> — <exact input artifact>

## History
| # | Stage | Returned status | Route taken | Ledger written |
|---|---|---|---|---|
| 1 | $cg-prepare | Ready | $cg-produce | yes |
```

Dispatch exactly one stage. Pass it the exact artifact the previous block named under `Next input` —
the phase, the Step brief, the evidence bundle. Never paraphrase the artifact, and never pass a
summary of it in place of the thing itself.

## 4. Read the returned block, do not interpret it

The stage returns a `Next action` block. Extract three fields verbatim: the status heading, the
`$cg-` token under `Next input`, and whether `Blocked by` is present.

Advance if and only if **all five** hold:

- [ ] `Blocked by` is absent.
- [ ] The `Next input` token is a `$cg-` skill, not `None`.
- [ ] That skill is dispatchable at the granted authority level.
- [ ] The stage budget is not exhausted.
- [ ] The status heading is not `Programme complete` or `Documentation complete`, and this run
      has not already closed three phases (`Phase complete` counted from returned headings).

If any is false, stop. Do not repair the block, do not re-run the stage hoping for a cleaner one,
and do not substitute your own judgement about what the stage "meant". Do not invent a fifth field
from `architecture.yaml` or `engineering.yaml`. A `Phase complete` heading whose `Next input` is
`$cg-prepare` for the next planned phase is advancing until it is the third close this run. A
stage that returned a malformed block is a defect to report, not an obstacle to route around.

## 5. Stop conditions

These are absolute. No authority level overrides any of them.

| Condition | Why it is terminal |
|---|---|
| `Blocked by` present | `workflow.md` §Mandatory Next-Action Response makes this the single stop signal |
| `Next input: $cg-unblock` | The fork needs a recorded decision; auto-following it would decide by default |
| `Next input: None` | Terminal by the stage's own measurement |
| Status heading `Programme complete` or `Documentation complete` | The programme or standalone docs task is finished |
| Third `Phase complete` heading this run | A few phases is the window; remaining phases are a fresh run |
| `Phase complete` at `queue` or `phase` authority | Those levels close one phase, then stop |
| Route above granted authority | Authority is granted, never inferred |
| Stage budget exhausted | See §6 |
| Malformed or absent block | The successor is unknown; guessing it is worse than stopping |
| Same stage returns the same route twice with no state change | A loop; report it as a defect |
| Working tree dirty at run start | The run cannot distinguish its own changes from pre-existing ones |

## 6. Stage budget and the context break

`cg-produce` drains every `Ready` Step in one invocation. A clean phase is three dispatches:
prepare, produce, sign-off. A `roadmap` run should close a few of those phases in one window —
enough to make progress, not enough to summarise twice.

Default cap: **twelve dispatches per run.** That is three clean phases plus slack — a second
produce if execution yielded mid-queue, one re-prepare, and a backstop against a
prepare↔produce loop. It is not sized as one dispatch per Step.

The cap does not rise with authority. After three `Phase complete` headings, stop even if
budget remains. A fresh session continues the next planned phase with a fresh budget and a
window that has not been summarised.

Authority says how far the run is *allowed* to go; the budget says how far it can go *while
still being any good*. A roadmap-authority run that never yields would drift further with every
phase, and the phase most likely to be wrong would be the one nobody watched.

Before each dispatch, check the budget. When it is exhausted, stop and yield a resumable
checkpoint — do not attempt one more stage because it "looks small". The ledger written in §3 is the
resume point: a fresh session reads this phase's ledger, re-measures per §2, and continues with
its own budget. Resuming is cheap because the state is on disk. Continuing past the cap is expensive
because the state is in a context window that is about to be summarised.

When a run ends with the queue complete, mark the ledger `Closed` rather than deleting it. The
history of which stages ran unattended is exactly what `cg-sign-off` needs at harvest.

## 7. Report the whole run

The owner approved a plan and got back a few closed phases. They did not watch any of it. The
report is the only thing standing between them and reading every Step brief, so it covers the
run, not just its route.

```markdown
## Auto-run report
- **Authority:** <level> · **Dispatched:** <n> stage(s) · **Stopped on:** <condition from §5>
- **Phases:** <each phase closed this run> — <its outcome, one line each>
- **Acceptance gate:** <the exact command> — <passed | failed | not reached>

### What shipped
| Step | Name | Result | Contracts and detectors touched |
|---|---|---|---|
| 1 | <name> | Complete | <contract paths, or None> |

### What changed beyond the Steps
- **Decisions logged:** <DL entries, or None>
- **Assumptions recorded:** <count and where, or None>
- **Durable records written:** <design records, guides, diagrams from cg-sign-off, or None>
- **Handovers raised:** <out-of-phase findings sent to planning, or None>

### What needs you
- <blocked Step, failing gate, unlogged decision, or "Nothing — the phase is closed">

- **Stopping block:** <the verbatim Next action block that ended the run>
- **Ledger:** `<docs>/plans/auto-run/<phase>.auto-run.md`
```

Every row is copied from what a stage already reported. Summarising means selecting and compressing,
never restating an outcome in your own words — if a Step said `Blocked`, the table says `Blocked`.
A run that reached `cg-sign-off` inherits its phase gate verbatim; do not soften a failed gate into
a caveat, and do not describe an unreached gate as passing.

## 8. Next-action response

Choose exactly one immediate route:

- stopped on a blocker or a `$cg-unblock` route: use `cg-unblock` with the exact blocking entry;
- stopped on budget with an advancing route pending: use the named stage with the ledger;
- stopped on insufficient authority: name the stage and the level it needs;
- three phases closed this run and a further planned phase exists: name no skill to dispatch
  in this run; tell the user to re-invoke `cg-auto-run`;
- selected phase closed at `queue` or `phase` authority, or no unstarted phase remains: name no
  next skill.

End the user-facing response with:

```markdown
## Next action — <Run complete | Budget reached | Blocked | Authority required>
- **User action:** <one concrete action>
- **Next input:** <$cg-skill | None — programme complete> — <exact ledger, brief, decision entry, or authority level>
- **Blocked by:** <exact decision, prerequisite, failing gate, or exhausted budget>   <!-- omit unless the status is non-advancing -->
```

## Completion check

- [ ] Authority was granted explicitly, or defaulted to `roadmap` and was stated.
- [ ] At `roadmap` authority, every phase in the roadmap was planned before the first dispatch.
- [ ] Every dispatch was named by measured state or the previous block's `Next input`.
- [ ] No stage was dispatched above the granted authority level.
- [ ] `cg-unblock` and `cg-warmup` were never auto-dispatched.
- [ ] The ledger was written before each dispatch, not after.
- [ ] No block carrying `Blocked by` was followed.
- [ ] A third `Phase complete` heading was not followed with another dispatch in this run.
- [ ] The stopping condition and its verbatim block are both recorded.
- [ ] The report covers what shipped, what changed beyond the Steps, and what needs the owner.
- [ ] The response ends with one exact next action and skill.

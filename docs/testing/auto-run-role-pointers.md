# Transient: Auto-Run role pointers — problem and fix

**Status:** revised after second-model review; retain until validation is reviewed. Do not treat this file as agent procedure or as
the lasting product guide. After a human and a second model have reviewed it,
fold any remaining durable facts into `docs/workflow.md`, `docs/lifecycle.md`,
`docs/upgrade.md`, and the installed skills, then **delete this file**.

**Date:** 2026-09-07.
**Scope:** Contract Graph `cg-auto-run` Manager–Engineer combo, plus the
standalone Plan/Produce question, discrete-agent grain, token claim, and
working-file lifecycle.
**Classification:** delivery workflow. Not graph protocol. Not structural
governance. Nothing here is an `A` rule.

The installed procedure is `.agents/skills/cg-auto-run/` after `cg init`.
This note explains *why* those files changed.

## 1. What was wrong

Auto-run already had the right product idea: a Manager owns programme
continuity and the user; one Engineer owns one phase through prepare, produce,
repair, and sign-off; disk (Plan, queue, decisions, contracts) is what a later
session trusts. The 2026-09-06 interaction trial showed that path can work on
one host.

The pointers inside the skills did not protect that idea.

### 1.1 Shared skill file fought the role split

`SKILL.md` said the Engineer should read only `engineer.md`, then
`engineer.md` required the shared `SKILL.md` rules. That shared file still
contained spawn, programme authority, the user-facing run report, and the
harvest-Manager exception.

A worker loaded so the host could see `cg-auto-run` also loaded how to be a
Manager. One “do not spawn” sentence was not enough.

### 1.2 Roles leaked onto standalone Plan and Produce

Manager and Engineer exist only under `/cg-auto-run`. Outside Auto-Run, the
user invokes `cg-plan` or `cg-produce` and the stage yields. Unblock D-6
already said: without a Manager, the invoking agent asks the user.

The Auto-Run table still *looked* like a default overlay: Plan → Manager,
Produce → Engineer. Nothing in the entrypoint said those roles do not apply
to standalone skills. A session could spawn a phase worker to write a
roadmap, or keep the planning conversation as the Produce worker, and think
that was the product.

### 1.3 Discrete agents were easy to use at the wrong grain

The intended discrete agent is **one fresh Engineer per phase**, kept through
prepare, produce, repair, and sign-off. Isolation is at the phase boundary
because sign-off and repair need implementation context.

The skills did not say the grain is *not* one agent per stage or per Step.
Splitting Plan and Produce into two discrete agents, or one agent per Step,
reloads Plan plus contracts on every hop and drops the phase context the
product is trying to keep.

Vision already says the honest benefit is bounded context and less
rediscovery, **not fewer tokens under every workload**. Workflow already said
token savings were not benchmarked. Auto-run still needed an explicit “do not
report savings unless measured” next to the spawn story, because isolation is
easy to sell as cheaper.

Same-session fallback made that worse: if the host could not spawn, the skill
said disclose the limit and role-play both parts in one session. That pays
the protocol tax and isolates nothing. The product would spend more tokens
than one chat per phase.

### 1.4 Working files had no dispose step

The plans stack is supposed to shrink. Warmup already has a delete-or-archive
table. Roadmaps and queues archive on a green gate. Harvested decisions drain.

Auto-run ledgers (`docs/plans/auto-run/<programme>/*.auto-run.md`) were
gitignored live state, **skipped by `cg residue`**, and never deleted on
`Closed` or run complete. Instructions said compact in place. Closed ledgers
could sit ignored on disk forever. `archive/` was not the right dump for them
either: residue’s own CLI text says archive is not a place to move things to
avoid deciding.

Harvest write-handoffs were checkpointed in the Manager ledger in prose. There
was no lock file a later session could reconcile.

### 1.5 Manager completion check was underspecified

The Manager must not duplicate implementation review, yet must reject a claim
of success. The minimum disk list was implied (sign-off, archive, gates,
`cg verify`) but not closed. A weak Manager rubber-stamps; a strong one
rereads the diff.

## 2. What this change did not do

These were review comments, not this patch:

- No `A` detector for “did the host spawn a fresh worker?” `cg verify` still
  proves the authored graph, not protocol execution. That remains correct.
- Harvest destination-prepare is still a Manager exception. It now has a lock
  file. It is not deferred, and it is not a mechanical mutex in the verifier.
- The 2026-09-06 live trial was not re-run against these instruction hashes.
  Observer regression tests still pass on synthetic evidence. Host-portable
  proof is still one Codex trial on a small JS fixture.
- Token cost was not measured. The change stops a false savings claim; it
  does not prove spend went down.
- Nested Next-action reporting (stage skill → Engineer → Manager → user) is
  named more clearly, not redesigned.

## 3. How it was fixed

### 3.1 Engineer-safe protocol file

Added `src/skills/cg-auto-run/references/protocol.md`.

Shared rules live there: authority cap, measure from disk, ledger format,
one-stage dispatch, stop rules, dispose table. It has **no** spawn how-to,
**no** user-facing run report, **no** harvest-Manager path.

| Role | Reads |
|---|---|
| Manager | `SKILL.md` → `protocol.md` → `manager.md` |
| Engineer | `SKILL.md` → `protocol.md` → `engineer.md` only |

`SKILL.md` now says the Engineer must not read `manager.md`. `engineer.md`
points at `protocol.md` and does not name `references/manager.md`.

Both roles still enter through `SKILL.md` so the host skill gate can see
`cg-auto-run` in the worker.

### 3.2 Standalone skills are not roles

`SKILL.md` and `src/cg/workflow.md` / `docs/workflow.md` now state:

- Manager and Engineer exist only under `cg-auto-run`.
- Standalone `cg-plan`, `cg-prepare`, `cg-produce`, `cg-sign-off` are
  user-invoked skills.
- Do not spawn a phase worker to write a roadmap.
- Do not treat a planning session as the Produce worker.
- A new chat for Produce after the Plan is on disk is ordinary isolation,
  not a Manager.

### 3.3 Phase grain and mixed-context

The discrete agent is one Engineer per phase, not per skill and not per Step.
Keep that Engineer through sign-off and repair. A new agent is for the *next
phase*.

If the host cannot create fresh workers or message them, **stop** unless the
invocation names `mixed-context`. Mixed-context is sequential role separation
in the current session and **does not isolate context**. If the owner requires
fresh workers, stop.

Do not report measured token savings unless measured.

### 3.4 Ledger dispose and residue

Closed auto-run ledgers are deleted, not archived.

| File | When | End |
|---|---|---|
| `<phase>.auto-run.md` | Manager accepted the phase, worker stopped, cleanup reconciled | Mark Closed, delete |
| `manager.auto-run.md` | Run ended and all queued answers and recovery state are safe elsewhere | Mark Closed, delete |
| `harvest.auto-run.md` | Ownership returned or abandonment reconciled; queued answers persisted | Mark Closed, delete |

`cg residue` still ignores *live* auto-run working files. It now reports a
ledger whose body contains an explicit `**Status:** Closed` field (or legacy bare `Closed` marker) as leftover working state, even with stale inbound links
(“delete it, do not archive”). Empty `auto-run/` directories after deletion
are ordinary empty-dir residue.

Harvest decision-log and destination-prepare handoffs write
`<docs>/plans/auto-run/<programme>/harvest.auto-run.md` (gitignored via
`*.auto-run.md`) before either role takes the other’s write set, and delete
it when ownership returns. `cg-unblock` D-6 names that lock.

The plans README template and the lasting/temporary table in
`docs/workflow.md` include this row.

### 3.5 Closed completion checklist

The Manager accepts a phase only when all of these exist on disk. It does not
reread implementation.

1. Sign-off artifact for the phase.
2. Archived queue path under `<docs>/plans/archive/`.
3. Phase acceptance command from the Plan, exit 0, with captured stdout.
4. `cg verify` exit 0, with captured stdout.
5. Engineer Next action with no `Blocked by`.

A claim of success alone is insufficient. Gaps return to the same Engineer.

## 4. Files touched

| Path | Change |
|---|---|
| `src/skills/cg-auto-run/SKILL.md` | Thin entrypoint: role select, no standalone-role overlay, mixed-context stop, phase grain |
| `src/skills/cg-auto-run/references/protocol.md` | **New.** Shared rules without Manager playbook |
| `src/skills/cg-auto-run/references/manager.md` | Spawn, harvest lock, completion checklist, dispose, user report |
| `src/skills/cg-auto-run/references/engineer.md` | Protocol only; harvest request/pause; no manager.md |
| `src/skills/cg-unblock/SKILL.md` | D-6 names `harvest.auto-run.md` |
| `src/scripts/residue.js` | Closed `*.auto-run.md` is residue; live auto-run files are not |
| `src/cg/workflow.md` | Roles only under auto-run; phase grain; delete ledgers; mixed-context |
| `src/install/templates/docs/plans/README.md` | Auto-run ledger row: delete, do not archive |
| `docs/workflow.md` | Same facts for human readers |
| `docs/lifecycle.md` | Auto-run row: roles not for standalone Plan/Produce; ledgers deleted |
| `docs/upgrade.md` | mixed-context stop; Closed ledgers; residue |
| `scripts/auto-run-interaction.mjs` | Hashes `protocol.md` with the other installed instructions |
| `test/auto-run-interaction.test.js` | Same instruction list |
| `test/verify.test.js` | Engineer must not load manager.md; Closed ledger residue case |

`docs/testing/auto-run-interaction.md` is the 2026-09-06 trial record. Its
instruction hashes are historical. They were not rewritten to make this
change look like that trial.

## 5. Verification already run

`npm test` — 276 passing, including:

- Auto-run remains an adapter (no warmup successor, no dispatch budget).
- Engineer instructions do not name `references/manager.md`.
- Protocol has no “start one fresh Engineer” and no “Report the whole run:”.
- Live auto-run ledger is not residue; Closed ledger is.
- Interaction observer still accepts a complete synthetic sequence and
  rejects the existing mutation cases.

Not re-run: a live Manager–Engineer host trial against the new instruction
bytes.

## 6. Before deleting this file

Durable guides already contain the new rules (`docs/workflow.md`,
`docs/lifecycle.md`, `docs/upgrade.md`). Check they still say, in product
language rather than this review’s voice:

1. Manager/Engineer exist only under `/cg-auto-run`.
2. Discrete agent = one Engineer per phase, not per stage.
3. No token-savings claim without a measurement.
4. Without workers, stop unless `mixed-context`.
5. Closed auto-run ledgers are deleted; `cg residue` names leftovers.
6. Manager completion is the disk checklist, not a second code review.

Then delete this file. Do not archive it under `docs/plans/archive/`. If a
dated trial-style record of the review is wanted, keep a short pointer from
`docs/testing/` or CONTRIBUTING, not a second copy of the skill text.


## Second-model fixes and remaining validation

The second review found three gaps: cancellation could discard queued user answers,
the observer still required ledgers after mandated disposal, and residue missed closed
status fields and linked ledgers. The revised protocol retains Suspended state until
ownership and queued answers are reconciled; Engineer sign-off uses Awaiting acceptance,
and only a safe, accepted ledger becomes Closed. No cancelled work is resumed merely
to persist an answer.

New observer traces use version 2: capture accepted handoffs before deletion, require
phase 1 disposal by phase 2 completion, then capture a final cleanup checkpoint that
rejects retained working files or changed decisions/source/archived evidence. Version 1
traces remain readable without requiring a protocol file they never contained. These
are observer and runtime regression checks, not a new live-model trial.

Remaining limits: cleanup and harvest ownership are agent procedure, not a mechanical
mutex or atomic transaction. Snapshot evidence does not establish every intervening
write. A live cancellation-during-harvest trial and a new full Manager–Engineer run
against these instruction bytes are still needed before claiming behavioral validation.

Fix verification on 2026-09-07: `TMPDIR=/tmp npm test -- test/*.test.js` passes
288 tests; `npm run build` and `npm run build:check` verify 66 packaged files.
Both modified skill entrypoints pass skill validation. The retained 2026-09-06
real trial evidence also validates under its original version 1 format, with no
rewriting of its hashes or records. This historical check is not a trial of the
new instructions. Existing unrelated generated fixture directories were left intact.

The final pass also clarified that plans are eventually disposable, not safe to
delete while they contain unresolved decisions, and made the harvest queue-write
record identify its exact source/destination and paused worker for recovery.

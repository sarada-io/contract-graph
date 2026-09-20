# Internal execution preparation

Use during cg-produce for finishing queues, repairs or changes needing explicit Step dependencies. Initial sprint implementation uses short item preparation in the master plan. This is part of production: prepare only the next useful batch, then implement it under the same request. Read the plan readiness evidence before inspecting additional source.

## 1. Admit one phase

Admit one phase from a cg-plan roadmap or an accepted `cg delivery handoff` with an `Active` roadmap. Its outcome, scope, and acceptance gate must be stable, prerequisites satisfied or explicitly blocked, and execution branch or worktree policy known. For a delivery handoff, run `cg next --programme <slug>` and read the durable receipt to confirm human acceptance, completion authority and remaining obligations. A finalised roadmap accompanying that handoff is sufficient planning input regardless of origin; do not send it through `$cg-plan` again. Use `$cg-plan` only for unresolved programme questions or a changed outcome or gate.

Admit the measured current worktree, including relevant uncommitted files; do not reconstruct it from the plan or call it green without evidence. A prototype-origin handoff may include retained exploratory code and a provisional baseline; use the same admission and repair rules. Assign retained code, incomplete behavior, deferred tests, and known failures to the Steps that complete and verify them, keeping implementation repairs in produce and deferred finishing in sign-off. The first corrective Step may start from this measured provisional baseline. Verification failures are work to repair, not automatic reasons to refuse preparation. Only record a verified Step handoff after its assigned gate passes.

1. Load `.agents/cg/principles/architecture.yaml`. Apply `hierarchy.kinds` and `graph` before
   assigning any path.
2. Read the Plan directly: programme outcome and constraints, phase sequence, complete selected
   phase and acceptance criteria, and necessary prerequisite evidence. A handoff does not replace it. Run `cg contract route --task "<phase outcome>"`.
   Load only the matched contracts and their named children; then scoped `P` rules, then the
   repository constitution and specifications. Apply relevant `E` guidance to a remaining design fork. A
   practice already cited on the selected phase is not remaining. An `E` disagreement is not
   `Blocked by` and not `$cg-unblock`.
3. Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with
   `cg status --programme <slug>` and inspect `cg residue --programme <slug>`. Findings are
   baseline facts, not a prerequisite for preparing their correction. The queue file is
   `<docs>/plans/<programme>/<phase>_detailed_preparation.md`.
4. Inspect source, tests, resources, and the worktree inside the selected units only.
5. Establish `cg verify` and the narrowest useful baseline; reuse applicable recorded evidence
   under [verification](verification.md), otherwise run the commands.
   Record existing failures as facts.

When `cg-sign-off` returns corrective work, preserve its reproduction, expected and actual result,
affected paths, contract and detector impact, dependencies, and `Done when` evidence. Re-prepare
the remaining sequence only when the phase outcome and gate are unchanged. A successor-planning
handover first goes through `cg-plan`.

The same correction path applies when production finds a defect that requires new paths or a
changed queue. A failing product check does not prevent preparing its repair. Add the corrective
Step with a stable ID and explicit dependencies, keep dependent evidence Steps `Waiting`, and
return the earliest eligible repair Step to production. Do not make evidence `Ready` merely
because a corrective Step was added; its verified completion is the prerequisite. Clear only
failure labels replaced by that dependency, preserving genuine user or external blockers.

For queue syntax errors or `repository-residue-in-step` findings, repair the selected preparation
directly under the existing phase scope. Preserve Step IDs, completion evidence, dependencies,
and the agreed final gate. Move a misplaced repository-wide residue check from Step prerequisites
or `Done when` to the phase closure preamble; retain any repository policy that explicitly
requires it earlier and report that policy as the unresolved conflict. Do not silently weaken it
to a scoped check. Recalculate states after the repair. Refresh the existing repair note with a
link to the current queue and mark resolved findings superseded; do not create another status file.

After one batch acceptance, an accepted non-empty decision-harvest cohort may be prepared for its
already-planned destination phase while the source phase is still completing. Reserve the first
prepared harvest Step for that cohort, set it `Blocked` on source-phase completion, and keep every
later Step `Waiting` behind it. After writing the route, resume `cg-sign-off` for the source phase;
do not begin destination execution yet.

The roadmap is transient. Do not cite a plan path as the source of a rule.

## 2. Define Steps

Write numbered Steps `1…N`. Each Step contains:

- one observable outcome;
- exact file groups it may change;
- required contract and detector changes;
- a positive case and a negative or absence case for each boundary;
- one runnable verification command or named test;
- dependencies and decisions that block it; and
- the verified repository state and prerequisite handoffs it expects when selected.

Use only **Phase** (roadmap unit) and **Step** (executable vertical slice). Do not introduce
another unit between them.

For an accepted harvest route, place these markers in the first Step immediately after its heading:

```markdown
Source harvest manifest: `<path>`
Source harvest cohort: `<cohort-id>`
Source harvest classification digest: `sha256:<digest>`
Source harvest drain IDs: `<comma-separated exact eligible IDs>`
```

That Step has `Priority: 1`, `Depends on: None`, a named source-completion blocker, and `Status:
Blocked`. No later Step may be `Ready`, `In progress`, or `Complete` before the source phase closes.

## 3. Build the Step ledger

Before assigning paths, apply `.agents/cg/principles/architecture.yaml` `graph`: recurse until the
smallest node, then stay, add-child, or elsewhere. Size, reuse, or a new dependency is not a new
node. `graph.surface` is declared entry; a new entry point is a surface amendment or `add-child`.
`graph.adapters`: use `add-child` when an adapter owns a distinct responsibility and meets
`selfSufficient`; vendor count alone does not require a split.
Consumer-specific behavior stays behind its adapter; do not modify or branch the core while the
port can express the required product-neutral promise. If the phase already names an add-child,
elsewhere, service, or adapter target, assign paths to deliver it. Mixed code that matches that target is the work, not a return to `$cg-plan`. A Step
whose editable paths sit on the wrong domain is a preparation defect.

Inventory every affected item:

| Item | Current owner | Final owner | Action | Consumers | Step(s) | Verification |
|---|---|---|---|---|---|---|
| production type/package | source | target/delete | move/retain/delete | modules | ordered Steps | test |
| test/fixture | source | target/consumer | move/update/delete | test task | ordered Steps | named test |
| resource/config | source | target/app | move/retain | runtime | ordered Steps | startup/test |
| dependency | source/consumer | final module | add/remove/scope | modules | ordered Steps | dependency scan |
| new component/library/sub-module | — | its own contract | create | parent + callers | creating Step | `cg verify` |
| `.agents/cg` rule | governance owner | same/new contract | update/create | humans/agents | changing Step | detector |
| detector | test/script owner | enforcing location | add/update | contract rule | same Step | fail-on-demand |
| durable document | document owner | final document | update/create | humans/agents | describing Step | link/content gate |

No row may remain unknown. Preparation records the required contract change but does not write it.

A later Step may edit the same file because execution is sequential. For every repeated path, state
what the earlier Step leaves behind and what the later Step changes. Keep source removal,
destination addition, tests, resources, dependencies, contract truth, and residue checks for one
atomic move in the same Step.

## 4. Preserve contract co-delivery

- A behavior, boundary, invariant, entry point, or operational-assumption change owns the matching
  contract and detector update.
- A Step that introduces a self-sufficient unit — `graph.selfSufficient` in
  `.agents/cg/principles/architecture.yaml` — owns that unit's `contract.yaml`, its applicable `P`
  rules, and reciprocal parent/child edges. `cg verify` rejects a structurally incomplete graph, so
  this cannot be deferred to a later Step.
- A new or changed rule and its detector land with the implementation.
- No Step depends on `cg-sign-off` or a later cleanup Step to make its contract truthful.
- If a contract change is too wide for one Step, split the behavior before execution; never split
  contract truth from that behavior.

Every completed Step must leave the repository contract-complete. Sign-off owns deferred tests/docs, composition verification and phase-close records; implementation repairs return to produce.

## 5. Build one continuous sequential queue

Assign stable priority numbers in this default order:

1. published interfaces and structural seams;
2. consumers and migrations;
3. removals and renames after consumers have moved;
4. durable documentation describing the implemented result;
5. environment or production measurement.

A priority number is a selection preference, not an undeclared dependency. Record every real
dependency explicitly. Do not optimize for equal size or theoretical concurrency.

Each Step carries:

| Field | Meaning |
|---|---|
| `Priority` | stable Step number used to break ties between ready Steps |
| `Depends on` | Steps whose verified handoffs this Step consumes |
| `Blocked by` | unresolved `DU-NN` entries or unavailable external prerequisites |
| `Status` | `Waiting`, `Ready`, `Blocked`, `In progress`, or `Complete` |

Set state deterministically:

- `Waiting`: at least one declared dependency is not `Complete`;
- `Ready`: all dependencies are `Complete`, no blocker remains, and the current verified state
  satisfies the brief;
- `Blocked`: dependencies permit work but an exact decision or external prerequisite does not;
- `In progress`: the one Step currently executing;
- `Complete`: the Step gate passed and its handoff is recorded.

At most one Step is `In progress`. Select the lowest-numbered `Ready` Step. A blocked Step is
deferred, never skipped or waived. Every repeated path creates a dependency on the earlier writer.
A later Step that consumes, overwrites, removes, or verifies a blocked Step's output stays
`Waiting`. When no `Ready` Step remains, present one consolidated blocker set.

For a decision-harvest route, the source phase's successful close is what removes the first Step's
blocker. Recalculate it to `Ready` only then.

## 6. Use one execution context

Record the single integration branch or current worktree, the measured baseline commit, the
clean-state preflight, whether the repository requires a coherent commit after each Step, and the
exact evidence each dependent Step consumes.

Do not allocate a branch or worktree per Step by default. Prepare sequential Steps; the coordinator may assign bounded contributions inside the current Step under [coordination](coordination.md). If isolation is necessary, record the exact starting changes, integration owner and evidence needed before the Step gate. Delegation cannot start a later Waiting Step.

## 7. Define verification

Every Step has one runnable `Done when` command. Apply [verification](verification.md):
cover changed promises with applicable positive and negative cases, `cg verify`, residue or
ownership checks for moves, the full build when repository policy or impact requires it, and
a clean or explicitly accounted-for worktree. Record existing sufficient coverage; do not create
tests that merely mirror class or file structure. Assign each check once per applicable state.

In the phase preamble, name checks that only make sense after the full sequence: composition,
residue, and the phase acceptance gate. Do not put those in a Step `Done when`. Emergent checks
prove composition; they do not repair an incomplete Step.

Use `cg residue --programme <slug>` for programme-local inspection: selected and shared/unassigned
findings remain in check scope; other programmes are listed with owners. Unreferenced evidence
may need a consumer link, not removal. Never assign another programme's cleanup to a Step merely
to make repository-wide residue green. Keep any required repository-wide `cg residue` at final
closure, and route foreign findings to their owner or the coordinating session.

`cg next` detects direct repository-wide `cg residue` commands in fenced shell `Done when`
blocks and reports `repair-required`. It does not parse arbitrary scripts or prose prerequisites;
inspect those yourself. Queue syntax errors admit `cg-produce` for repair while keeping production
and closure gated. The stage boundary and existing completion authority still apply.

## 8. Write cold-start Step briefs

Write one document per phase, beside the roadmap that owns it, and link it from the roadmap:

```
<docs>/plans/<programme>/<phase>_detailed_preparation.md
```

Do not split Steps into separate files. `cg next` reads every `## Step <n>` section in that file.
Put the phase context — outcome, acceptance gate, execution branch, ledger of affected items —
above the first `## Step` heading. Each Step must be readable with the phase preamble and its explicit prerequisite handoffs.
Keep shared context once in that preamble and reference it; do not repeat it in every Step or
copy contract prose into the queue. Each Step states its own outcome, scope, and gate.

Each Step's first lines are its header block. `cg next` parses exactly these keys:

````markdown
## Step <number>: <name>
Weight: Design | Build | Mechanical
Priority: <stable number>
Depends on: <Step IDs | None>
Blocked by: <decision IDs or external prerequisites | None>
Status: <Waiting | Ready | Blocked>

### Read first
<contracts, decisions, phase, preparation, cg-produce, cg-unblock>

### Goal
<one observable outcome>

### Expected starting state
<latest verified phase state plus required prerequisite handoffs>

### Files I may edit
<exact paths or bounded path groups>

### Required contract and detector changes
<current truth that changes and the detector that proves it>

### Decisions already made
<decision and assumption references>

### Work
<implementation, tests, resources, dependencies, removals, and documentation>

### Done when
```bash
<one command including the contract gate>
```

### Handoff
<evidence, repository state, queue-state update, and dependent Steps this unblocks>
````

After writing, run `cg next`. If it reports `unreadable`, fix the headers before handing off.

## Continue inside production

Preparation is internal work, not a skill transition. Amend scope/order within the agreed outcome, re-evaluate dependencies, and continue eligible implementation under the current request. Preserve genuine blockers and final gates. For a changed outcome or material promise use cg-unblock or cg-plan; routine repairs stay here. Apply the cg-produce entrypoint's review cadence, item report and next-action rules. Return completed repair evidence to the invoking sign-off coordinator without requiring another user invocation.

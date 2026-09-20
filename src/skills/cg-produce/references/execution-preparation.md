# Prepare the next executable repair or dependent change

Use this reference inside cg-produce only when work needs an explicit technical Step queue or an existing queue needs repair. Ordinary sprint items use short preparation in the master roadmap; accepted finishing without a queue stays with sign-off. Do not create a queue, inventory document or new stage merely to use this procedure.

Prepare only the next useful batch under the existing request, then continue eligible implementation. Reuse planning evidence and the shared [verification rules](verification.md); do not repeat discovery or checks solely because preparation started.

## Establish scope and starting state

1. Resolve the selected programme, outcome, acceptance gate and actual execution authority from the roadmap and current request. For an accepted delivery handoff, read its receipt and remaining obligations regardless of origin. A finalised handoff roadmap is sufficient; use cg-plan only for unresolved programme questions or a changed outcome or gate.
2. Resolve `<docs>` from `.agents/cg/profile.json` (`docs` by default). Inspect `cg status --programme <slug>` and `cg next --programme <slug>`. Admission with `executionAllowed: false` permits preparation, not implementation of a blocked or completed Step.
3. Run `cg contract route --task "<outcome>"`. Follow owning contracts to the smallest responsible boundary and apply `.agents/cg/principles/architecture.yaml` `hierarchy.kinds` and `graph`: stay, add-child or elsewhere. Read the scoped P rules, repository policy and relevant E guidance. Advisory disagreement alone is not a blocker. Do not copy contract prose into the queue or use a transient plan as permanent rule authority.
4. Inspect the actual checkout, including relevant uncommitted work, bounded source and applicable baseline evidence. Record the integration branch/worktree, baseline commit, unrelated changes and prerequisite handoffs once. Preserve any repository commit policy. A known failing or provisional baseline is valid input for its repair; do not reconstruct accepted code from a plan or describe unverified state as green.

When a change needs JavaScript/TypeScript ESM, Java, Kotlin, Python, Go, C# or Dart/Flutter contract facts, run `cg contract inspect . --id <owner> --json` after routing, or `--unit <unit>` for a missing boundary/incomplete graph. Optional repeated `--entry` paths are relative to that unit. The command is read-only: consume its supported field proposals only after checking coverage, evidence and snapshot stability. Preserve existing promises and IDs; unresolved fields are not empty lists, and import observations are not architectural dependency edges. Resolve behavior, ownership, composition and routes from accepted intent and bounded implementation reading. Rerun after relevant edits, author narrowly, then run the existing contract and behavior checks. Unsupported languages/forms still need manual inspection. A report or schema pass does not prove correspondence. Keep a saved report only while active work needs it.

## Write or amend one queue

Use `<docs>/plans/<programme>/<phase>_detailed_preparation.md`, linked from the existing roadmap. Keep shared outcome, acceptance gate, execution context, contract/decision pointers and closure-only checks in its preamble. Keep Steps in that file, not separate briefs or progress reports.

Each Step is a bounded, observable change with exact editable paths, prerequisites, required contract/detector changes, work and a runnable gate. Use the compact template below. Add detail only where another worker needs it to execute safely; do not require an inventory row for every type, file or resource.

For moves, removals or changed ownership, add a compact inventory inside the existing queue before implementation. Group related paths by responsibility; do not create a separate document or require this table for ordinary local repairs.

| Affected paths or group | Current owner → final owner | Action | Consumers / dependencies | Step | Verification |
|---|---|---|---|---|---|
| Billing calculation and its tests | billing → pricing library | Move | invoice caller, package dependency | Step 1 | Caller regression, old-path scan, cg verify |

Account for production code, tests/fixtures, resources/configuration, dependency declarations, contracts/detectors and documentation affected by the move. Mark an unaffected category as such rather than inventing work. For removals, name the replacement or explain why remaining consumers need none. Every affected group needs a known destination or deliberate deletion, an owning Step and evidence that callers and old references are handled. Investigate unknown ownership or consumers before dependent edits; unrelated ready work may continue.

Keep one atomic move and its structural truth together. Repeated writes to a path require an explicit dependency on the earlier writer and a clear expected handoff. Before completing the Step, reconcile the inventory against the diff and verification results so omitted files or consumers become repairs, not deferred cleanup.

```markdown
## Step <number>: <observable outcome>
Priority: <stable number>
Depends on: <Step IDs | None>
Blocked by: <decision IDs or external prerequisites | None>
Status: <Waiting | Ready | Blocked>

### Expected starting state
<measured baseline and prerequisite handoffs; use shared preamble context>

### Files I may edit
<exact paths or bounded path groups>

### Required contract and detector changes
<affected facts and enforcement, or why no change is needed>

### Work
<bounded implementation and verification work; link settled decisions>

### Done when
<one runnable command, fenced as shell, including applicable contract checks>

### Handoff
<actual evidence and resulting state; dependent Steps this unblocks>
```

Use stable numbered `## Step <n>` headings and the four header fields shown. `Weight` is optional; preserve existing values when repairing a queue. Do not renumber completed Steps or erase their evidence.

## Preserve structural truth and assigned checks

A Step that changes a declared behavior, boundary, surface, invariant, relationship or operational assumption owns the corresponding contract update. New self-sufficient units own their contract, applicable P bindings and reciprocal edges in the same implementation. New or changed binding rules own their detectors and fail-on-demand evidence. Do not defer contract truth to sign-off. Split the behavior if the structural change cannot fit safely in one Step.

Apply the graph's surface and adapter decisions rather than inventing a new node for size, reuse or vendor count. Keep consumer-specific behavior behind its adapter while the existing core promise suffices. A split or relocation already agreed in the roadmap is implementation work, not an automatic return to planning.

The Step gate covers changed promises with relevant positive and negative cases, `cg verify`, and ownership/residue checks for moves. Include broader builds when impact or repository policy requires them. Reuse sufficient existing tests; do not create tests that mirror file structure. Keep a clean or explicitly accounted-for worktree and assign each check once per applicable state.

Composition checks and the phase acceptance gate belong in the preamble when they only make sense after the sequence. Repository-wide residue belongs at closure, not as a prerequisite for each Step. Inspect ownership with `cg residue --programme <slug>`; preserve other programmes' files and resolve shared findings explicitly. A scoped check cannot replace a required global gate. Useful evidence may need its actual consumer linked rather than removal.

Sign-off retains deferred tests/docs and final verification. Produce owns implementation repairs. A queue is not permission to move every finishing obligation into production.

## Order by real dependencies

| State | Condition |
|---|---|
| Waiting | A declared dependency is not Complete. |
| Blocked | Dependencies permit work, but a named decision or external prerequisite is missing. |
| Ready | Dependencies are Complete, blockers are clear, and the measured state satisfies the brief. |
| In progress | The one Step currently executing. |
| Complete | Its gate passed and the handoff is recorded. |

Priority breaks ties; it does not imply dependencies. Prefer interfaces before consumers and removals after migration where the actual work requires that order. At most one Step is In progress; select the lowest-numbered Ready Step. Work that consumes, overwrites, removes or verifies blocked output stays Waiting. Continue independent eligible work; when none remains, report the consolidated blocker set without waiving it.

Use the current integration context rather than creating a worktree per Step. Optional [coordination](coordination.md) may divide bounded contributions inside the current Step, but cannot start a later Waiting Step. If isolation is necessary, specify the actual starting changes, integration owner and evidence required before the Step gate.

## Repair without restarting the lifecycle

For a defect found by production or sign-off, preserve its reproduction, expected/actual result, paths, structural impact and required evidence. Add a stable corrective Step and update only the affected remaining sequence. Dependent evidence stays Waiting until the repair passes; merely adding a repair does not make its consumers Ready. Clear only failure labels replaced by that dependency, never genuine owner or external blockers.

For malformed headers or `repository-residue-in-step`, repair the existing queue while preserving IDs, evidence, dependencies and the agreed final gate. Move misplaced global residue checks to closure. If explicit repository policy requires them earlier, retain and report that conflict instead of silently weakening it. The detector recognizes direct commands in fenced shell Done when blocks, not arbitrary scripts or prose; inspect those yourself. Update the existing repair note rather than writing another status file.

After preparation, run `cg next --programme <slug>`. Fix unreadable headers and reconcile readiness before executing. Continue within the original scope and review cadence using [queue execution](queue-execution.md). Return completed repair evidence to the invoking sign-off coordinator under the existing request. Changed outcomes or material promises need the affected owner decision through cg-plan or cg-unblock; ordinary repairs do not require another stage invocation.

## Only for an accepted decision-harvest route

Skip this section unless the roadmap declares a non-empty harvest cohort with recorded batch acceptance and an already-planned destination phase. The source phase may still be completing; preparing its destination does not authorize starting it.

Reserve the first destination Step for the cohort and put these exact markers immediately after its heading:

```markdown
Source harvest manifest: `<path>`
Source harvest cohort: `<cohort-id>`
Source harvest classification digest: `sha256:<digest>`
Source harvest drain IDs: `<comma-separated exact eligible IDs>`
```

Use `Priority: 1`, `Depends on: None`, the named source-completion blocker and `Status: Blocked`. Make every later Step depend on it and remain Waiting; none may be Ready, In progress or Complete before source closure. The markers must match the accepted manifest and exact eligible drain IDs. Return to the source sign-off for its close-stage harvest check. Only successful source closure clears the first Step's blocker; recalculate readiness then. Preserve the manifest while consumers need it and follow sign-off's durable-evidence and cleanup rules afterward.

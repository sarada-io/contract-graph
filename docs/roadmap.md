# Roadmap

What is built, what is designed and unbuilt, and what is undecided. Kept honest on purpose — a
framework about not overstating enforcement should not overstate itself.

The north star is a complete, top-down software context graph: a fresh agent routes from the
repository contract to the relevant module and sub-module contracts, understands how each unit is
used by its parent, and reaches the correct implementation boundary without scanning unrelated
source. Verification and governance exist to keep that graph trustworthy.

## Built

- Repository and mapped-folder contracts that carry bounded context, public entry points,
  invariants, verification commands, and links to related contracts.
- Task-to-contract routing and editor entry points that give a fresh agent a deterministic first
  path into the graph.
- A required `## Child Contracts` section on every contract, so a unit either names the children
  that decompose it or states it is a leaf. This is the declarable half of composition; the
  declaration is not yet checked against the implementation.
- Brownfield warmup that descends below build-manifest modules, writing sub-module contracts where
  a module holds more than one boundary and declaring each child in its parent.
- Three rule families with the per-rule modality marker, and a verifier that enforces both
  directions (an `invariant` owes exactly one enforcement-map row; a `guide` must have none).
- Enforcement-map coverage for architecture and product rules: every `AP-`/`PP-` rule owes exactly
  one row, and no row may cite a rule ID that no principles file defines.
- Folder-scoped contracts with generated rule inheritance and drift rejection.
- Contract self-sufficiency, machine-checked: no permanent contract may cite a transient plan.
- Six lifecycle skills with a standardized next-action route, plus `cg-auto-run`, an opt-in
  adapter that follows those routes without returning each hop to the user. Names sort in
  workflow order for readers of the source; no editor orders its skill picker that way, so
  sequence is carried by the `Next action` route rather than by naming.
- Decision harvest: triage into five destinations, batch acceptance at phase close, drain.
- `cg init` / `next` / `residue` / `sync` / `verify` / `modules` / `harvest` / `profiles`, with a
  fail-on-demand test suite. `cg init` is idempotent and is the upgrade path: framework core is
  replaced on every run, the repository's own context under `.agents/cg/` never is.
- `cg next` computes the owning stage from the Step queue on disk rather than from the last thing
  a model said, and a `PreToolUse` gate refuses a dispatch the two do not agree on — the
  enforcement half of `cg-auto-run`.
- `cg residue` names plan documents nothing links to any more, by reachability from the roadmap,
  the decision log, and the README. The disposable stack is checked rather than trusted.
- Selectable editor discovery profiles for Claude Code, Codex, GitHub Copilot, Antigravity, and
  their `all` union, persisted and verified independently of universal governance.

## Designed, not built

**Mechanical enforcement of `cg-auto-run` — 0.2.0.** The adapter's stop conditions are instructions,
and instructions are advisory: a model that ignores "never follow a block carrying `Blocked by`"
produces exactly the unattended run the stop condition exists to prevent. Nothing currently proves
the rule was obeyed, and an auto-advance loop is the one place in the framework where being wrong
compounds rather than surfaces.

Two pieces, in order:

- `cg next` — a state query that reads the roadmap, the prepared queue, and the decision log from
  disk and prints the stage that owns the next move. Today the successor comes from the model's
  reading of the previous response; from disk it is checkable, and it is the input every enforcement
  mechanism needs.
- A stop-hook adapter for Claude Code that parses the emitted `Next action` block and refuses to
  advance when the status does not. Harness-specific by nature, so it is an addition to the
  markdown contract rather than a replacement for it — Codex, Copilot, and Antigravity keep the
  advisory version until each grows an equivalent.

Until both land, `cg-auto-run` is honest about what it is: a well-specified convention that a
cooperating model follows, and the run ledger on disk is the only durable evidence of what it did.

**Machine-readable composition edges.** A contract naming its children, checkable against what the
implementation actually injects. Interfaces alone recover none of the composition graph — every
downward edge lives in the implementation package the contract deliberately hides. Doc comments
recover the graph but not trustworthily: deleting one edge entirely passes every check, so the graph
is only as good as the discipline that wrote it, which is the property Contract Graph exists to eliminate.

A one-field annotation makes the edge structural, and cross-checking declared edges against injected
types catches both directions of drift. Until this lands:

- the authored contract hierarchy is useful for navigation, but its completeness cannot be trusted
  without occasionally returning to source;
- a declared child set is proven *present* — the section cannot be silently omitted — but not
  proven *complete*: an undeclared child still passes;
- closure per folder can be asserted but not verified;
- a subtree cannot be handed to an agent with confidence that it is the whole subtree.

**Verified closure.** Everything a folder needs is in its own contract or its children's. Depends on
the composition edge.

**Parallel execution across a contract.** Two workers on opposite sides of a contract do not need to
see each other's work — the contract is the synchronization point, and the only one. That is the
strongest argument for the whole model and the one that most needs the composition edge, because
parallel work across an unverified boundary is parallel work across a boundary that might not hold.

Preconditions, none negotiable: automated root-confined write detection, no worker Git operations,
no shared root/build/contract/generated/cross-root seam writes, a coordinator that serializes
verification and commits, and a verified composition graph so "independent" is build-checked rather
than inferred from directory layout. Directories that look independent are not evidence.

Order is forced: composition edge → verified closure → write confinement → parallelism. Attempting
the last first produces integration ambiguity, which is exactly what sequential execution exists to
avoid, with no compensating control.

**Authority levels.** A repository setting choosing whether material forks are decided or logged:
`consult` (any material fork is logged) or `delegate` (principles decide; the ledger records the
prior applied and the one edit that reverses it). Two levels, not five — a gradient of authority is
a gradient of surprise.

The floor is not delegable at any level: identity, authorization, credentials, trust boundaries;
billing, metering, entitlement, per-unit cost; destructive or irreversible data behaviour; a binding
principle or permanent invariant; a published interface already consumed elsewhere; a new external
dependency, provider, store, or control plane. Without that floor, `delegate` is a switch that turns
off the safety argument.

## Undecided

| Question | Why it is open |
|---|---|
| Precedence between two fork-loaded families that reach opposite recommendations on a fork touching both. | Undefined today. |
| Whether an imported rule needs a marker distinguishing it from one earned here. | An import arrives with the rule but not the case or the cost. |
| Whether authority is a repository, per-phase, or per-invocation setting. | Per-invocation is most flexible and least auditable. |

## The thesis, and how it gets tested

A basic feature should not require an expensive model, because the principles are strong enough and
arranged so a harness can use them.

The honest form is a **split, not a downgrade**. Decomposing a vague outcome into a dependency-safe
queue is real reasoning; so is diagnosing an unexpected failure and writing a detector for a rule
never enforced before. Principles reduce the reasoning a model must do; they do not remove it.

| Skill | Work | Model |
|---|---|---|
| `cg-plan`, `cg-prepare` | decomposition, novel decisions, detector design | the capable one |
| `cg-produce` | apply a cold-start brief with named paths, contracts, and a runnable gate | the cheap one |
| `cg-sign-off` | verification and triage | in between |

`cg-prepare` already emits briefs meant to be executable without chat history, which is exactly the
artifact the split needs.

**The benchmark:** run a prepared queue on a small model and count Steps that pass their gate
unaided. That number is the strongest available evidence that the principles are doing the work
rather than the model, and it is the one claim here that could be falsified cheaply.

It does not exist yet. It will be published when it does, not before.

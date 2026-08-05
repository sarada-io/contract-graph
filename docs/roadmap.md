# Roadmap

What is built, what is designed and unbuilt, and what is undecided. Kept honest on purpose — a
framework about not overstating enforcement should not overstate itself.

## Built

- Three rule families with the per-rule modality marker, and a verifier that enforces both
  directions (an `invariant` owes exactly one enforcement-map row; a `guide` must have none).
- Enforcement-map coverage for architecture and product rules: every `AP-`/`PP-` rule owes exactly
  one row, and no row may cite a rule ID that no principles file defines.
- Folder-scoped contracts with generated rule inheritance and drift rejection.
- Contract self-sufficiency, machine-checked: no permanent contract may cite a transient plan.
- Five lifecycle skills with a standardized next-action route, named so alphabetical order is
  workflow order.
- Decision harvest: triage into five destinations, batch acceptance at phase close, drain.
- `cg init` / `sync` / `verify` / `packs` / `profiles`, with a fail-on-demand test suite.
- Selectable editor discovery profiles for Claude Code, Codex, GitHub Copilot, Antigravity, and
  their `all` union, persisted and verified independently of universal governance.

## Designed, not built

**Machine-readable composition edges.** A contract naming its children, checkable against what the
implementation actually injects. Interfaces alone recover none of the composition graph — every
downward edge lives in the implementation package the contract deliberately hides. Doc comments
recover the graph but not trustworthily: deleting one edge entirely passes every check, so the graph
is only as good as the discipline that wrote it, which is the property Contract Graph exists to eliminate.

A one-field annotation makes the edge structural, and cross-checking declared edges against injected
types catches both directions of drift. Until this lands:

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
| Precedence between two domain sets that reach opposite recommendations on a fork touching both domains. | Undefined today. |
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

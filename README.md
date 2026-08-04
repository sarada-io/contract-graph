# Contract Graph

**Bounded, verified context for coding agents.**

Your contracts form a graph. Agents traverse it instead of reading your codebase — and every
rule ships with the test that fails when it breaks.

Spec-driven workflows tell an agent what to build. Contract Graph makes the repository reject what
it shouldn't have built — including a test that proves each detector still works.

```bash
npx contract-graph init . --design saas,ops
cg sync
cg verify
```

---

## Why this exists

An agent will violate a rule that lives only in prose, and nobody will catch it. So Contract Graph's
first principle is about its own principles:

> **AP-01-02** — A rule and its enforcing test land in **the same commit**. A documentation change
> introducing a constraint without its detector is incomplete and must not merge.

Everything else follows. A rule with no detector is aspirational, and the framework says so out
loud rather than pretending otherwise.

## What you get

**Three rule families, loaded at different costs.** The ladder mirrors ordinary SDLC order:

| Tier | Loaded | Analogue | Shipped |
|---|---|---|---|
| `AP-*` Architecture | always | architecture | yes — the portable core |
| `DP-<SET>-*` Design | at a fork, only the sets it touches | design | yes — selectable packs |
| `PP-*` Product | when the work touches your product's specifics | specification | **no — starts empty, grows as you build** |

`PP` starting empty is the point. You inherit architecture and design guidance on day one and none
of anyone else's product opinions.

**Modality is per-rule, not per-family.** Each rule declares itself:

```markdown
- **DP-OPS-01-01** `invariant` — Every request entering the system carries a trace id.
- **DP-SAAS-01-01** `guide` — Prefer configuration over structural change.
  **Cost:** a configuration surface you must own, validate, audit, and version.
```

An `invariant` owes a detector and appears in the enforcement map. A `guide` owes a **cost clause**
and must never be given a detector. `cg verify` enforces both directions, so the enforcement map
never fills with rows nobody will build.

**Two tiers of contract.** A `CONTRACT.md` per folder states its boundary, invariants, and entry
points; a `XxxContract` type per directory states what that unit promises its callers, with
implementations confined to a sibling `impl/`. Callers see only the contract — that single rule is
what makes change free on either side of it. See [docs/contracts.md](docs/contracts.md).

**Contracts that survive plan deletion.** Every module carries a `CONTRACT.md` stating its
boundary, invariants, and entry points in full. It inherits binding rules through a generated block
that `cg verify` rejects if hand-edited. Contracts may not cite a transient plan as the source of
a rule — that check is machine-enforced, not a convention.

**A folder is a workspace.** Any module folder opens on its own with complete governing context:
its contract, the rules that bind it, and pointers a scoped agent can follow. Hand someone a
folder and say *change anything inside; keep the contract.*

**Six lifecycle skills, harness-neutral.** `cg-plan` → `cg-prepare` → `cg-execute` →
`cg-complete`, with `cg-decide` cross-cutting and `cg-document` for durable records. They live
in `.agents/skills/` and specify responsibilities and evidence, not a particular coding agent.

## Commands

| Command | Does |
|---|---|
| `cg init [dir] --design a,b` | scaffold governance; never overwrites an existing file |
| `cg sync [dir]` | regenerate inherited blocks, principle indexes, and discovery wrappers |
| `cg sync --check` | report what sync would rewrite; change nothing (use in CI) |
| `cg verify [dir]` | verify contracts, skills, and design principles |
| `cg packs` | list bundled design-principle packs |

Wire `cg verify` into your own build so it runs on every change. A governance check that has to be
remembered is a governance check that will not run.

## Design packs

| Pack | Resolves |
|---|---|
| `saas` | product shape at SaaS scale — what is shared, per-tenant, configurable, versioned |
| `ux` | surface behaviour, disclosure, task completeness |
| `ops` | observability, tracing, audit, rollback, migration, single-maintainer load |

Set names are routing labels, not identities. Rename, split, or merge them as it becomes clear
which forks actually recur — unlike rule IDs, which are never renumbered.

## Decisions become rules

Unspecified detail gets decided from the principles and logged as an assumption, not escalated to
a human mid-task. At a phase close, resolved decisions are triaged into five destinations:

| Destination | For |
|---|---|
| module `CONTRACT.md` | scoped to one module's boundary — **most decisions land here** |
| `AP` | universal structural invariants |
| `PP` | invariants owed to your product's market or shape |
| `DP-<SET>` | topic-scoped truths, marked `invariant` or `guide` |
| drop | one-offs — a bucket name, a version pin, a retirement |

Then the decision log drains. Its steady state is *open questions*, not everything ever settled, so
its size tracks how much is undecided rather than how long you've been building.

A promoted rule states itself in full and **never cites the decision that produced it** — permanent
governance cannot take its authority from a transient file. The reasoning goes in the amendment
ledger, which requires you to write down what the rule **costs**.

## Requirements

Node 18.17+. No runtime dependencies.

## Status

Early. The core — contracts, inheritance, skills, design principles, verification — is built and
tested. The code-level contract tree is documented but its drift check is not built, so verified
composition graphs and parallel execution across a contract remain designed-not-built — see
[docs/contracts.md](docs/contracts.md) and [docs/roadmap.md](docs/roadmap.md).

## Licence

Apache-2.0.

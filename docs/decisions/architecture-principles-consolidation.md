# Structural binding separation

Date: 2026-08-13

## Decision

Contract Graph separates executable structural authority from architecture advice:

- `src/cg/principles/architecture.yaml` is the authored source for global `A` architecture principles;
- `src/cg/guidelines/engineering.yaml` contains the non-binding `E` engineering catalog; and
- `src/cg/guidelines/product.yaml` contains repository-owned `P` product guidelines and starts empty.

This supersedes the intermediate consolidation in which `GP-` and `E` entries shared one
architecture document and were treated as binding. Physical consolidation made review easier, but
it did not make prose measurable. Binding authority now has one machine-readable home.

## Why structure is the authority

The product promise is the recursive decomposition:

```text
repository → module → submodule → component or library → implementation
```

That structure keeps responsibility visible and makes a change routable to the smallest owned
boundary. YAML contract nodes are the graph representation of the promise. A binding belongs in
Contract Graph only when violating it predictably damages responsibility ownership, permitted
decomposition, graph closure, routing, boundary surfaces, dependency truth, or structural
verification.

General application design remains valuable, but Contract Graph does not have enough universal
authority to make every security, data, deployment, persistence, or configuration preference a
build-breaking rule in every adopting repository. Those choices remain visible in architecture
guidance and can complement a repository constitution supplied by SpecKit or another framework.

## What makes a binding

Every `A` entry states one rule and one deterministic measure. It names at least one blocking
detector registered by the installed verifier and the exact negative fixture proving that detector
fires. Prose without all three enforcement facts is not a binding.

The initial catalog binds:

1. canonical restricted-YAML nodes;
2. canonical node placement beneath the declared unit;
3. exactly one named responsibility per boundary;
4. registered parent-child hierarchy transitions;
5. explicit composition state;
6. one rooted reciprocal composition tree;
7. child confinement beneath the parent unit;
8. resolvable declared dependencies;
9. an acyclic dependency graph;
10. public-surface presence for non-repository boundaries;
11. existing public-surface paths inside their boundary;
12. reciprocal invariant and verification declarations;
13. registered enforcement for every binding;
14. unique owned-responsibility text across the graph;
15. top-level modules named as domain or product capabilities rather than technical layers; and
16. contract nodes named for an owned responsibility rather than as a miscellaneous bag.

These are ambient rules. Contracts do not repeat `A` IDs. A contract's `rules` array contains
only applicable repository-authored `P` IDs.

## Promotion remains open

Non-binding does not mean permanently excluded. An `E` practice may move into the binding catalog
when all four conditions become true:

1. **structural impact** — its violation damages the contract graph's structural promise;
2. **deterministic measure** — one measurement gives an unambiguous pass or fail;
3. **blocking detector** — the installed verifier can reject the violation; and
4. **negative fixture** — a fail-on-demand test proves the detector is live.

Promotion is delivered in the codebase that owns the verifier. It registers the detector, assigns
the next permanent `A` ID, and removes the equivalent D practice in the same change. This
prevents duplicate authority and avoids retaining a weaker advisory copy after the stronger rule
exists. An adopting repository cannot create built-in enforcement by editing its preserved YAML;
until its installed verifier recognizes the detector, it keeps the D practice, adopts a scoped P
rule when product-specific, or proposes the generic binding upstream.

A repository-specific constraint that is binding because of the product rather than graph
structure belongs in `P`, with a repository detector and references from the affected contracts.

## Installation ownership

`cg init` installs the architecture-principle and guideline catalogs with `preserve` ownership. The defaults are
firm when installed, but the adopting repository may deliberately amend or retire them without a
later package installation silently overwriting that decision. Amendments must remain within the
semantics of registered detectors. A new generic A rule requires a verifier change; repository-specific
binding belongs in P.

Framework-owned schemas, verifier code, and lifecycle skills may be upgraded. Repository-owned
contracts and policy remain repository truth.

## Resulting source layout

```text
src/cg/
  principles/architecture.yaml  executable architecture principles
  guidelines/engineering.yaml non-binding D engineering catalog
  guidelines/product.yaml     repository-owned product guidelines
  enforcement.yaml            P detector rows only
  phases.json                 A/P always; D conditional per lifecycle stage
  contract.yaml               starter graph root
  workflow.md                 repository-owned delivery lifecycle
  schema/                     contract, architecture, engineering, product, enforcement schemas
src/scripts/
  binding.js                  architecture-principle catalog validation and detector registry
  contracts.js                node and graph enforcement
  verify.js                   integrated blocking verification
```

`profile.json` and `manifest.json` are generated by `cg init` at `.agents/cg/`; they are not
authored catalogs.

The contract-graph core lives under `src/cg/` so source layout matches the installed `.agents/cg/`
tree. Binding stays a separate catalog from enforcement, phases, and install bookkeeping.

## Cost

There is now one human-authored catalog format: YAML for closed catalogs (contracts, structural
bindings, architecture practices, product bindings, enforcement rows) and Markdown for reviewable
agent procedures. YAML gives catalog fields a closed, enforceable shape.
Promotion touches both catalogs because avoiding overlap is part of the operation, not optional
cleanup.

# Vision

Contract Graph exists so a coding agent can understand where a change belongs before it reads the
implementation.

Coding models have changed the economics of development. Producing code is dramatically faster;
understanding, integrating, and maintaining the accumulated result is not. Without stronger
abstraction, model-driven speed increases the amount of software that can become coupled or
misplaced before anyone notices.

Contracts are the scaling mechanism. Modules, sub-modules, components, and libraries divide a
system into responsibilities. A contract makes each division explicit: how the parent uses it,
what crosses its boundary, what it owns, and what must remain true. The narrower unit can change
freely inside that promise; code pollution and maintenance cost stay confined instead of spreading
through the repository.

Contract Graph grew from six months of ground-up work across several products. The recurring
problem was not persuading models to write more code. It was giving each new session a reliable
overview, routing it to the right abstraction, and preserving that understanding after the code
changed.

## The model

A repository already contains a natural hierarchy:

```text
project
  → module
      → sub-module
          → component or library
              → implementation
```

Source expresses this structure indirectly through imports, constructors, routes, build files,
and naming. Recovering it through search is possible, but every session pays for the recovery and
may draw a different map.

Contract Graph records the structure as durable nodes:

```text
repository contract
  → module contract
      → sub-module contract
          → component contract
              → relevant implementation
```

Each contract explains its unit in the parent's context:

- why the unit exists and which responsibility it owns;
- who calls it and through which public entry points;
- what is deliberately outside its boundary;
- which children decompose its responsibility;
- which sibling contracts it consumes;
- which invariants and dependency directions must hold; and
- which command verifies a change inside the boundary.

Plotted together, the contracts provide an overview of the whole software system. Traversed one
edge at a time, the same graph provides the smallest context needed for one task.

## Structure is the primary control

Contract Graph's strongest opinion is about structure because structure determines whether later
changes remain understandable and confined. The structural promise is recursive decomposition
from repository to module, sub-module, component or library, and implementation. Schema-backed
`contract.yaml` nodes are its evidence and control plane: they record owned responsibilities,
public surfaces, composition and dependency edges, routes, invariants, and verification commands.
A valid graph that does not correspond to the code has failed the promise.

The framework therefore has a hierarchy of authority:

1. **Structural integrity** — responsibilities and boundaries must form the recursive structure
   that keeps change comprehensible and confined.
2. **Structural binding** — `.agents/cg/principles/architecture.yaml` defines the recursive mapping
   (`hierarchy.kinds`) and the node decision (`graph` walk: node, recurse, selfSufficient, surface,
   decide, compose, stop, forbid, adapters) plus the machine-enforced `A` protocol that keeps YAML nodes
   valid, connected, navigable, and structurally truthful through repeated engineering work.
3. **Architecture guidance** — deployment, security, data lifecycle, configuration, and similar
   choices may be valuable defaults, but they are not Contract Graph requirements merely because
   they are good engineering advice.

The authored surfaces mirror that hierarchy. The YAML architecture-principles catalog is the executable structural
authority. The `engineering` catalog keeps Structural Best Practices and Broader Engineering
Considerations together for review, but its `E` entries remain non-binding. `product` remains
separate because its `P` rules exist only for the adopting product, are agent-managed after
install, and may bind selected contracts.

## A structural layer, not a universal constitution

Contract Graph does not need to own every rule that guides a repository. Its non-negotiable value
is the recursive structure and the truthful graph that represents it. Product requirements,
delivery conventions, security posture, technology choices, and other broader policies remain
repository-owned. Contract Graph owns structural routing and structural integrity:

- `A` rules protect the contract graph automatically, and the same catalog's `hierarchy.kinds`
  and `graph` sections are the recursive mapping and node decision (the `graph` walk, including
  surface service entry, encapsulation, and adapters)
  so delivery-workflow edits cannot drop them;
- the repository governs its chosen product and engineering policy;
- optional repository-specific constraints may be expressed as scoped `P` bindings when they
  need to resolve through contract context; and
- `E` remains advice unless a product-specific constraint is adopted as
  `P` or a generic structural invariant is promoted by the verifier owner.

The separation prevents Contract Graph from imposing unrelated application preferences merely
because they are good practice. Repository policy does not need to restate the graph protocol to
keep the structural layer enforceable.

This hierarchy is a test for every shipped rule. If violating a rule would make the graph unable to
locate ownership, express a boundary, route a task, confine a change, or verify structural truth,
the rule belongs to Contract Graph's structural core. If the graph can still perform those jobs and
the rule instead selects one generally desirable application design, the rule belongs in
repository-owned guidance unless the repository adopts it as `P` or the verifier owner promotes
it to `A`.

Contract Graph is opinionated at installation time and non-possessive after installation. It gives
a repository's architecture principles and strong design advice so an agent does not invent
structure locally. The installed contracts, architecture principles, and guidelines then belong to that
repository: later `cg init` runs preserve them, and the owner may deliberately keep, amend,
replace, or retire a default within the enforcement semantics its installed verifier supports.
New generic structural bindings are promoted through a verifier-owning change; product-specific
authority can be adopted locally as `P`. Framework-owned schemas, tools, and skills may be
upgraded; repository-owned architectural choices are not silently reset.

## Route first; read code second

Routes owned by the repository and boundary contracts turn a request into one or more starting
contracts. An agent then follows child-contract links until the responsible unit and its boundary
are clear. Only then does it read implementation.

The intended sequence is:

```text
request → contract route → contracts from broad to narrow → bounded source → verification
```

This does not eliminate code reading. It stops broad code reading from being the way every new
session reconstructs the architecture. The honest benefit is bounded, predictable context and less
rediscovery—not fewer tokens under every workload.

## Abstraction confines change

A folder plus its contract is the smallest workspace that can be handed to a person or agent with
the instruction: *change anything inside; keep the contract.*

That requires three properties:

- **Placement** — the contract states how the parent uses the unit.
- **Closure** — the contract names the child or sibling context a worker may need next.
- **Confinement** — a change that must escape the unit becomes an explicit contract change rather
  than silently widening the work area.

The same principle exists at the code boundary. A caller depends on a public contract, not on an
implementation detail. The implementation may be rewritten without changing callers; callers may
change without reading the implementation, provided both sides keep the promise.

A contract is therefore maintained by default, backed by tests, and changed deliberately. A
contract that changes casually does not decouple anything; a contract that can never change becomes
a liability.

## Contracts are the seam for parallel work

Parallel work scales only when workers can rely on a boundary instead of continuously sharing
implementation context. Contracts provide that seam: one worker can change an implementation while
another works against the public promise.

The seam alone is not yet proof of independence. Safe automated parallelism also needs:

- machine-readable composition edges that prove the declared child graph is complete;
- verified closure for each proposed work area;
- write confinement so a worker cannot escape its assigned boundary; and
- coordination for shared generated files, builds, and contract changes.

Contract Graph machine-proves authored composition-edge reciprocity, acyclicity, and root
reachability. It does not yet prove that implementation dependencies disclose every architectural
child or that a worker remains inside an assigned write set. Parallelism is a consequence the
contract model enables and the roadmap must finish verifying, not a current safety claim.

## Maintenance is part of throughput

When development accelerates, maintenance does not become cheaper. More behavior, dependencies,
and decisions arrive per unit of time. If their ownership is implicit, later changes spend the
saved implementation time rediscovering structure and repairing coupling.

The contract graph pays the explanation cost once and preserves it for later sessions. A module
contract remains the overview for that module; child contracts keep the overview useful without
turning it into one enormous architecture document. Transient plans may disappear, but permanent
contracts must continue to state the current truth in full.

## Why it is a graph

Hierarchy is the primary route, not the only relationship. A module can consume a sibling's public
contract, a shared library can serve several parents, and one task can touch two branches. Those
lateral references are graph edges around a hierarchical spine.

A useful contract therefore does more than describe the files in its directory. It locates the
unit in the system and tells the reader where context continues. A contract that cannot say where
to go next is prose, not a navigable graph node.

## Keeping the graph true

Once contracts become durable project context, drift is a maintenance defect. An implementation
that violates its contract is wrong; changing the contract is explicit and reviewable; a
machine-expressible invariant can be paired with the detector that rejects violations.

The foundational enforcement rule is:

> A rule and its enforcing test land in the same commit.

Guidance that cannot be mechanically rejected remains explicitly non-binding instead of pretending
to be an invariant. A practice may be promoted only when it has structural impact, a deterministic
measure, a blocking detector, and a negative fixture; promotion removes the `E` copy as it assigns
the permanent A identity. Because `A` is enforced by installed verifier code, that promotion is
implemented by the verifier owner rather than asserted by an adopting repository's YAML alone. An
adopter may retain the practice, adopt a product-scoped `P` rule, or propose a generic A change
upstream until that detector ships. Plans remain transient; permanent contracts cannot cite a plan
as the source of current behavior. Amendments record what changed, why, and what the new choice
costs.

This produces verification and governance, but the causal order matters:

```text
explicit project context
  → precise task routing
  → bounded implementation reading
  → contracts that must stay truthful
  → detectors, rules, and governance
```

If enforcement grows while the graph becomes less useful for locating and understanding software,
the project has optimized the by-product and missed its purpose.

The same causal order governs every engineering loop:

```text
route through the contract graph
  → select the smallest responsible boundary
  → change implementation inside that boundary
  → update affected nodes, edges, surfaces, routes, and invariants
  → run boundary verification and graph verification
  → leave a truthful graph for the next loop
```

A loop is not structurally complete when the code works but the graph describes the previous
system. Conversely, updating contracts without checking the implementation produces a tidy graph
that cannot be trusted. Code and graph truth close together.

## The outcome

A fresh session should be able to answer from contracts:

1. What does this system contain?
2. Where does this request belong?
3. How is that unit used by its parent and neighbors?
4. Which narrower units are relevant, and which are outside the change?
5. What must remain true while the implementation changes?
6. What is the smallest verification command that proves the result?

## What is built

Contract Graph currently:

- scaffolds and verifies one schema-backed YAML contract per governed boundary;
- routes tasks through contract-owned routes and supports recursive child traversal;
- discovers brownfield module roots and writes their first contracts;
- applies ambient A architecture principles and resolves contract-scoped P rule IDs without duplicating text;
- generates editor discovery artifacts for several coding-agent harnesses;
- provides a contract-driven delivery lifecycle and state-derived Step routing; and
- verifies rule coverage, contract shape, reciprocal edges, acyclicity, root reachability,
  surface paths, invariant/verification links, and transient-plan boundaries.

The folder-level graph is useful and enforced within those limits.

## What remains

The authored recursive graph is structurally proven, but its correspondence with implementation is
not. A contract must declare children or state that it is a leaf; the verifier can prove those
declared edges form one closed graph, but cannot yet prove the source contains no omitted boundary.
The next structural work is therefore:

1. drift checks between declared composition and implementation dependencies;
2. language-specific verification of exported symbols and import confinement;
3. closure calculation for a proposed work subtree including shared generated artifacts; and
4. write-confined parallel execution across proven boundaries.

Until those land, Contract Graph provides precise routing and bounded code reading, not a guarantee
that an authored subtree is complete or that arbitrary parallel work is safe. That distinction is
part of the product's contract too.

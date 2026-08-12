# Vision — software as a traversable contract graph

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

## Route first; read code second

The repository routing map turns a request into one or more starting module contracts. An agent
then follows child-contract links until the responsible unit and its boundary are clear. Only then
does it read implementation.

The intended sequence is:

```text
request → routing map → contracts from broad to narrow → bounded source → verification
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

Contract Graph has authored folder boundaries today, but it does not yet machine-prove all four
properties. Parallelism is a consequence the contract model enables and the roadmap must verify,
not a safety claim the current release makes.

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

The foundational rule is:

> A rule and its enforcing test land in the same commit.

Guidance that cannot be mechanically rejected states its cost instead of pretending to be an
invariant. Plans remain transient; permanent contracts cannot cite a plan as the source of current
behavior. Amendments record what changed, why, and what the new choice costs.

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

- scaffolds and verifies repository and mapped-folder contracts;
- routes tasks into module contracts and supports child-contract traversal;
- discovers brownfield module roots and writes their first contracts;
- inherits binding rules and detects drift in generated contract regions;
- generates editor discovery artifacts for several coding-agent harnesses;
- provides a contract-driven delivery lifecycle and state-derived Step routing; and
- verifies rule coverage, contract shape, mappings, and transient-plan boundaries.

The folder-level graph is useful and enforced within those limits.

## What remains

The complete recursive graph is not yet structurally proven. A contract must declare children or
state that it is a leaf, but the verifier cannot yet prove that no implementation child was omitted.
The next structural work is therefore:

1. machine-readable composition edges;
2. drift checks between declared composition and implementation dependencies;
3. verified closure for a contract subtree; and
4. write-confined parallel execution across proven boundaries.

Until those land, Contract Graph provides precise routing and bounded code reading, not a guarantee
that an authored subtree is complete or that arbitrary parallel work is safe. That distinction is
part of the product's contract too.

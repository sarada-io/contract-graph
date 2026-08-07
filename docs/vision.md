# Vision — software as a traversable context graph

Contract Graph exists so a coding agent can understand where a change belongs **before it reads
the implementation**.

A software repository already has a structure: the product contains modules, modules contain
sub-modules, and those units contain progressively narrower responsibilities. Source code expresses
that structure indirectly through imports, constructors, routes, and naming. An agent starting a new
session usually has to rediscover it by searching and reading code, spending context on files that
will never change.

Contract Graph makes that structure explicit as a top-down graph of small contracts:

```text
repository contract
  -> module contract
       -> sub-module contract
            -> narrower contract
```

Each contract explains the unit **in its parent's context**:

- why the unit exists and what responsibility it owns;
- how the parent or neighbouring units use it;
- which public entry points cross its boundary;
- which child contracts decompose its responsibility;
- which invariants and dependency directions must remain true; and
- how to verify a change confined to that unit.

The repository routing map gives an incoming task its first contract. From there the agent follows
child-contract links only as far as the task requires. By the time it opens source code, it already
knows the intended change surface, the boundaries around it, and the smallest verification command
that can prove the work.

## The outcome

A fresh agent session should be able to answer these questions from contracts alone:

1. What does this system contain?
2. Where does this requested behaviour live?
3. How is that unit used by the rest of the system?
4. Which sub-units are relevant, and which are outside the change?
5. What must remain true while the implementation changes?

This does not mean an agent never reads code. It means code reading begins **after routing**, inside
a bounded area, instead of being used to reconstruct the whole architecture on every session.
That is the token-saving claim: less rediscovery and less unrelated source in the context window,
not fewer tokens under every possible workload.

## Why it is called a graph

The hierarchy supplies the primary top-to-bottom path. Real software also has lateral relations:
a module consumes a sibling's public contract, a task touches two branches, or a shared capability
serves several parents. Those references are edges too. The result is a graph with a clear
hierarchical spine, not merely a folder tree and not a single large architecture document.

A useful contract therefore does more than describe what is inside a directory. It locates that
directory in the larger system and names the next contracts an agent may need. A contract that
cannot tell an agent where to go next is prose, not a navigable graph node.

## Governance is a consequence

Once contracts are the durable source of project context, they also become the natural boundary
for controlling change. An implementation that violates its contract is wrong; a change to the
contract is explicit and reviewable; a machine-expressible invariant can be paired with the
detector that rejects violations.

That produces rules, verification, and governance, but those are **consequences of protecting the
context graph**, not the original purpose of the project. The causal order is:

```text
explicit project context
  -> precise task routing
  -> bounded implementation reading
  -> contracts that must stay truthful
  -> detectors, rules, and governance
```

If enforcement ever grows while the contract graph becomes less useful for locating and
understanding software, the project has optimized the by-product and missed its purpose.

## What is built and what remains

Contract Graph currently scaffolds and verifies repository and folder contracts, routes tasks to
module contracts, inherits binding rules into those contracts, and keeps generated discovery
artifacts synchronized. Brownfield warmup discovers real module roots and writes their first
contracts from the code that exists.

The complete recursive vision is not yet fully machine-proven. In particular, a declared child
contract can still be omitted without a structural detector proving that the graph is incomplete.
Machine-readable composition edges and verified closure are therefore the most important designed
but unbuilt capabilities: they turn a useful contract hierarchy into a graph whose completeness an
agent can trust.

# Contracts

Contracts are the core of Contract Graph because they turn a repository into context an agent can
traverse. Everything else — routing, rule families, lifecycle skills, and the verifier — either
helps an agent find the right contracts or keeps those contracts true.

There are **two tiers**, and they answer different questions:

| Tier | Artifact | Answers | Status |
|---|---|---|---|
| **Folder contract** | `<folder>/.agents/cg/contract.md` | how this folder is used in its parent, what it owns, and where context continues | built and verified |
| **Code contract** | one `XxxContract` type per directory | what this unit promises its callers | pattern documented; verification not built |

The folder tier is what `cg verify` enforces today. The code tier is the structural pattern that
makes the folder tier meaningful, and its machine-checkable half is the framework's largest open
item.

---

## 1. The context graph

The primary traversal is top to bottom:

```text
repository contract
  → module contract
      → sub-module contract
          → unit contract
```

The repository contract explains the product and points to task routing. Routing selects the first
module contracts for a request. Each selected contract then explains that module **in the context
of its parent** and names the child contracts that decompose it. The agent stops descending when
the change surface and its constraints are clear, and only then reads source.

A folder contract should therefore answer:

- What role does this unit play in its parent?
- Who calls it, and through which public entry points?
- What responsibilities and data does it own?
- Which responsibilities are explicitly outside it?
- Which child contracts explain its internal decomposition?
- Which sibling contracts may be affected across a public boundary?
- What invariants and dependency directions must remain true?
- Which command verifies a change contained here?

This is more than documentation colocated with code. The links between contracts are the navigation
mechanism for the next session. A contract that describes its directory but not its place in the
parent or the next context below it is not yet a complete graph node.

The hierarchy is the main path, not a restriction to a pure tree. A module may consume sibling
contracts, and one task may enter multiple branches. Those lateral relationships are explicit
edges rather than a reason to fall back to repository-wide search.

## 2. The binding invariant

> **Change is free on either side of a contract.**

Everything follows from this. An implementation may be rewritten, split, or replaced without
consulting its callers; a caller may change how it uses a capability without consulting the
implementation. What both sides rely on is the contract, which is therefore:

- **maintained by default** — modified only with deliberate review;
- **well tested** — the tests hold the guarantee the contract makes;
- **the entry point for humans and agents alike** — one artifact, both audiences.

A contract that is cheap to change is not a contract. A contract that can never change is a
liability. The discipline is that changing one is a visible, tested, reviewed act.

## 3. The decomposition

The top tier is **domain-shaped**. Functional decomposition begins only below it:

```
Domain → Sub-domain → Context → Function → Unit
```

Each directory owns **exactly one responsibility** and is completely abstracted from the outside
world by its contract.

Expressed as directories, the pattern is recursive at every level:

```
chat/
    ChatProcessingContract
    request/
        RequestProcessingContract
        auth/
            AuthenticationContract
            impl/
        plan/
            PlanContract
            impl/
    response/
        ResponseProcessingContract
        impl/
```

## 4. Five structural rules

1. Every directory holds **exactly one** `*Contract` type naming its responsibility.
2. Child directories **decompose** the parent's responsibility — nothing else lives there.
3. Implementations live in a sibling **`impl/`**, at every level.
4. A parent contract is implemented **by composing its children's contracts**.
5. A caller only ever sees `XxxContract`. Reaching into another package's `impl/` is the one move
   that breaks the model.

**Rule 5 is what makes the binding invariant true. Rules 1–4 are what make rule 5 enforceable.**

### Per language

The pattern is structural, not syntactic. What changes is the type mechanism and the visibility
mechanism:

| Language | Contract | Confinement of `impl/` |
|---|---|---|
| Java | `interface` | package-private implementations; module-info exports |
| TypeScript | `interface` / `type` | package entry point exports only the contract |
| Python | `Protocol` / ABC | `__all__` plus a package `__init__` that re-exports only the contract |
| Go | `interface` | lowercase (unexported) implementation types |
| C# | `interface` | `internal` implementations |

If a language cannot hide `impl/`, rule 5 becomes a convention rather than a boundary — and a
convention is what Contract Graph exists to replace. Compensate with a detector.

## 5. What was measured

The question: if each contract carries a doc comment referencing the contracts below it, can a
reader — human or agent — reconstruct the whole system graph by traversal alone?

Tested on a five-contract slice with a realistic composing implementation.

| Mechanism | Graph traversable | Broken edge caught | Missing edge caught |
|---|---|---|---|
| Interfaces alone | ✗ | n/a | n/a |
| Interfaces + doc-comment references | ✓ | ✓ | **✗** |
| Interfaces + machine-readable edge | ✓ | ✓ | ✓ |

**Interfaces alone recover none of the graph.** A parent contract's signature describes its own
capability, not its children — the children are constructor-injected into the implementation. Every
downward edge lives in the `impl/` package the contract deliberately hides. Dependency analysis of
the compiled contract layer confirms it: the contract depends on nothing but the standard library.

**Doc references get most of the way.** The compiler validates them, so a stale or misspelled edge
cannot survive, and IDEs make them clickable.

**The hole is completeness.** Deleting a reference entirely — the graph now silently missing a whole
subtree — passes documentation linting with zero errors. Doclint validates the references that
exist; nothing asks whether the set is complete. So the graph is trustworthy only as far as the
discipline that wrote it, which is exactly the property Contract Graph is trying to eliminate.

### Closing the hole

A one-field annotation makes the edge structural instead of prose:

```java
@Composes({AuthenticationContract.class, PlanContract.class})
public interface RequestProcessingContract {
    Result process(Utterance utterance);
}
```

Two properties follow, both verified on the slice:

- **The graph reconstructs from a single root**, by reflection over the annotation alone.
- **Drift is detectable in both directions.** Cross-checking declared edges against the types the
  implementation actually injects catches the exact edit documentation linting could not:

```
declared : AuthenticationContract
injected : AuthenticationContract, PlanContract
RESULT   : FAIL — injected but not declared: PlanContract
```

Recommended: **both.** The machine-readable edge for the machine — one root, a complete graph, a
build that fails on drift. Prose for the human — what the responsibility *is*, which no annotation
conveys.

## 6. What no annotation fixes

Three things are not structural and must stay in prose, in the contract's doc comment or the owning
`contract.md`:

- **Ordering.** `Plan → Execute → Verify` is a sequence. A composition edge is a "knows about"
  relation; a set of edges is a DAG, not a pipeline.
- **Conditional flow.** Rejection and fallback paths are control flow.
- **Cardinality and optionality.** Whether a child is invoked once, many times, or not at all.

Do not try to encode these. A notation rich enough to express them is a second programming language
living in your annotations, and it will drift from the first one.

## 7. Context cost, honestly

Reading a root contract costs ~15 lines and yields the next hop. Reaching a leaf is roughly five
small file reads with no backtracking.

That is cheaper than loading a 200-line module contract when the goal is to **pinpoint one area** —
the stated goal — and **more expensive** when the goal is to summarise everything. The tree
optimises for the first, deliberately. Claiming otherwise invites a benchmark it would lose.

## 8. Status, and the open question

Mapped folder contracts, their inherited context, and their generated entry points are built and
verified. Task routing exists. The code tier and the completeness of recursive child edges have
**no structural verification**, which means:

- a useful top-down context graph can be authored, but closure per folder can only be asserted;
- a subtree cannot be handed to an agent with confidence that it is the whole subtree;
- parallel work across a contract is work across a boundary that might not hold.

The honest position: **either the machine-readable edge gets built, or the code tier stays an
informal convention.** The middle position — documentation describing a graph the repository does
not maintain — is the worst of the three, because it reads as a guarantee and is not one.

This is the framework's largest open decision. See [the vision](vision.md#what-remains).

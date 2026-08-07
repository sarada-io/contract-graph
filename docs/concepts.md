# Concepts

The model behind Contract Graph, in the order it matters.

## 1. Software context is a graph, not a search result

A repository has a natural context hierarchy: the product contains modules, modules contain
sub-modules, and each narrower unit exists for a reason inside its parent. Source code contains
that information only indirectly. Searching imports and implementations can recover it, but making
every new agent session recover the same structure wastes context and produces inconsistent maps.

Contract Graph writes the explanation down as durable nodes:

```text
repository → module → sub-module → unit
```

Each contract says how its unit participates in the parent, what it owns, who uses its public entry
points, which child contracts refine it, and what must remain true. Lateral contract references
capture real cross-module relationships, so the hierarchy is the graph's spine rather than its
only possible shape.

## 2. Route first; read code second

The routing map turns a request into one or more starting module contracts. An agent then descends
through child contracts until the responsible unit and its boundary are clear. Only then does it
open implementation files.

The purpose is not to eliminate code reading. It is to stop using broad code reading to rediscover
the architecture on every session. Contracts pay the discovery cost once and make the result
available to later agents as bounded, predictable context.

## 3. Change is free on either side of a contract

An implementation may be rewritten, split, or replaced without consulting its callers; a caller may
change how it uses a capability without consulting the implementation. What both sides rely on is
the contract, which is therefore:

- **maintained by default** — modified only with deliberate review;
- **well tested** — the tests hold the guarantee the contract makes;
- **the entry point for humans and agents alike** — one artifact, both audiences.

A contract that is cheap to change is not a contract. A contract that can never change is a
liability. The discipline is that changing one is a visible, tested, reviewed act.

## 4. The architecture is executable, not reviewable

Rules that live only in prose get violated, and the violation is not caught. So:

> A rule and its enforcing test land in the same commit.

The enforcement map records which detector covers which rule. Its closing claim is the load-bearing
one: **a rule that claims enforceability without a detector is aspirational.**

### Make every detector falsifiable

A rule targeting a construct your codebase does not use yet passes **vacuously** forever, and a
vacuous pass is indistinguishable from a real one. Give each detector a companion probe that runs
the identical rule shape against something the codebase *does* use, and assert the probe **fails**.
If the probe ever starts passing, the rule beside it has stopped enforcing anything.

This is the single highest-value habit in the framework. Skip it and your enforcement map becomes a
list of green tests that check nothing.

## 5. Two axes, not one

| Axis | Question |
|---|---|
| **Generality** | Does this hold for any product built here, or only for this one? |
| **Modality** | Is this an invariant a machine can reject, or a preference that resolves a judgement call? |

These are independent, and the grid has occupants in every cell:

| | Invariant | Guide |
|---|---|---|
| **Universal** | *rule and detector land in the same commit* | *prefer fewer seams, writers, and credentials* |
| **Product** | *tenant is a path prefix behind one construction seam* | *prefer a subtree delete over a relational cascade* |
| **Fork-loaded** | *every request carries a trace id* | *keep the admin configurator exposable to a tenant* |

### Modality is per-rule

The tempting design is "fork-loaded principles are guides and never own a detector." It is wrong, and
the trace-id example shows why: it is an observability truth *and* it is testable. People navigate
by **topic**, not by modality. Filing a rule elsewhere because it happens to be testable puts it
where nobody searches.

So each rule carries its own marker:

| Marker | Owes a detector | In the enforcement map | A violation is |
|---|---|---|---|
| `invariant` | yes, same commit | yes | a build failure |
| `guide` | no, and one must not be demanded | no | a decision that went the other way |
| *unmarked* (`AP-`, `PP-`) | yes where a test can express it | **yes, always** | a build failure |

Only the fork-loaded families — `DP`, `OP`, `UP`, `SP` — carry a marker, because only they face
the "is this testable or is it taste?" fork inside a single topic. Architecture and product principles are structural claims about
the repository, so every one of them owes a row — and `cg verify` fails the build when one is
missing. A rule no test can express still takes a row that says so in words, where a reviewer can
argue with it. What it must never take is a plausible-sounding detector nobody wrote.

## 6. Load broad to narrow; decide narrow to broad

**Loading order** — what an agent reads, and what it costs:

| Tier | Loaded |
|---|---|
| `AP` | always — inherited into every contract |
| `PP` | always — inherited, and empty until your product earns a rule |
| `DP` `OP` `UP` `SP` | at a fork, only the families it touches — never inherited |

Which families a phase reads is `map/phases.json`, not a per-repository install choice: all six
ship, and the map decides where each is loaded.

**Precedence order** — what wins when two rules pull different ways:

- **An invariant never yields.** A guide cannot argue with a failing build, and no preference may
  be cited to justify one. Two genuinely conflicting invariants are a defect in the rule set that
  needs an amendment, not a judgement call at the seam.
- **Between guides, the most specific wins.** `PP` beats a fork-loaded family (`DP`, `OP`, `UP`,
  `SP`) beats a general `AP` preference, because the narrower rule was written knowing more.

You read the general thing first because it is almost always relevant, and apply the specific thing
last because it is closer to the case in front of you.

## 7. Contracts must survive plan deletion

Plans are transient; contracts are permanent. So:

- State every rule in full inside the contract. A plan path or ticket ID is never the definition of
  behaviour.
- Never cite a transient plan from permanent governance. This is machine-enforced.
- Never write scheduling language ("deferred to X-3.5") into a contract. Describe the current
  state; update the contract when the state changes.

## 8. Amendments state what they cost

Any principle may change. An amendment requires a dated entry saying what changed, why, and **what
it costs** — with the enforcing test updated in the same commit.

The cost clause is not ceremony. A rule whose price nobody wrote down is a rule nobody can weigh
later, and the amendment log is where a future reader learns what was traded away rather than only
what was gained. Write the sentence you would least like to write.

## 9. A folder is a workspace

A folder plus its `contract.md` is the smallest unit you can hand to a person or an agent with the
instruction *change anything inside; keep the contract.* Two properties make that true, and both
are obligations on the contract rather than on the worker:

- **Placement** — the contract states how the parent uses this folder, so the unit is meaningful
  without reconstructing its place in the system from source.
- **Closure** — everything needed to understand the folder is in its own contract or in the
  contracts directly beneath it. A worker may follow an explicit parent or sibling edge; it should
  never have to search upward to discover that an edge exists.
- **Confinement** — a change that must escape the folder is a contract change, and re-enters the
  normal flow. The unit does not silently expand; it stops and raises.

## 10. Governance protects context; it is not the product

Once contracts are the source of project context, letting them drift makes every later session
worse. That is why Contract Graph generates inherited blocks, verifies contract shape, and requires
detectors for machine-expressible rules.

The order matters: the context graph makes the software navigable; verification keeps that graph
truthful; governance is the accumulated discipline around doing so. Adding more rules without
improving or protecting navigability is not progress toward the project's purpose.

## 11. Context cost, stated honestly

Contract Graph optimises for **pinpointing one area**, not for summarising everything. Reaching a leaf costs a
few small reads with no backtracking, which beats loading a large contract when you need one area
and loses when you need the whole picture.

Note what the design spends, too: binding rules are duplicated into every module contract, and the
principle index is duplicated into each root entry file. Both are deliberate — some harnesses skip
hidden directories — but they mean the honest claim is **bounded, predictable context**, not *less*
context. An agent reads a known fixed set instead of whatever a search returns.

# Design Principles

`DP-` rules. Load this file at a fork about product shape, configuration, tenancy, caching, or the
operating model — the decisions that shape what the product *is* rather than how a surface behaves.

Every rule here is a `guide` with a stated cost. A design property that is testable belongs in
`architecture.md` as an invariant with a detector; what remains here is judgement.

These are stated as leans, not as rules about any particular product. A rule that names your
tenants, your billing unit, or your operator console is a `PP-` rule for *your* repository and
belongs in `product.md` — the difference is that a lean survives being read by someone building
something else.

## DP-01. Product shape

- **DP-01-01** `guide` — Prefer configuration over structural change only when the configuration surface permits it.
  **Cost:** The configuration must carry an owner, validation, audit trail, revision, and safe default.

- **DP-01-02** `guide` — Prefer narrower product scope and the simpler solo-maintainer operating model.
  **Cost:** Flexibility and additional customer shapes wait for evidence rather than arriving speculatively.

## DP-02. Isolation and scope

- **DP-02-01** `guide` — Prefer the isolation boundary that makes a forgotten scope
  *unconstructable* over one enforced by a predicate somebody must remember to write.
  **Cost:** A single construction seam becomes a chokepoint every caller routes through, and widening it later touches every call site.

- **DP-02-02** `guide` — Prefer passing scope identity as an explicit parameter over resolving it
  from ambient context.
  **Cost:** Every signature on the path widens, including the ones where the scope is obviously constant.

- **DP-02-03** `guide` — Prefer one administrative surface that can be narrowed to a single
  customer over separate internal and customer-facing surfaces.
  **Cost:** The surface must stay modular and its configuration versioned before either is otherwise needed.

## DP-03. Doing less

- **DP-03-01** `guide` — Prefer removing work over doing the same work faster.
  **Cost:** Removing work usually means renegotiating a behaviour or a promise, which is a wider change than a local optimisation.

- **DP-03-02** `guide` — Prefer a cache you can invalidate correctly over one that is merely faster.
  **Cost:** Correct invalidation needs an owner for every cached fact, and that ownership is work the uncached design never pays.

## DP-04. What you charge for

- **DP-04-01** `guide` — Prefer metering the unit you actually sell over the unit that is easiest
  to count.
  **Cost:** The sold unit usually spans several countable events, so it must be defined in code and in the schema before anything can meter it.

- **DP-04-02** `guide` — Prefer exhausting a limit to degrade the service over letting it fail.
  **Cost:** A degraded path is a second behaviour to build, document, and keep working when nobody is exercising it.

- **DP-04-03** `guide` — Prefer keeping internal cost mechanics off any surface the customer sees.
  **Cost:** Two vocabularies for one quantity, and a translation between them that can drift.

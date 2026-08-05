# Design Principles

`DP-` rules. Load this file at a fork about product shape, configuration, tenancy, caching, or the
operating model — the decisions that shape what the product *is* rather than how a surface behaves.

Every rule here is a `guide` with a stated cost. A design property that is testable belongs in
`architecture.md` as an invariant with a detector; what remains here is judgement.

## DP-01. Product shape

- **DP-01-01** `guide` — Prefer configuration over structural change only when the configuration surface permits it.
  **Cost:** The configuration must carry an owner, validation, audit trail, revision, and safe default.

- **DP-01-02** `guide` — Prefer narrower product scope and the simpler solo-maintainer operating model.
  **Cost:** Flexibility and additional customer shapes wait for evidence rather than arriving speculatively.

## DP-02. Tenancy and configuration

- **DP-02-01** `guide` — Keep the central super-admin configurator exposable to a tenant.
  **Cost:** UX must stay modular and configuration versioned before either is otherwise needed.

## DP-03. Doing less

- **DP-03-01** `guide` — Prefer removing work over doing the same work faster.
  **Cost:** Removing work usually means renegotiating a behaviour or a promise, which is a wider change than a local optimisation.

- **DP-03-02** `guide` — Prefer a cache you can invalidate correctly over one that is merely faster.
  **Cost:** Correct invalidation needs an owner for every cached fact, and that ownership is work the uncached design never pays.

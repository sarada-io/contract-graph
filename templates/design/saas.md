# SaaS Design Principles

Load this set explicitly when a SaaS product-shape, configuration, tenancy, or operating-model
decision remains after binding contracts and principles have been applied.

- **DP-SAAS-01-01** `guide` — Prefer configuration over structural change only when the configuration surface permits it.
  **Cost:** The configuration must carry an owner, validation, audit trail, revision, and safe default.

- **DP-SAAS-01-02** `guide` — Prefer narrower product scope and the simpler solo-maintainer operating model.
  **Cost:** Flexibility and additional customer shapes wait for evidence rather than arriving speculatively.

- **DP-SAAS-02-01** `guide` — Keep the central super-admin configurator exposable to a tenant.
  **Cost:** UX must stay modular and configuration versioned before either is otherwise needed.

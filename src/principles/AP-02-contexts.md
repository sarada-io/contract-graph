# Architecture Principles

## AP-02. Bounded contexts stay separable

- **AP-02-01** — No module dependency cycles.
- **AP-02-02** — Each context owns its domain, persistence, and boundary code. A bounded context
  **must not** reference another bounded context's internal types; cross-context access is through
  published contracts only.
- **AP-02-03** — Each bounded context owns its persistence **data**: exactly one context writes a
  given collection or table, and no context reads or writes another's except through a published
  port. **A data-access module may be shared; the data may not.** What remains forbidden is a
  **generic store abstraction**: every adapter is written against its own context's domain ports,
  never against a shared persistence port, and no adapter slice may depend on another slice's
  persistence model. Code shared inside a persistence module is confined to named isolation seams
  and is never exported through the domain layer.
- **AP-02-04** — Business tables have exactly one owning writer. Shared runtime records carry
  explicit ownership, and cross-owner mutation is forbidden.
- **AP-02-05** — Sharing a process is a **deployment choice, never a licence** to share types or
  write another context's tables. A plan that puts one context's code inside another's module is
  wrong regardless of how convenient the wiring is.

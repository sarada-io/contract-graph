# Architecture Principles

## AP-03. Deterministic governance, not model judgement

- **AP-03-01** — Input safety is a **code gate**, not a model call.
- **AP-03-02** — Tools and actions are **deny-by-default** behind a single enforcement chokepoint.
- **AP-03-03** — Authorization lives in the domain layer, never only in the UI or a prompt.
- **AP-03-04** — Any customer-visible action with side effects requires explicit confirmation.
- **AP-03-05** — Role and authorization rules are **never** runtime configuration.

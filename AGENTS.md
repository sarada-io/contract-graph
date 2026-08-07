# Contract Graph — contributor context

Contract Graph's purpose is to make software understandable to coding agents as a traversable,
top-down context graph. The primary path is repository → module → sub-module → relevant
implementation. Each contract explains how its unit is used by its parent and points to the next
contracts below or beside it.

Agents route through contracts before reading implementation so each new session can locate the
smallest change surface without rediscovering the architecture from unrelated source files.
Verification, rules, and governance protect this context graph once it exists; they are a
consequence of the product, not its reason for existing.

Before changing this repository, read in order:

1. [`docs/vision.md`](docs/vision.md) — the project intention and causal model.
2. [`docs/contracts.md`](docs/contracts.md) — the recursive contract structure and current limits.
3. [`README.md`](README.md) — shipped behavior and user-facing workflow.
4. The relevant files under `src/scripts/`, plus `test/verify.test.js`, for implementation work.

Keep claims honest. Mapped folder contracts and task routing are built; machine-verified recursive
composition and closure are designed but not built. Do not present governance as the primary
product or claim that agents never need to read code. The intended outcome is bounded code reading
after precise contract-based routing.

This project has no runtime dependencies and supports Node.js 18.17+. Preserve unrelated working
tree changes. Run `npm test` after changing runtime code or anything scaffolded from `src/`.

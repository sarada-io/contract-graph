# Repository architecture policy

Parent: [Verification contract](contracts/verification.md). Read when changing principles,
schemas, structural detectors or the product’s architectural promises.

Contract Graph is deliberately not a neutral documentation scaffold. It supplies a firm,
opinionated definition of well-structured software so a lower-capability coding agent has safe
defaults to follow instead of inventing architecture locally and gradually mixing responsibilities,
dependencies, persistence, and policy together.

The opinion has an order. Recursive structural decomposition is the product core. The YAML contract graph records and governs its responsibilities, boundaries, edges, routes, invariants, and verification through each engineering loop. General application-architecture advice is secondary: do not make it a universal Contract Graph constraint unless violating it would predictably damage graph routing, ownership, boundary confinement, or structural truth.

Treat the shipped architecture principles as hard constraints, not illustrative examples. Engineering
guidelines are deliberately non-binding best practices: retain useful judgement there without
pretending prose is enforced. Promote one only when it protects structural integrity, states one
deterministically measurable invariant, names a blocking detector, and has a fail-on-demand
fixture. In the verifier-owning change, promotion registers that detector, assigns a permanent
`A` ID, and removes the overlapping `E` practice together.

`cg init` refreshes architecture and engineering from the installed release, showing the update
and retaining backups before replacement. Product principles remain repository-owned and are
converted to the current schema without changing their IDs or statements; missing rationale
requires explicit input. Contracts and enforcement retain their content, with known legacy schema
URLs updated. Workflow and phase policy remain preserved. A catalog amendment
must remain within its registered detector semantics; a new generic `A` rule requires a verifier
change, while repository-specific binding belongs in `P`.

When reviewing an architecture rule, classify it explicitly:

1. graph protocol — required for valid, connected, traversable YAML contracts;
2. structural governance — required to keep code structure and graph truth aligned through change;
3. broader architecture guidance — useful engineering judgement that remains repository choice
  unless the repository adopts it as `P` or the verifier owner promotes it to `A`.

Machine-expressible bindings owe build-breaking detectors and fail-on-demand fixtures. A detector
recipe is not enforcement. Brownfield warmup must resolve a binding finding to a real detector, a
corrective Step, or an explicit owner-approved exception. Broader engineering practices remain optional
guidance. A team may amend installed defaults, but later init runs refresh A/E from the release;
review the preserved backups when reapplying deliberate amendments. Product and workflow choices
remain repository-owned.

Keep the rule families distinct in authority, not in document kind: `A`, `E`, and `P` are
principle catalogs sharing one schema. `A` is global MUST; `P` is scoped MUST and the only family
contracts list in `rules`; `E` is shipped SHOULD. A generally good security, operations, data, or
deployment preference remains guidance or constitution policy. It becomes `P` only when it is
specific to the adopting product, or `A` when it satisfies the complete structural promotion gate
in the verifier-owning codebase.

`docs/` is written for people adopting or reviewing the product. Agents may read it; it is not
the turn-by-turn procedure. After `cg init`, that lives in the `/cg-*` skills and
`.agents/cg/workflow.md`.


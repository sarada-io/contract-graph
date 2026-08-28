# Contract Graph — contributor context

Contract Graph's purpose is to make software understandable to coding agents as a traversable,
top-down context graph. The primary path is repository → module → sub-module → components →
relevant implementation. Each contract explains how its unit is used by its parent and points
to the next contracts below or beside it.

Agents route through contracts before reading implementation so each new session can locate the
smallest change surface without rediscovering the architecture from unrelated source files.
Verification, rules, and governance protect this context graph once it exists; they are a
consequence of the product, not its reason for existing.

## Opinionated defaults are part of the product

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

Hard at installation does not mean vendor-owned forever. `cg init` preserves repository contracts,
the architecture principles, guidelines, enforcement mappings, and workflow context after
installing them. The adopting repository may deliberately keep, amend, replace, or retire a
default. Contract Graph must not silently overwrite that choice on upgrade. A catalog amendment
must remain within its registered detector semantics; a new generic `A` rule requires a verifier
change, while repository-specific binding belongs in `P`.

When reviewing an architecture rule, classify it explicitly:

1. graph protocol — required for valid, connected, traversable YAML contracts;
2. structural governance — required to keep code structure and graph truth aligned through change;
3. broader architecture guidance — useful engineering judgement that remains repository choice
  unless the repository adopts it as `P` or the verifier owner promotes it to `A`.

Machine-expressible bindings owe build-breaking detectors and fail-on-demand fixtures. A detector
recipe is not enforcement. Brownfield warmup must resolve a binding finding to a real detector, a
corrective Step, or an explicit owner-approved exception. Architecture practices remain optional
guidance. After installation, the principle, guideline, and workflow files are repository-owned and
preserved so a team can amend them deliberately.

Keep the rule families distinct: `A` is the global architecture-principles catalog; `P` contains repository-authored product guidelines and is the only family contracts list in `rules`; `E` contains non-binding engineering guidelines. A generally good security, operations, data, or deployment preference remains guidance or constitution policy. It becomes `P` only when it is specific to
the adopting product, or `A` when it satisfies the complete structural promotion gate in the
verifier-owning codebase.

`docs/` is written for people adopting or reviewing the product. Agents may read it; it is not
the turn-by-turn procedure. After `cg init`, that lives in the `/cg-*` skills and
`.agents/cg/workflow.md`.

Before changing this repository, read in order:

1. `[docs/vision.md](docs/vision.md)` — the project intention and causal model.
2. `[docs/contracts.md](docs/contracts.md)` — the recursive contract structure and current limits.
3. `[docs/README.md](docs/README.md)` — human documentation index, then workflow and lifecycle as needed.
4. `[README.md](README.md)` — the npm and GitHub landing page for people installing the package.
5. The relevant skill under `src/skills/` and `[src/cg/workflow.md](src/cg/workflow.md)` when the change is agent procedure.
6. The relevant files under `src/scripts/`, plus `test/verify.test.js`, for implementation work.

Keep claims honest. Schema-backed contracts, contract-owned task routes, and machine verification
of the authored graph's reciprocity, acyclicity, and root reachability are built. Correspondence
between the graph and every implementation dependency, exported symbol, and safe parallel write
set is not yet proven. Do not present governance as the primary product or claim that agents never
need to read code. The intended outcome is bounded code reading after precise contract routing.

This project supports Node.js 18.17+ and uses the bundled `yaml` package to parse authored contract
nodes. Preserve unrelated working tree changes. Run `npm run build` after changing
`src/cg/principles/`, `src/cg/guidelines/`, or `src/cg/schema/`. Run `npm test` after changing runtime code or anything
scaffolded from `src/`.
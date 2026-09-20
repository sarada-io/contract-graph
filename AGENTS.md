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

Before changing this repository, read in order:

1. [docs/vision.md](docs/vision.md) — the project intention and causal model.
2. [docs/contracts.md](docs/contracts.md) — the recursive contract structure and current limits.
3. [docs/README.md](docs/README.md) — human documentation index, then workflow and lifecycle as needed.
4. [README.md](README.md) — the npm and GitHub landing page for people installing the package.
5. The relevant skill under `src/skills/` and [src/cg/workflow.md](src/cg/workflow.md) when the change is agent procedure.
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

## Current delivery and documentation architecture

- Six lifecycle skills remain: warmup, plan, produce, prototype, sign-off and unblock. Plan owns outcomes and technical readiness; produce owns incremental preparation, implementation and repairs. Prepare and auto-run are retired, not hidden stages. Plan/produce and prototype converge on one accepted `cg delivery handoff` and one sign-off procedure.
- Actual completion authority carries in-scope work forward; it does not supply human acceptance or waive blockers. Produce preserves batch/per-item review choice and reports Item/Code/Test/Docs with Yes/No/Partial/Blocked, then an actual next action or None. See [workflow](docs/workflow.md) for record ownership and cleanup.
- Optional coordinators and workers use existing plans and receipts, not another ledger. Experts are skills under `src/skills/experts/`, installed flat under `.agents/skills/`; project selection is repository-owned `.agents/cg/experts.md`. They add no lifecycle phases or structural layers. Keep shared attribution in `THIRD_PARTY_NOTICES.txt`, outside expert instructions. See [experts](docs/experts.md).
- Completion leaves durable docs, owner-approved intent and YAML current, then removes obsolete scope-owned plan/process/progress files. Preserve active shared dependencies, explicit retention policy and the compact delivery receipt. Do not replace deleted plans with permanent execution diaries.
- Use the [documentation index](docs/README.md) to find each topic’s canonical home; update and link rather than duplicating guidance. Maintainer planning under ignored `docs/plan/` is temporary and must not be required to understand the product. Do not invoke the shipped lifecycle merely to maintain its implementation.

Before running builds or destructive cleanup, check whether a global `cg` resolves into this checkout’s `dist/build`. If linked or uncertain, run validation in a disposable copy so it cannot alter the installed command. Do not install globally, publish, or update adopting repositories as part of ordinary validation. `./urun` installs a tarball copy when explicitly requested.

Use one contract authoring template at `src/cg/templates/contract.template.yaml`, installed under `.agents/cg/templates/`. The schema owns shape and the architecture catalog owns placement; do not duplicate templates per skill or treat example kinds as architectural requirements.

## Installation and upgrade entry point

`cg init` is the sole entry point for both first adoption and upgrading an existing installation. Extend its existing migration, preview (`--check`), confirmation (`--yes`), backup and retirement behavior when releases need upgrade work. Do not add a separate `cg upgrade` command or standalone upgrade script. Preserve repository-owned content and document release-specific steps in `docs/upgrade.md`.

## Repository-only planning

When creating or iterating a maintainer plan for this repository, read
[repo-plan](.agent/skills/repo-plan/SKILL.md). Keep one master plan with a concise Executive Summary
above the full agent detail. This local skill is independent of the shipped `src/skills/cg-plan/`.

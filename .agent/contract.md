# Contract Graph Dev Kit repository contract

Parent: [AGENTS.md](../AGENTS.md). Purpose: route maintenance of Contract Graph Dev Kit itself
to the smallest responsible boundary before reading implementation.

These are repository-only Markdown contracts. They describe logical ownership of the current
code; they are not installed by `cg init`, consumed by `cg verify`, or a replacement for the
product's YAML graph. Flat runtime files remain at their current paths. The boundaries below
are review constraints, not mechanically enforced import boundaries.

## Route a change

Read one matching child, then its named implementation and tests. Follow sibling links only
when the change crosses that promise; do not load every contract or every script by default.

| Request | Owning child contract |
| --- | --- |
| Install, re-init, release upgrades, migrate catalogs, editor profiles or discovery | [Installation](installation/contract.md) |
| YAML nodes, graph traversal, routes, projections, module discovery | [Graph](graph/contract.md) |
| Source facts, language support, parser adapters, inspection reports | [Inspection](inspection/contract.md) |
| Intent approval, delivery receipts, status, next action, residue | [Delivery](delivery/contract.md) |
| A/E/P catalogs, schemas, binding detectors, aggregate verification | [Verification](verification/contract.md) |
| Skills, lifecycle instructions, templates, human documentation | [Authoring](authoring/contract.md) |
| Build, package, runtime identity, local development and release tools | [Distribution](distribution/contract.md) |

## Root surface and composition

[bin/cg.js](../bin/cg.js) launches [cli.js](../src/scripts/cli.js), which owns CLI
argument handling, interactive orchestration, command dispatch, output and exit codes.
Each command's behavior belongs to the child above. Adding a command requires routing it to
an owner here; a new verb is not a new responsibility by itself. The package's exported graph
API belongs to Graph. CLI changes use the affected child's tests and `npm test`.

The children jointly cover `src/scripts/`, shipped assets and maintainer tooling. Tests sit
beside this logical graph in `test/`; they verify their named owner rather than forming another
product capability. Human-facing topic routes remain in [docs/README.md](../docs/README.md).

## Keep this map small and true

This is the minimal maintainer graph: `.agent/contract.md` →
`.agent/<responsibility>/contract.md` → named source files and their existing tests.
Source headers point back to their owning node. These comments refer to the source checkout;
the maintainer nodes are not packaged or scaffolded. No detector or verification script is
needed for this Markdown hierarchy.

The runtime is JavaScript ES modules, including the adapter that parses TypeScript.
The `.ts` files under `test/fixtures/contract-inspection/` are inspected input, not runtime
modules; keep their bytes focused on the test case rather than adding ownership headers.
The flat script layout groups responsibilities logically. Preserve existing import paths and
package exports when making routine changes; physical extraction is a separate refactor with
the owner's behavioral tests. File length alone does not justify another command or driver.

- Before adding a tool or script, name its owner and reuse that boundary's existing entry point.
  In particular, installation upgrades extend `init`; never create a parallel upgrade driver.
- A helper may be a separate file inside one logical owner. Record it in that owner's contract;
  file count alone is not a reason to introduce another boundary.
- Update affected ownership, links, entry points and verification in the same change as code.
  A new responsibility needs a child and a route here; a moved responsibility needs both owners updated.
- Split a child only when a distinct responsibility needs its own promise. Keep current facts
  and constraints here, with detailed explanations linked to their canonical homes.
- Do not hide cross-boundary work in shared helpers. `model.js` is an existing mixed concern
  documented under Verification; inspect the relevant export and its consumers before editing.

Validation follows [CONTRIBUTING.md](../CONTRIBUTING.md#choose-validation-from-the-change-surface).
For this Markdown graph, check local links and ownership against actual files and CLI dispatch.
No claim of automated drift prevention follows from these prose contracts.

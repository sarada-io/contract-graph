# Contract Graph Dev Kit — contributor entry

Contract Graph Dev Kit is a framework for agentic software development with repository-native
contracts as a graph at its core. It gives coding agents the structure and workflow to plan,
execute and verify changes while keeping the codebase understandable. Integrated workflows
carry agreed work through implementation, review and completion. The graph provides precise
routing and bounded implementation reading; it does not eliminate code reading or prove
arbitrary parallel work safe.

## Find the owner before reading implementation

Start at the [repository Markdown contract](.agent/contracts/README.md), select the relevant
child, then read its implementation and tests. Follow sibling links only when their promises
are affected. The map describes logical tool groups in the current code layout.

Before adding a tool, script or command, locate its existing owner and entry point. Update the
affected contract in the same change as ownership, surfaces or dependencies. New responsibilities
need a route in the map; do not accumulate subsystem rules in this entry file.

## Product context

Before changing this repository, read in order:

1. [Vision](docs/vision.md): intention and causal model.
2. [Contracts](docs/contracts.md): recursive structure and current limits.
3. [Documentation index](docs/README.md): canonical human explanations; follow the relevant topic.
4. [README](README.md): installation and product claims.
5. The selected Markdown boundary contract and its relevant source/tests. For agent procedure,
   read the relevant `src/skills/` skill and [workflow](src/cg/workflow.md).

Detailed [architecture policy](.agent/architecture-policy.md) applies to principles, structural
rules and product architecture changes. [Authoring](.agent/contracts/authoring.md) owns lifecycle
and documentation constraints. These maintainer contracts do not replace the shipped YAML format.

## Work safely and verify

Preserve unrelated working tree changes. Support Node.js 18.17+ and the bundled YAML parser.
Use the selected boundary’s verification and [CONTRIBUTING](CONTRIBUTING.md).
Run `npm test` after runtime changes or anything scaffolded from `src/`; changes to
`src/cg/principles/`, `src/cg/guidelines/` or `src/cg/schema/` also require `npm run build`.

Before builds or destructive cleanup, resolve global `cg`. If linked to this checkout’s
`dist/build` or uncertain, validate in a disposable copy. Do not globally install, publish or
update adopting repositories during ordinary validation. `./urun` installs a tarball copy only
when explicitly requested. See [Distribution](.agent/contracts/distribution.md).

For repository-only maintainer plans, read [repo-plan](.agent/skills/repo-plan/SKILL.md).
Keep one master plan with a concise Executive Summary above full agent detail. Do not invoke
the shipped lifecycle merely to maintain its implementation; temporary plans under ignored
`docs/plan/` must not be required to understand the product.

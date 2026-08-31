# Contract Graph

**Scale model-driven development with contracts, not shared context.**

Faster code generation is not the hard part. Keeping the result understandable, bounded, and
maintainable is. Contract Graph records a repository as a traversable hierarchy of contracts —
project → module → sub-module → component or library — so a person or a coding agent can find
where a change belongs before reading implementation.

Each contract explains how its parent uses the unit, what it owns, where the boundary is, and
which contract to read next.

| Start here | What you get |
|---|---|
| [Quick Introduction Video](https://sarada.io/cg/#watch) | Plays on the public page |
| [Vision](https://sarada.io/community/contract-graph/vision/) | Why contracts, and what problem they are for |
| [Contracts](https://sarada.io/community/contract-graph/contracts/) | What one YAML node is, and what verification proves |
| [Workflow](https://sarada.io/community/contract-graph/workflow/) | How work is split, run, and left on disk |
| [Lifecycle](https://sarada.io/community/contract-graph/lifecycle/) | The stages you run after install |
| [Source](https://github.com/sarada-io/contract-graph) | CLI, schemas, skills, and issues |

## Install

Requires Node.js 18.17 or newer. Install globally so `cg` is available in later sessions:

```bash
npm install --global contract-graph
cg --version
```

That installs the CLI, its YAML parser, the scaffold, and the seven lifecycle skills. Nothing in
your repository changes until you run `cg init` there.

## Use it in a repository

```bash
cd your-repository
cg init
```

In a terminal, `init` confirms this directory, then lets you pick editor and agent support.
Restart or reload the IDE so the `/cg-*` skills appear.

**New repository.** Fill the root contract's purpose, boundaries, and routes, then start with
`/cg-plan`.

**Existing repository.** Run `cg modules` to see detected roots, then `/cg-warmup` in a new
chat. If roots are still unmapped, that is adoption: warmup writes contracts for the code that
exists. If every root is already governed, that is reseed: warmup adds missing children, product
rules, and route targets without rewriting existing purpose or P IDs. Until adoption finishes,
`cg verify: OK` means the scaffold is well-formed, not that this repository is governed.

**Upgrade** from 0.3.0 or 0.4.0:

```bash
npm install --global contract-graph@0.5.0
cd <repo>
cg init --yes --docs docs
cg verify
```

Then `/cg-warmup` in a new chat (adoption if `cg modules` still has gaps, reseed if the graph is
already connected). Framework skills and schemas update; contracts and catalogs stay yours.

Supported discovery: [Cursor](https://cursor.com/docs/skills),
[Codex](https://learn.chatgpt.com/docs/build-skills),
[Claude Code](https://code.claude.com/docs/en/skills),
[GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
(VS Code agent mode), and [Antigravity](https://antigravity.google/docs/cli/gcli-migration/).
Antigravity, Codex, and Cursor share the `agents` profile (`AGENTS.md` and `.agents/skills/`).

## Day to day

After init, delivery is the skills. The CLI installs, verifies, and inspects; it does not plan or
write product code.

| Skill | When |
|---|---|
| `/cg-warmup` | Adoption or additive reseed on existing code: discover boundaries, write or extend their contracts |
| `/cg-plan` | Turn an outcome into ordered phases |
| `/cg-prepare` | Turn one phase into a queue of steps |
| `/cg-produce` | Run the next ready step: code, tests, and contracts together |
| `/cg-sign-off` | Close a phase when the graph still describes the code |
| `/cg-unblock` | Record a fork so other work can continue |
| `/cg-auto-run` | Opt-in: follow already-planned stages; never auto-runs warmup or unblock |

| Command | Purpose |
|---|---|
| `cg verify` | Check that the authored graph is closed |
| `cg modules` | Show detected module roots and what still needs a contract |
| `cg graph show` | Print the contract graph |
| `cg contract route --task "…"` | Find which contracts a request should load |
| `cg next` | See which stage owns the next move |
| `cg residue` | Find plan files nothing still links to |

`cg --help` lists the rest.

## What a contract is for

A useful contract answers:

- why this unit exists and how its parent uses it;
- what it owns and what is outside its boundary;
- which public entry points cross the boundary;
- which child or sibling contracts carry the next context;
- which invariants must remain true; and
- how to verify a change confined to the unit.

The YAML at `<unit>/.agents/cg/contract.yaml` is canonical. Structural bindings (`A`) apply
everywhere. Product rules (`P`) bind only the contracts that list them. Engineering guidelines
(`E`) are advice, not compliance. Details are in the [contracts](https://sarada.io/community/contract-graph/contracts/)
and [vision](https://sarada.io/community/contract-graph/vision/) guides.

## Honest limits

Built today: schema-backed contracts, task routing, brownfield discovery, the seven skills, and
verification that the authored graph is connected (reciprocal edges, no cycles, reachable from
the root, declared surfaces and checks resolve).

Not claimed: that every implementation import matches the graph, that every exported symbol is
declared, or that two work areas are safe to edit in parallel. Those remain upcoming.

## Learn more

- [Public schemas](https://sarada.io/contract-graph/schema/) — JSON Schema identities used by Contract Graph files.
- [Contributing](https://github.com/sarada-io/contract-graph/blob/main/CONTRIBUTING.md) — tests, packing, and publication.

## Licence

Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).

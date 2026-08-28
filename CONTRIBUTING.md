# Contributing

Contract Graph is a contract-first project. A contribution is complete when the implementation,
tests, user documentation, and affected YAML contracts tell the same story.

## Before opening a pull request

Discuss a large change in an issue before implementing it. This is especially important for a new
editor profile, contract-schema change, lifecycle change, package-layout change, or globally
binding `A` rule. Small fixes, documentation corrections, and focused negative fixtures can go
straight to a pull request.

Keep each pull request focused. A behavior change must update its tests and user-facing
documentation in the same change. If the change alters a governed responsibility, public surface,
invariant, dependency, or route, update the responsible `contract.yaml` too.

Useful contribution areas include:

- contract traversal, routing, graph projections, and verifier diagnostics in `src/scripts/`;
- greenfield and brownfield initialization, editor discovery, and upgrade safety;
- lifecycle skills under `src/skills/`;
- schemas, structural detectors, and fail-on-demand fixtures;
- clearer examples and documentation that keep the npm installation path accurate; and
- manual discovery evidence from the real agent hosts Contract Graph supports.

## Setup and first checks

Contract Graph requires Node.js 18.17 or newer.

```bash
npm ci
npm test
node bin/cg.js --help
```

The runtime dependency surface is deliberately limited to the YAML parser used for canonical
contracts and rule catalogs. A pull request adding another runtime dependency must explain why the
benefit justifies adding supply-chain surface to a verifier.

`docs/` is written for people. Start with `docs/README.md`, then vision and contracts, then the
relevant contract route. Use `cg contract route --task "<request>"` when the authored routes cover
the request, then descend to the smallest responsible boundary.

Agent procedure lives in `src/skills/` and `src/cg/workflow.md` (installed as
`.agents/cg/workflow.md`). Do not put turn-by-turn skill protocol, `$cg-` hop tokens, or
host-specific hook JSON in `docs/` or in `README.md`. The README is the npm and GitHub landing
page; written guides live in `docs/` and on [sarada.io/cg](https://sarada.io/cg/).

## Choose validation from the change surface

Run focused tests while iterating, then the complete relevant checks before opening the pull
request. Use this table as the minimum:

| Changed area | Required validation |
|---|---|
| Documentation only | Check commands, links, filenames, and claims against the current CLI and package behavior. |
| Runtime scripts, init, sync, profiles, templates, or skills | Focused test file(s), then `npm test`; manually exercise any changed user workflow. |
| `src/cg/principles/`, `src/cg/guidelines/`, or `src/cg/schema/` | `npm run build`, `npm run build:check`, then `npm test`. |
| Package metadata or build assembly | `npm test`, `npm run pack`, inspect the tarball, and smoke-test the extracted package. |
| Editor discovery behavior | All automated checks plus `npm run try -- <host>` and a check in the real editor or agent host. |

Report the exact checks and outcomes in the pull request. “Tests pass” is not enough when the
change affects interactive initialization or editor discovery.

## Installation scenarios

Initialization changes must cover all four scenarios below. Use throwaway repositories; never run
destructive test helpers against a working project.

| Scenario | Expected result |
|---|---|
| Greenfield | `cg init` installs the starter `src` contract, selected discovery adapters, docs trees, skills, and versioned profile metadata; `cg verify` passes. |
| Brownfield | Existing source is preserved. A repository without `src/` does not gain an invented one, detected module roots are reported as unmapped, and `/cg-warmup` is the next adoption step. |
| Existing instructions | Existing `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` content survives. The user is warned before the selected files receive a generated first-line pointer. |
| Existing docs folder | Interactive init asks whether to reuse `docs/`; non-interactive init requires an explicit `--docs docs` or another single-directory root. Existing files are preserved. |

For host-specific discovery, run:

```bash
npm run try -- claude
```

Valid targets are `antigravity`, `claude`, `codex`, `copilot`, and `cursor`. The helper recreates
`tmp/<target>`, runs `init` → `sync` → `verify`, and reports the artifacts that host is expected to
read. It is repository-only tooling and is excluded from the npm package.

The shared `agents` installation profile covers Antigravity, Codex, and Cursor because they consume
the same root `AGENTS.md` and `.agents/skills/` layout. The host names remain accepted by the CLI as
compatibility aliases and by the manual helper as distinct real-editor test targets. Claude Code
and GitHub Copilot for VS Code have their own adapters.

Include the host, version, operating system, terminal, selections made, generated files inspected,
and result in the pull-request report. A repository fixture proves what Contract Graph wrote; only
the real host proves that the host discovered it.

### Claude Code gate (optional)

`cg init` ships `.agents/hooks/cg-gate.mjs` but does not edit user-owned hook settings. The gate
compares a requested skill with `cg next --for <skill>`. Merge this registration into
`.claude/settings.json` only if you use Claude Code and want that check:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Skill",
      "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.agents/hooks/cg-gate.mjs\"" }]
    }],
    "UserPromptSubmit": [{
      "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.agents/hooks/cg-gate.mjs\"" }]
    }]
  }
}
```

The hook resolves `node_modules/.bin/cg`, then `cg` on `PATH`, or `CG_BIN`. Resolution failures
allow the dispatch, so confirm `cg --version` in the hook environment before relying on it. Other
hosts do not use this file.

## Source layout

```text
src/scripts/    engine — CLI, verifier, build, and contract graph queries
src/skills/     lifecycle skills → .agents/skills/
src/cg/         authored Contract Graph core → .agents/cg/
src/install/    hooks, rules, profiles, and preserved templates used by init
test/           behavior, negative fixtures, package, and scaffold coverage
```

`src/cg/` contains `contract.yaml`, `workflow.md`, `phases.json`, `enforcement.yaml`,
`principles/`, `guidelines/`, and `schema/`. `src/install/templates/` holds the starter module and
the `docs/{plans,decisions,guides}` trees. Profile configurations live in
`src/install/profiles/` and are packaged for the CLI, but are not copied into an adopting
repository.

## Changing the scaffold

`SCAFFOLD_MAPPING` in `src/scripts/init.js` is the executable source of truth for what `cg init`
writes. Every consumer-facing source must match exactly one mapping rule.

Each rule has an ownership policy:

- `replace` is framework-owned and may be updated by a later `cg init`;
- `preserve` becomes repository-owned after installation and is written only when absent; and
- generated discovery artifacts are regenerated by `cg sync` from the selected profiles.

The test suite checks the mapping in both directions and round-trips a temporary scaffold against
an independently encoded target map. When changing a detector, first prove the intended negative
fixture fails, then restore the valid state and run the complete suite.

Editor profiles may add discovery artifacts only; they may not change the universal contract or
governance tree. To add or change one:

1. Confirm the official paths and then test them in the real host with a scratch repository.
2. Update `<name>.scaffolding.conf.json` with its lowercase name, display name, root pointers,
   optional skill wrappers, and inheritance.
3. Add tests for exact artifacts, missing selected artifacts, absent unselected artifacts,
   malformed configuration, incremental re-init, and profile neutrality.
4. Run `npm test`, `npm run try -- <host>`, and inspect the result in the real host.

Do not invent a redundant file to make a profile appear distinct. When hosts consume the same
standard, they should share one installation profile and retain host-specific names only where
they help compatibility or testing.

## Bindings and fail-on-demand tests

**A binding and its enforcing test land in the same commit.** A verifier check without a negative
fixture is incomplete, as is binding prose without a registered detector.

Every check needs a test that mutates one fact in an otherwise-green repository and asserts that
specific detector fires. `test/verify.test.js` shows the pattern: `makeRepo()` builds a green
fixture, `edit()` breaks one fact, and `assertFails(dir, code, note)` confirms the intended failure.

An engineering guideline is advisory:

```yaml
- id: E01-01
  rule: <the practice>
  reason: <why this practice exists>
```

A preference may also name its tradeoff:

```yaml
- id: E12-01
  rule: <the preference>
  reason: <why this preference exists>
  cost: <what choosing this makes harder, slower, or unavailable>
```

`E` entries never appear in `enforcement.yaml`. Product-specific binding belongs in `P`. A generic
practice may move from `E` to `src/cg/principles/architecture.yaml` only when all four facts land
together:

1. violating it would damage graph routing, ownership, boundary structure, or structural truth;
2. one deterministic measurement states pass versus fail;
3. the installed verifier registers a blocking detector; and
4. a negative fixture proves the detector fires.

Assign the next permanent `A` ID and remove the overlapping `E` entry in that same change. Never
renumber or reuse a rule ID. Set names may be renamed, split, or merged because they are routing
labels rather than identities.

Imported guidance must include the case for using it here, its local cost, and a license check.
Prefer a paraphrase with project-specific reasoning over copied prose.

## Building and inspecting the npm package

Never edit `build/` directly. It is a generated, gitignored package target. Build and verify it
with:

```bash
npm run build
npm run build:check
npm run pack
```

`npm run pack` creates `contract-graph-<version>.tgz` from `build/`. The package contains the CLI
under `script/`, the installable assets under `agent/`, `package.json`, `LICENSE`, and this exact
`README.md`; npm therefore renders the same README that is reviewed in the repository. Keep that
file a landing page for people: what the product is, how to install it, and absolute links to
[the public introduction](https://sarada.io/cg/) and the written guides. Relative `docs/` links,
mermaid diagrams, skill protocol, and package-assembly internals do not belong there — the
published tarball does not include `docs/`. The checkout's `bin/cg.js`, authoring `src/` tree,
tests, docs tree, and developer helper are not part of the published artifact.

Before publishing, extract the tarball, run `npm install --omit=dev` in the extract so `yaml` is
available, then smoke-test `cg --version`, greenfield init, brownfield init, incremental profile
addition, existing instructions, an existing docs root, and `cg verify`.

## Publishing

`package.json` `version` is the source of truth; the git tag and npm version follow it. Publish the
tarball produced by `npm run pack`, not the repository root or `build/` directory:

```bash
git status --short
npm test
npm run pack
npm login
npm publish contract-graph-<version>.tgz --access public
```

The working tree must be clean because packing reads files from disk. `npm publish ./build` repacks
the directory, while publishing from the repository root would select the wrong package layout.

## Pull-request evidence and commit expectations

The pull-request description should include:

- the problem and bounded solution;
- affected contracts and user workflows;
- automated commands and outcomes;
- manual scenarios, host and environment details where relevant;
- screenshots or concise transcripts for interactive behavior when they aid review; and
- material AI assistance, including what the agent produced and what the human contributor
  inspected, understood, and tested.

The human contributor remains responsible for the design and evidence. Agent output without
end-to-end review is not validation.

Keep one change per commit where practical. State meaningful costs or tradeoffs in the commit
message, and keep behavior, tests, documentation, and structural truth together.

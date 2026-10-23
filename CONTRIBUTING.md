# Contributing

Contract Graph Dev Kit is an open-source framework for agentic software development, built around repository-native contracts as a graph. Contributions keep the graph, development workflow and verification tools coherent. A contribution is complete when the implementation,
tests, user documentation, and affected YAML contracts tell the same story.

For this repository's implementation, start at the lightweight
[Markdown contract graph](.agent/contract.md), then read the responsible tool group's
contract. Keep its ownership and entry points current alongside changes. These maintainer
contracts describe logical code boundaries; they are not installed into adopting repositories.

## Before opening a pull request

Discuss a large change in an issue before implementing it. This is especially important for a new
editor profile, contract-schema change, lifecycle change, package-layout change, or globally
binding `A` rule. Small fixes, documentation corrections, and focused negative fixtures can go
straight to a pull request.

Keep each pull request focused. A behavior change must update its tests and user-facing
documentation in the same change. If the change alters a governed responsibility, public surface,
invariant, dependency, or route, update the responsible `contract.yaml` too.

Useful contribution areas include:

- contract traversal, routing, graph projections, and verifier diagnostics in `src/runtime/`;
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

For an interactive menu of this repository's activities, run `./urun` on macOS/Linux
or `.\urun.cmd` on Windows. In Windows Command Prompt, `urun` also works from the
repository root. The menu is Node.js; it needs the same Node 18.17+ already required
to develop Contract Graph. Use Up/Down to select, Enter to run, and Escape to go
back or exit. After an activity finishes, Enter returns to the menu that launched it: the
More or Website list after a submenu command, otherwise the main menu. Escape on that prompt leaves the menu.

The menu offers clean and build, clean build and test, a cleaned release tarball, installing the
tarball to this machine, publishing that tarball to npm, and a **More** submenu for build check, editor
fixtures, CLI help, tests without rebuilding, environment checks, and cleaning generated files. The **Website** submenu builds/tests, previews, checks freshness, opens the live site, explains deployment and cleans local Cloudflare state. Use `./urun web build|check|serve [--port N]` for noninteractive website work.
Editor selection uses the existing `npm run try` helper. Replacing an existing editor
fixture, cleaning generated files, installing the release tarball to this machine, and publishing to npm
require a second selection, defaulting to keeping the current state. Packaging asks for a
release version (Enter keeps the current `package.json` value, Escape cancels). When the
version changes it runs `npm version <version> --no-git-tag-version` so `package.json` and
`package-lock.json` update without a git tag, then deletes `dist/build` and `npm run pack` replaces
`dist/tar/contract-graph-<version>.tgz`. Installing the release tarball to this machine uses `npm install -g` with that
tarball, building it first if it is missing. This installs an independent package copy and replaces an existing development link. Later builds or deletion of this checkout do not change the installed command. The `cg` executable may still be a normal npm link to the globally installed copy; it must not resolve into this checkout. To install newer source changes, rebuild the release tarball before selecting install again; an existing tarball is reused. Publish checks `npm whoami`, runs `npm login`
when that fails, then `npm publish dist/tar/contract-graph-<version>.tgz --access public`.
Long-running commands keep their normal terminal output and Ctrl-C behaviour, including npm
login prompts.

This menu is local to Contract Graph. Its two OS launchers call `scripts/urun.mjs`;
there is no Task dependency, global CLI installation, PowerShell requirement, or
repository configuration file. Existing npm commands remain available for CI and
non-interactive terminals. Menu tests run as part of `npm test`.

`npm test` runs tests with temporary files under the gitignored `tmp/tests/run-*` directory
and removes its own run directory after success or failure. This also prevents a host-provided
`TMPDIR` from scattering fixtures across the checkout. Use `npm test -- test/build.test.js`
for a focused run. Direct `node --test` bypasses this scratch-directory isolation. An abruptly
killed process may leave a run directory under `tmp/tests/`; `npm run clean` removes it.

The runtime dependencies are the YAML parser for canonical contracts/catalogs and pinned source parsers for read-only inspection. TypeScript handles JS/TS; Web Tree-sitter plus a pinned WASM distribution supplies Java, Kotlin, Python, Go and C# grammars without adopter toolchains or native compilation. This adds approximately 54 MiB of installed parser dependencies beyond TypeScript/YAML; the WASM distribution contains unused grammars too. Dart/Flutter adds approximately 1.2 MB of vendored WASM from a separately pinned distribution; its Node 26 JavaScript wrapper is not installed or executed. Only the declared adapters are supported. The benefit is repeatable local evidence without executing inspected source. Keep dependencies pinned, preserve notices under `src/runtime/inspection/THIRD_PARTY_NOTICES.txt`, and justify future additions against package cost and supply-chain surface.

`docs/` is written for people. Start with `docs/README.md`, then vision and contracts, then the
relevant contract route. Use `cg contract route --task "<request>"` when the authored routes cover
the request, then descend to the smallest responsible boundary.

Agent procedure lives in `src/skills/` and `src/cg/workflow.md` (installed as
`.agents/cg/workflow.md`). Do not put turn-by-turn skill protocol, `$cg-` hop tokens, or
host-specific hook JSON in `docs/` or in `README.md`. The README is the npm and GitHub landing
page; written guides live in `docs/` and on [contractgraph.dev](https://contractgraph.dev/).

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

## README diagram

The README embeds the hosted [composition spine SVG](https://contractgraph.dev/assets/contract-graph-composition-spine.svg) maintained by the product website. Keep the absolute image URL so npm readers do not require Mermaid rendering. Check the image loads and remains readable when updating its URL.

## Sprint interaction validation

Exercise mixed Features/Bugs/Tasks with batch review and per-item review, an unanswered decision with independent work, interruption/recovery, and a failed finishing check that returns to production repair. Preserve actual review responses and checks; fixture success does not establish model behavior or user satisfaction. A recorded 2026-09-06 trial exercised the retired 0.6.0 Manager/Engineer workflow with synthetic owner input and mixed-host recovery. It is historical evidence only: its observer tools are retired, and it does not validate the current lifecycle or establish token savings. The original report remains in Git history.

For skill-entry changes, exercise a bare invocation with one selected outcome, ambiguous outcomes, a missing target, a failed preview launch, feedback that changes a known boundary, retained always-E policy, unchanged-intent reseed and scoped sign-off recovery. Check contract descent before source reading, reuse of actual answers, preview presentation before acceptance, and preservation of required adoption/final checks. For independent agent trials, record time to usable preview or first useful action, source reads before that action, unrelated reads and redundant questions. Report static walkthroughs, scaffold/upgrade tests and live host trials separately; instruction assertions do not establish an agent's behavior or token savings.

Measure request-to-first-preview, feedback-to-next-preview, time to acceptance and final delivery, discarded automation and reopened defects when evaluating a live workflow. Separate agent work from human wait and disclose host, scope and environment differences. Do not claim speed, cost or reliability improvements from fixture success.

## Schema and migration validation

Use independent historical fixtures, not fixtures generated by reversing the new implementation. Check schema/runtime agreement with valid catalogs and invalid field mutations, then test semantic authority, detector registration and reference integrity separately. For migration, compare authored IDs, statements, comments and preserved repository policy; inject backup, replacement, rollback and concurrent-edit failures. Verify repeat runs and missing-rationale behavior without inventing product meaning.

`test/principles.test.js` and `test/build.test.js` cover these boundaries. `node scripts/check-principles-mutations.mjs` deliberately introduces behavioral regressions; a syntax failure is not a successful detection. Package checks must exercise an extracted tarball with only runtime dependencies and no source-tree fallback. Check the supported Node.js minimum for compatibility changes. Coverage percentages support these checks but do not prove correctness; bundled schema checks do not establish that the public schema URL serves matching bytes.

## Contract inspection validation

`test/contract-inspection.test.js` and `test/language-inspection.test.js` use independently authored source fixtures under `test/fixtures/contract-inspection/` to check exact exports/imports, unsupported forms, explicit uncertainty, recursive ownership, stale snapshots and byte-preservation. Changes to extraction must include positive and negative behavior cases, not only report snapshots or instruction wording checks. Keep the report protocol separate from the canonical contract schema, and never infer architectural edges from import syntax. A scripted authoring exercise tests consumption of supported facts; it is not evidence of improved model reliability.

Source parsers are pinned production dependencies loaded only by `contract inspect`. Validate the extracted package with production dependencies, without source-tree or adopter-parser fallback, and run every language adapter on Node 18.17. Preserve parser/grammar identities and hashes in reports. Test mixed-language input, language-specific visibility, malformed syntax, dynamic/conditional/generated APIs, non-execution and byte-preservation; a recognisable extension alone is not language support. For Dart, preserve `grammars/dart.json` provenance and verify its binary hash; update the vendored WASM and upstream/distribution notices together. Test Flutter widget syntax, library privacy, conditional/deferred imports, exports/parts, pubspec discovery and generated-code limitations. Build/test validation must use a disposable copy when global `cg` points into the checkout. Inspect test side effects first: the `urun` suite contains a temporary-prefix npm link/install test. If global installation is prohibited even in a temporary prefix, filter that test explicitly and disclose the omission. Never validate through a live global install or adopter update.

The opt-in Dart manifest diagnostic has independent workspace/path fixtures in `test/dependency-check.test.js`. Verify positive and deliberately missing/reversed edges, grouping and graph-only asymmetry, development dependencies, external same-name packages, unsupported resolution and stale fingerprints. Runtime and minimum-Node tests must preserve non-execution and byte-identical inputs. Extracted-package smoke should exercise `contract dependencies --ecosystem dart` without an adopter toolchain. It is a manifest correspondence diagnostic, not a new global structural rule or source-import checker.

## Installation scenarios

Initialization changes must cover all four scenarios below. Use throwaway repositories; never run
destructive test helpers against a working project.

| Scenario | Expected result |
|---|---|
| Greenfield | `cg init` installs the starter `src` contract, selected discovery adapters, docs trees, skills, and versioned profile metadata; `cg verify` passes. |
| Brownfield | Existing source is preserved. A repository without `src/` does not gain an invented one. Unmapped roots name `/cg-warmup` (adoption); an already-connected graph names `/cg-warmup` (reseed). |
| Existing instructions | Existing `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` content survives. The user is warned before the selected files receive a generated first-line pointer. |
| Existing docs folder | Init reuses the saved docs root. Without saved settings, interactive init asks whether to reuse `docs/`; non-interactive init requires an explicit `--docs docs` or another single-directory root. Existing files are preserved. |

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

The hook uses `cg` on `PATH`; `CG_BIN` is an explicit development/test override. It does not prefer a repository npm dependency. When an installed build identity is recorded, failure to obtain or match that identity blocks dispatch. Legacy installations without that identity can fail open with a NOT GATING warning, so confirm `cg --version` in the hook environment before relying on it. Other hosts do not use this file.

## Source layout

```text
bin/cg.js       source checkout CLI launcher
scripts/        repository-only maintenance tools and editor fixtures
src/runtime/    CLI composition plus installation, graph, inspection, delivery,
                verification and distribution owner directories
src/skills/cg-*/ lifecycle skills → .agents/skills/cg-*/
src/skills/experts/ domain skills → .agents/skills/<name>-expert/
src/cg/         authored Contract Graph core → .agents/cg/
src/install/    hooks, profiles, and preserved templates used by init
test/           behavior, negative fixtures, package, and scaffold coverage
```

`src/cg/` contains `contract.yaml`, `workflow.md`, `experts.md`, `phases.json`, `enforcement.yaml`,
`principles/`, `guidelines/`, and `schema/`. `src/install/templates/` holds the starter module and
the `docs/{plans,decisions,guides,manuals}` trees. Profile configurations live in
`src/install/profiles/` and are packaged for the CLI, but are not copied into an adopting
repository.

First-party JavaScript modules start with a short JSDoc block containing `@file` for their
specific purpose and `@see` for the relative owning Markdown contract. Place it after a shebang
when present. Use the same convention for runtime modules, maintenance scripts, the installed
hook, test suites and authored test helpers. Retain useful invariant explanations beside the
implementation. Leave parser-input fixtures, frozen historical readers, vendored assets and
generated package copies untouched; no documentation generator or parameter-annotation rollout
is required.

## Changing the scaffold

`SCAFFOLD_MAPPING` in `src/runtime/installation/init.js` is the executable source of truth for what `cg init`
writes. Every consumer-facing source must match exactly one mapping rule.

Each rule has an ownership policy:

- `replace` is framework-owned and may be updated by a later `cg init`;
- `preserve` becomes repository-owned after installation and is written only when absent;
- init separately refreshes A/E with backups and migrates existing product catalogs, accepting
  explicit missing rationale through `--reasons`; known legacy contract/enforcement schema URLs
  are updated without changing their authored content; and
- generated discovery artifacts are regenerated by `cg sync` from the selected profiles.
  Module `AGENTS.md` / `CLAUDE.md` pointers follow that same selection; adding a profile copies
  an existing module pointer rather than inventing a second body.

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
  statement: <the practice>
  reason: <why this practice exists>
```

A preference may also name its tradeoff:

```yaml
- id: E12-01
  statement: <the preference>
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

Release metadata contains only the Windows npm `postinstall` hook, not maintainer scripts. It corrects verified global Windows wrappers; local/source/link installs and non-Windows hosts are no-ops. Serialize installs into a shared prefix: immediate path/content rechecks cannot provide an atomic lock against another installer.

Git keeps authored text LF across contributor platforms; skill parsing also accepts existing CRLF content without rewriting it. Build drift checks compare bytes on Windows and compare POSIX mode bits only on hosts that represent them. Two POSIX shell PATH admission fixtures are skipped on Windows and remain covered by Ubuntu CI; the Windows package job validates npm and PowerShell launching separately and does not establish optional Claude hook PATH admission.

On Windows, set `CG_WINDOWS_LIFECYCLE=1` in the process environment and run `npm test -- test/windows-npm.test.js` for real-package lifecycle validation. It uses temporary prefixes and projects, tests Restricted Windows PowerShell 5.1 and PowerShell 7, and leaves the live global installation untouched. Set `CG_PWSH` to PowerShell 7's executable when it is not on PATH. The test covers installation, replacement, rebuild, uninstall, script-disabled fallback, CLI errors and initialization/verification. The harness loads PowerShell's security module before imposing Restricted policy in its disposable process; it changes no persistent execution policy.

Never edit `dist/build/` directly. It is a generated, gitignored package target. Build and verify it
with:

```bash
npm run build
npm run build:check
npm run pack
```

`npm run pack` creates `dist/tar/contract-graph-<version>.tgz` from `dist/build/`.
`dist/build/` is the assembled package; `dist/tar/` holds release archives. The entire `dist/` tree is
gitignored and removed by `npm run clean`. Normal builds replace only `dist/build/`,
preserving archives in `dist/tar/`. The package contains the CLI
under `script/`, the installable assets under `agent/`, `package.json`, `LICENSE`, and this exact
`README.md`; npm therefore renders the same README that is reviewed in the repository. Keep that
file a landing page for people: what the product is, how to install it, and absolute links to
[the public introduction](https://contractgraph.dev/) and the written guides. Relative `docs/` links,
skill protocol and package-assembly internals do not belong there — the
published tarball does not include `docs/`. The checkout's `bin/cg.js`, authoring `src/` tree,
tests, docs tree, and developer helper are not part of the published artifact.

Before publishing, extract the tarball, run `npm install --omit=dev` in the extract so `yaml` is
available, then smoke-test `cg --version`, greenfield init, brownfield init, incremental profile
addition, existing instructions, an existing docs root, and `cg verify`.

## Publishing

`package.json` `version` is the source of truth; the git tag and npm version follow it. `./urun`
**Clean, Build Release Tarball** can set that version before packing. Publish the tarball produced by
`npm run pack`, not the repository root or `dist/build/` directory:

```bash
git status --short
npm test
npm run pack
npm login
npm publish dist/tar/contract-graph-<version>.tgz --access public
```

The working tree must be clean because packing reads files from disk. `npm publish ./dist/build` repacks
the directory, while publishing from the repository root would select the wrong package layout.
`./urun` can run the same tarball build, global install, login, and publish steps from the menu.

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

Pre-adoption diagnostics live in `src/diagnostics/` and ship under `agent/diagnostics/`. They are deliberately excluded from repository scaffolding. Validate prompt preparation with `test/analyse.test.js` and package-only resource availability with `test/build.test.js`.

### Owner decision review validation

For communication changes, walk through a material product choice, an already-authorized choice, a routine reversible implementation choice, and a completed scope with shared pending evidence. Check that only the material unresolved choice reaches the owner, with Context/background, Options, Recommendation and Why. The review stays in the central human inbox, compact evidence lives in `.agents/cg/decisions/`, the actual answer survives cleanup, and pending/shared work is preserved. A passing framework check must be described by what it actually checks, not as proof of product behavior. Template validation alone does not demonstrate model behavior; report whether these were static walkthroughs or independent agent trials.

### Colocated maintainer contracts

Start at `.agent/contract.md`, then follow the owner contract beside its source: `src/runtime/<owner>/.agent/contract.md` or `src/skills/.agent/contract.md`. Website work continues through [web/.agent/contract.md](web/.agent/contract.md), its publication/operations children and the selected shell, page, presentation, interaction or static-resource boundary. One `src/skills/.agent/` covers all lifecycle and expert skills, including their references, assets and host metadata; individual skills do not get separate maintainer contracts. Create deeper contracts only for distinct responsibility boundaries, not every folder. JSDoc `@see` links point to the local owner. Move an existing contract rather than duplicate its promises centrally.

Run `npm run check:maintainer` for a dependency-free check of local contract links, parent
backlinks, root reachability and runtime/script/launcher ownership pointers. `npm test` includes
the check and negative fixtures. It checks navigation, not whether the prose promises match
implementation; that remains part of review. This tool is repository-only and does not change
consumer YAML validation or installed assets.

Build, runtime identity and source-checkout init exclude `.agent/` entries recursively. These maintainer contracts do not ship, affect build identity or install into adopter repositories. The shipped `agent/` package tree and installed `.agents/cg/` YAML governance remain unchanged. Keep the three exclusions aligned and cover source/package equivalence when changing them.

## Website target and shared sources

The same checkout builds the npm artifact and the static website. Website implementation and local operations live under [web](web/README.md), governed by [its maintenance contract](web/.agent/contract.md). Run `npm ci` once at the root, then `npm run web:build` for assembly and all website tests, `npm run web:check` for freshness, or `npm run web:serve` for local review. The existing npm test/build/pack commands retain their package target; only `web/public/` is served by the website.

Human guides selected by the marked public table in `docs/README.md` are rendered directly into the website. A new guide needs its Markdown file and one index row; a shared template generates its page, discovery card and sitemap entry without per-guide website files. Unlisted Markdown and subdirectories are not discovered. Root `./urun` (`urun.cmd` on Windows) owns both maintenance menus, with `./urun web build|check|serve` for noninteractive website work. Schema payloads come directly from `src/cg/schema/`, including legacy URL aliases. Keep old anchors and update derived diagram presentations plus their source hashes when Mermaid blocks change. After shared-content edits, verify generated links and both build targets. Website dependencies belong in devDependencies and must support Node 18.17+; never add them to the shipped library's dependency surface.

Website source was imported as a reviewed snapshot, without the old repository's installed governance, internal receipts or Git history. Scholarly paper sources and their original attribution and licences are maintained separately by Sarada. [web/DEPLOY.md](web/DEPLOY.md) describes the active GitHub Actions publisher, required platform configuration, verification and rollback. Successful current `main` pushes publish the website only after all Linux, Windows and public-source checks pass; pull requests only validate. Merging to `main` is the website publication decision, so keep guidance aligned with the released npm package or clearly identify upcoming capabilities. Tests and builds do not deploy on their own, and npm publication remains separate.

## Public repository safety

Every committed source file is publicly readable, even if excluded from the website and npm outputs. Keep credentials in ignored local environment files or CI/hosting secret stores. Do not commit private delivery receipts, installed local governance, personal filesystem paths, account exports or working reports. Do not import another repository's full history without reviewing it for sensitive content. The authored module contract template under `src/install/templates/` remains a legitimate distribution input.

Run `npm run check:public` before staging or publishing. It examines tracked and non-ignored untracked candidate files, including staged ignored files, and rejects private filenames/records, local-machine metadata and basic credential patterns without printing matched values. CI additionally uses pinned Gitleaks with redacted diagnostics over Git history and the checkout. Neither check proves that all sensitive information is absent; review new content, binary assets and proposed imports. Git ignore rules do not remove previously committed data. If a real credential was published, revoke or rotate it before coordinating any history cleanup; do not paste it into a public issue or pull request.

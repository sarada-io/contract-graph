# Distribution contract

Parent: [repository](../../../../.agent/contract.md). Owns reproducible package assembly, executable identity and
maintainer development/release tooling.

## Surface and implementation

- [build.js](../build.js): `cg build`, package mappings, hashes and `--check`.
- [runtime.js](../runtime.js): executable identity and installation mismatch checks.
- [windows-launcher.js](../windows-launcher.js): packaged Windows global npm postinstall; removes only matching npm-generated `cg.ps1` after verifying `cg.cmd`, CLI ownership and unredirected paths. Local installs, source checkouts and development links are no-ops; uncertain ownership warns without removal, and removal failure fails the hook. No policy, PATH or adopter changes.
- [package.json](../../../../package.json), [package-lock.json](../../../../package-lock.json): exports,
  runtime dependencies, supported Node version and npm commands.
- [try-editor.mjs](../../../../scripts/try-editor.mjs): `npm run try`, editor development fixtures; repository-only and outside the packaged runtime.
- [urun.mjs](../../../../scripts/urun.mjs), [urun](../../../../urun), [urun.cmd](../../../../urun.cmd): single local maintainer menu for npm and website operations, including `./urun web build|check|serve`. Website commands reuse [Operations](../../../../web/scripts/.agent/contract.md); they never publish or install the CLI.
- [test.mjs](../../../../scripts/test.mjs): test runner scratch isolation;
  [check-principles-mutations.mjs](../../../../scripts/check-principles-mutations.mjs): mutation validation harness.
- [check-maintainer-contracts.mjs](../../../../scripts/check-maintainer-contracts.mjs):
  `npm run check:maintainer`, repository-only Markdown links, reciprocal parent links, root
  reachability and runtime/script/launcher `@see` targets. Covered by
  [maintainer-contracts.test.js](../../../../test/maintainer-contracts.test.js) in `npm test`;
  no consumer graph validation or semantic architecture enforcement.
- [ci.yml](../../../../.github/workflows/ci.yml): CI orchestration of tests, package checks and the reusable public-source workflow. Its main-only website deployment waits for all checks and uses the Website owner's build/configuration;
  assertions and fixtures remain with the behavior's owner.
- [check-public-source.mjs](../../../../scripts/check-public-source.mjs): dependency-free check of candidate public file names, private working records (including all ignored maintainer plans), local-machine paths and obvious credential patterns. [security.yml](../../../../.github/workflows/security.yml), called by CI on pull requests and main pushes, also runs pinned Gitleaks over history and the checkout with redacted diagnostics; no detector proves the absence of all sensitive information.

Package `src/diagnostics/` as `agent/diagnostics/`, include it in runtime identity, and keep it outside Installation’s scaffold mappings. The portable skill is available for user-level harness installation without configuring a harness or changing a target repository.

## Boundary promises

Exclude every `.agent/` entry from recursively packaged source trees. Maintainer contracts and local agent guidance stay beside source but do not enter the tarball or build manifest. Runtime identity skips the same entries, so maintainer-only edits do not invalidate installed builds. Keep shipped singular `agent/` assets and adopter `.agents/` governance distinct from this exclusion.

The complete release target is `dist/build`; generated output is not the source of truth.
The [website](../../../../web/.agent/contract.md) is an independent build target at `web/public/`. Website source, build-only dependencies and internal records never enter the npm allowlist. Preserve that separation when changing package mappings or root scripts. Both targets share canonical schema definitions; only the website renders human guides. Scholarly sources are maintained separately in Sarada's research archive.
Map `src/runtime/` recursively to packaged `script/`, retaining owner directories. The installed
CLI stays at `script/cli.js`; `contract-graph` and `contract-graph/contracts` export
`script/graph/contracts.js`. Windows postinstall runs `script/distribution/windows-launcher.js`.
Source and package runtime identity use the same relative runtime tree; maintainer tools are
outside both that tree and the published package.
Build drift checks compare bytes on every platform and POSIX permission bits where supported; Windows cannot represent those executable permission bits. Git keeps authored text LF for consistent package inputs and literal fixtures across platforms.
Package project-context.md under `agent/cg/` so Installation can preserve it alongside the root contract.
Consume [Authoring](../../../skills/.agent/contract.md)'s assets, [Verification](../../verification/.agent/contract.md)'s catalog validation
and the runtime files owned by the other children. Preserve Node.js 18.17+ compatibility.

Build assembles a release; [Installation](../../installation/.agent/contract.md) applies that release to an adopter.
Neither build nor a maintainer helper may introduce a parallel repository-upgrade path.
Runtime identity is consumed by Installation and [Delivery](../../delivery/.agent/contract.md), not evidence of human
acceptance or proof that a running agent has reloaded instructions.

Runtime identity includes the module starter template because discovery rendering reads it. Build validates authored catalogs and registered source filenames without a compiler-output pipeline; the published manifest and CLI retain the `principles` compiler entry with an empty output list for compatibility.

Before builds or destructive cleanup, resolve global `cg`. If it points into this checkout's
`dist/build`, or resolution is uncertain, validate in a disposable copy. Tests of the maintainer
menu can clean/build too. Do not globally install, publish or update adopters during ordinary
validation; those are separately requested release actions.

Verification: `npm test -- test/build.test.js test/runtime.test.js test/urun.test.js`, then
`npm test`. Package changes also require `npm run pack`, tarball inspection and an extracted-package
smoke test. Use [CONTRIBUTING](../../../../CONTRIBUTING.md) for the exact validation workflow.

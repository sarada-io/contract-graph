# Distribution contract

Parent: [repository](README.md). Owns reproducible package assembly, executable identity and
maintainer development/release tooling.

## Surface and implementation

- [build.js](../../src/scripts/build.js): `cg build`, package mappings, hashes and `--check`.
- [runtime.js](../../src/scripts/runtime.js): executable identity and installation mismatch checks.
- [package.json](../../package.json), [package-lock.json](../../package-lock.json): exports,
  runtime dependencies, supported Node version and npm commands.
- [dev.js](../../src/scripts/dev.js): `npm run try`, editor development fixtures.
- [urun.mjs](../../scripts/urun.mjs), [urun](../../urun), [urun.cmd](../../urun.cmd): local maintainer menu.
- [test.mjs](../../scripts/test.mjs): test runner scratch isolation;
  [check-principles-mutations.mjs](../../scripts/check-principles-mutations.mjs): mutation validation harness.

## Boundary promises

The complete release target is `dist/build`; generated output is not the source of truth.
Consume [Authoring](authoring.md)'s assets, [Verification](verification.md)'s catalog validation
and the runtime files owned by the other children. Preserve Node.js 18.17+ compatibility.

Build assembles a release; [Installation](installation.md) applies that release to an adopter.
Neither build nor a maintainer helper may introduce a parallel repository-upgrade path.
Runtime identity is consumed by Installation and [Delivery](delivery.md), not evidence of human
acceptance or proof that a running agent has reloaded instructions.

Before builds or destructive cleanup, resolve global `cg`. If it points into this checkout's
`dist/build`, or resolution is uncertain, validate in a disposable copy. Tests of the maintainer
menu can clean/build too. Do not globally install, publish or update adopters during ordinary
validation; those are separately requested release actions.

Verification: `npm test -- test/build.test.js test/runtime.test.js test/urun.test.js`, then
`npm test`. Package changes also require `npm run pack`, tarball inspection and an extracted-package
smoke test. Use [CONTRIBUTING](../../CONTRIBUTING.md) for the exact validation workflow.

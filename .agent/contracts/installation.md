# Installation contract

Parent: [repository](README.md). Owns adoption and refresh of an installed CG release in a
target repository, including editor integration and upgrade recovery.

## Surface and implementation

`cg init` is the sole installation and upgrade entry point. CLI orchestration previews the
plan, obtains confirmation, applies init, then runs sync and verification when migration is ready.

| Component | Owned implementation |
| --- | --- |
| Scaffold mapping, file ownership, replacement, preservation and retirement | [init.js](../../src/scripts/init.js) |
| Catalog refresh, schema-identity updates, backups and apply rollback | [init-catalogs.js](../../src/scripts/init-catalogs.js) |
| Legacy catalog format conversion | [migrate-principles.js](../../src/scripts/migrate-principles.js) |
| Derived agent pointers and editor discovery (`cg sync`) | [sync.js](../../src/scripts/sync.js) |
| Profile configuration and selection (`cg profiles`) | [profiles.js](../../src/scripts/profiles.js), [profile data](../../src/install/profiles/) |
| Interactive selection | [picker.js](../../src/scripts/picker.js) |
| Installed host admission hook | [cg-gate.mjs](../../src/install/hooks/cg-gate.mjs) |

## Boundary promises

- Release-specific upgrades extend init's existing preview, confirmation, backup, preservation
  and retirement path. Do not add `cg upgrade` or a standalone release-upgrade script.
- `cg migrate-principles` already exists as a format-only conversion surface. It preserves
  local catalog content; it does not own release installation or replace the init workflow.
- Preserve repository-owned content and missing product rationale. Report incomplete migration
  honestly. Catalog rollback does not make the whole init/sync/verify sequence transactional.
- Sync regenerates derived artifacts; it does not become a second installer.

Consumes [Distribution](distribution.md)'s package layout/identity, [Verification](verification.md)'s
catalog loaders and pointer renderers, [Graph](graph.md)'s YAML operations, and
[Authoring](authoring.md)'s assets. The hook consumes [Delivery](delivery.md)'s admission decisions.
Changes to preserved policy or installed content also route to the relevant sibling.

Verification: `npm test -- test/init-upgrade.test.js test/sprint-retirement.test.js test/verify.test.js`,
then `npm test`. Profile changes also need the real-host checks in
[CONTRIBUTING](../../CONTRIBUTING.md). Release behavior belongs in [docs/upgrade.md](../../docs/upgrade.md).

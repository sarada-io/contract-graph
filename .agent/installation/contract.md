# Installation contract

Parent: [repository](../contract.md). Owns adoption and refresh of an installed CG release in a
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
| Profile configuration and selection (`cg profiles`) | [profiles.js](../../src/scripts/profiles.js), [profile data](../../src/install/profiles) |
| Interactive selection | [picker.js](../../src/scripts/picker.js) |
| Installed host admission hook | [cg-gate.mjs](../../src/install/hooks/cg-gate.mjs) |

## Boundary promises

### Where an init or upgrade change belongs

| Change | Existing seam to edit |
| --- | --- |
| What gets installed, replaced or preserved | `init.js`: `SCAFFOLD_MAPPING`, `copyFile`, `applyMappingRule`, `scaffoldFiles` |
| Greenfield versus brownfield starter selection | `init.js`: `shouldScaffoldModule`, `clearStarterComposition` |
| Retire a known framework artifact on upgrade | `init.js`: `retireSkills`; preserve ownership checks and backups |
| Order of installation, saved profile selection and manifest updates | `init.js`: `init`, `writeManifest` |
| Retained phase-policy differences after an upgrade | `init.js`: `retainedPhaseNotices`; `init` returns `policyNotices`, and CLI preview displays them without rewriting policy |
| Preview catalog refresh or schema-identity migration | `init-catalogs.js`: `planInitCatalogs` |
| Apply catalog changes with stale-input protection, backups and rollback | `init-catalogs.js`: `applyInitCatalogs` |
| Convert legacy catalog syntax while retaining authored rules | `migrate-principles.js`: `migratePrinciples`, called by catalog planning |
| Prompts, `--check`, confirmation and post-init sync/verify | [cli.js](../../src/scripts/cli.js): init branch of `main`, `chooseDocsRoot`, `chooseProfiles` |

`init.js` owns the installation sequence. `init-catalogs.js` and
`migrate-principles.js` are existing collaborators inside this owner, not alternative upgrade
workflows. Extend the relevant seam for the next release. A helper extraction must remain
called through init, preserve preview/apply behavior, and be recorded in this table.

### Installation flow

CLI selection and preview → `init(..., { dryRun: true })` → confirmation →
`init(...)` → sync and verification when migration is ready. Within init, catalog planning
and application use the catalog helper; scaffold mapping and retirement stay with init.
Keep dry-run results useful for review and preserve the existing missing-rationale outcome.

- Release-specific upgrades extend init's existing preview, confirmation, backup, preservation
  and retirement path. Do not add `cg upgrade` or a standalone release-upgrade script.
- `cg migrate-principles` already exists as a format-only conversion surface. It preserves
  local catalog content; it does not own release installation or replace the init workflow.
- Preserve repository-owned content and missing product rationale. Report incomplete migration
  honestly. Catalog rollback does not make the whole init/sync/verify sequence transactional.
- Init scaffolds `.agents/cg/project-context.md` only when absent and preserves repository-authored context and its approval record on subsequent runs.
- Sync regenerates derived artifacts; it does not become a second installer.
- Preview and apply report retained retired stages, absent optional phase entries and conditional/missing E loading. These notices do not change `--check`'s file-drift exit semantics, force E adoption or claim workflow reconciliation; malformed policy still fails ordinary verification.

Consumes [Distribution](../distribution/contract.md)'s package layout/identity, [Verification](../verification/contract.md)'s
catalog loaders and pointer renderers, [Graph](../graph/contract.md)'s YAML operations, and
[Authoring](../authoring/contract.md)'s assets. The hook consumes [Delivery](../delivery/contract.md)'s admission decisions.
Changes to preserved policy or installed content also route to the relevant sibling.

Verification: `npm test -- test/init-upgrade.test.js test/sprint-retirement.test.js test/verify.test.js`,
then `npm test`. Profile changes also need the real-host checks in
[CONTRIBUTING](../../CONTRIBUTING.md). Release behavior belongs in [docs/upgrade.md](../../docs/upgrade.md).

# Upgrade

Install or refresh Contract Graph Dev Kit through the `contract-graph` package and `cg init`. The product name does not change package names, commands or repository paths.

## Upgrade to 0.7.0

Install the intended 0.7.0 CLI first. Once published, use `npm install --global contract-graph@0.7.0`; for an unpublished release, install its independently packed tarball. The repository upgrade does not fetch a package or change the global CLI.

Stop active coding agents and finish or checkpoint their work before upgrading. Completing every open plan is not required: existing roadmaps, prepared queues, decisions and delivery receipts are preserved. Old auto-run sessions are not automatically converted; reload skills, confirm intent through warmup if needed, and reconcile repository-owned workflow and phase policy before resuming the recorded scope with the new skills.

```bash
cd <your-repository>
cg --version --json
cg init --check
cg init --yes
```

`--check` previews without writes and exits 1 when changes are needed. Omit `--yes` for interactive confirmation. Saved docs roots and profiles are reused; older installations without saved choices can supply `--docs` and `--profile`. `cg init` is the sole entry point for both first adoption and upgrades; no separate upgrade command or script is needed.

The upgrade reuses init: current lifecycle skills and the four experts go into `.agents/skills/`, shared attribution goes alongside them, selected editor discovery wrappers and hooks are refreshed, and repository-owned context is preserved. Known framework-owned `cg-prepare` and `cg-auto-run` files and obsolete sign-off references are backed up under `.agents/cg/backups/retired-0.7.0/` before removal. Custom files and unknown legacy artifacts are not recursively deleted. Older principle schemas use the migration described below; missing product rationale requires owner input and leaves the upgrade incomplete. Successful migration runs sync and verification. Review the diff before resuming work.

## Source-assisted contract inspection

The 0.7.0 CLI includes `cg contract inspect` for JavaScript/TypeScript ESM, Java, Kotlin, Python, Go, .NET/C# and Dart/Flutter. It produces read-only evidence and proposed field values; it does not migrate or overwrite authored contracts. There is no contract-schema change or new adoption command. Re-run `cg init` through the existing preview/confirmation flow to refresh the authoring skills, then follow the [inspection guide](contracts.md#inspect-implementation-facts-before-authoring). Reports separate unknowns, language visibility and implementation imports from architectural promises. The packaged parsers require no adopter toolchains; unsupported syntax stays explicit.

## Intent approval and sprint delivery

Project intent lives in preserved `.agents/cg/project-context.md` alongside the root contract. After init, use `/cg-warmup` to draft context from repository documentation and confirm it with the owner. Fresh installations receive a draft rather than approval and are not delivery-ready merely because `cg verify` passes. Init preserves existing project context and `.agents/cg/intent.json`; changed context or binding sources require renewed review. See [intent approval](intent.md).

New plans use the sprint delivery path described in [workflow](workflow.md). Existing unmarked roadmaps, prepared queues and delivery records retain their formats and history. Re-init preserves `.agents/cg/workflow.md` and phase policy: review any deliberate stage restrictions before adopting automatic sprint completion. Do not discard existing policy or rename an in-flight roadmap to bypass it. The executable and refreshed skills must still have matching build identity.

## Update an existing repository with cg init

Install the intended CLI build, then run init in your adopting repository. For an unpublished
0.7.0 build, run `npm run pack` in the Contract Graph checkout, then
`npm install --global ./dist/tar/contract-graph-0.7.0.tgz`.

```bash
cd <your-repository>
cg --version --json
cg init --check --docs docs
cg init --yes --docs docs
cg verify
```

Keep your existing docs root and profiles. `--check` previews without writing and returns 1
when an update is needed. Without `--yes`, init asks before replacing existing files.

Init now performs the upgrade itself:

| File | Upgrade behavior |
| --- | --- |
| Skills, hooks, schemas | Refresh from the installed release |
| `architecture.yaml`, `engineering.yaml` | Back up the previous files, then install release defaults |
| `product.yaml` | Convert legacy format, retaining IDs, statements, groups, and comments |
| Contracts and enforcement | Preserve content; update only known legacy schema URL declarations |
| Workflow, phase policy, docs | Preserve repository choices |

Backups for updated catalogs and schema declarations are stored under
`.agents/cg/backups/init/<content-hash>/`. Repeated unchanged init runs do not add backups.
Review backed-up A/E amendments before reapplying them; init refreshes those catalogs rather
than merging local preferences into the release. Catalog changes are staged together with
rollback on an apply failure. Init as a whole is not a filesystem-wide transaction; a later
sync or verification failure is reported for correction.

For the usual interactive upgrade, run `cg init`, reload editor skills, then invoke
`/cg-warmup` in your coding agent. Keep the saved docs root and profiles.

Legacy product rules may lack the `reason` required by the new schema. Init updates installed
files but leaves that product catalog byte-identical. It names the missing IDs and directs you
to `/cg-warmup`. Sync and verification are deferred, and init returns exit code 1 to signal an
incomplete upgrade. Repeating init retains the same handoff until the reasons are resolved.

Warmup examines existing rules, contracts, implementation, and recorded decisions, proposes
rationale for your confirmation, then prepares the migration input itself and finishes init,
sync, and verification. You do not need to write JSON. It continues into adoption or reseed
after the upgrade. Missing rationale is never replaced with invented placeholder policy.

For automation or already-prepared rationale, `cg init --yes --reasons reasons.json` remains
available. Malformed catalogs and invalid supplied reasons still block writes.

An empty legacy product catalog needs no rationale input. Already-current valid product catalogs
remain byte-identical; omit the reasons file on later runs. Unknown fields or schema identities
block conversion rather than dropping content. The older
`https://sarada.io/contract-graph/schema/` catalog identities are recognized, and known v1
contract/enforcement `$schema` values are updated to the canonical host without reformatting
the rest of those files. Init never rewrites rule IDs, graph edges, or verification commands.

After verification, review the Git diff and reload the editor's skills. The new skills do not
automatically replace your repository-owned workflow; see the workflow retirement section below.

## Shared principles format

Architecture, engineering, and product now use
`https://contractgraph.dev/schema/principles-v1.schema.json`. This is a new catalog format,
not just a URL replacement. Contract and enforcement keep their existing v1 formats and IDs.

| Catalog | Fixed family / binding | Conversion |
|---|---|---|
| Architecture | `architecture` / `global` | `architectureVersion` → `principlesVersion`; `rules` → `principles`; `rule` → `statement`; add `reason` |
| Engineering | `engineering` / `advisory` | `engineeringVersion` → `principlesVersion`; `rule` → `statement`; preserve `reason` and `cost` |
| Product | `product` / `scoped` | `productVersion` → `principlesVersion`; `text` → `statement`; add `reason` |

All catalogs use `principlesVersion: "1.0"`. A IDs and detector registrations, E/P group IDs,
leaf IDs, categories, and product enforcement references are retained. Architecture keeps
`scope`, `promise`, `promotion`, `hierarchy`, and `graph` in the same file. Those protocol fields
are unavailable on engineering and product catalogs. Optional `cost` is supported only on advisory E leaves. A/P catalogs containing `cost`
are rejected; migration never silently drops it. Move that explanation into the rationale or a
repository decision record deliberately before retrying.

For a separate format-only migration that retains local A/E content instead of refreshing
release defaults, use `cg migrate-principles`. This remains available independently of init:

```bash
cg migrate-principles
cg migrate-principles --json
```

Preview writes nothing. It reports every missing reason and returns non-zero until all proposals
validate. Legacy architecture and product entries did not require rationale: the tool cannot
recover the author's intent from a statement. Supply a JSON object containing only the missing
IDs and their actual rationale, for example:

```json
{
  "A03": "One owner per boundary makes the route for a responsibility unambiguous.",
  "P01-01": "This product's billing provider accepts amounts in integer minor units."
}
```

This is an illustrative subset; supply every ID reported for your repository. Existing reasons
are preserved. Unknown or unnecessary reason keys are rejected to catch typos. Review the proposed
YAML and apply explicitly:

```bash
cg migrate-principles --reasons /path/to/reasons.json --json
cg migrate-principles --reasons /path/to/reasons.json --write
cg verify
```

Use your existing docs root and profiles. `--reasons` paths are relative to the shell's working
directory. Each converted file gets a byte-for-byte `<file>.pre-principles-v1.bak` backup. The
conversion preserves authored values, comments, and IDs; YAML whitespace may change. All three
catalogs are checked before writing any conversion. Unsupported versions, unknown fields,
ambiguous partial conversions, missing reasons, and unregistered detectors prevent application.
Already-converted files are validated and left byte-identical. Repeating the command without a
reasons file is a no-op after successful conversion. Existing backup files are never overwritten.

If a write fails, the tool attempts to restore files it already replaced and retains the original
backups. If restoration also fails or another writer has edited a replaced file, the error names
the file and backup; JSON output lists it in `recoveryRequired`. Preserve any concurrent edits,
recover those files deliberately, and preview again before retrying. Do not continue to init
while recovery is required. A process crash or power loss can interrupt a multi-file conversion;
the backups support recovery, but conversion is not a filesystem-wide transaction.

The standalone migration retains local A/E content and therefore requires deliberate authoring
if its old architecture protocol lacks required fields. Init instead refreshes A/E from the
release and migrates product rules. Malformed catalogs or invalid supplied rationale block before writes. Missing product rationale instead preserves the original product catalog while refreshing installed files, then defers sync/verification and returns an incomplete-upgrade result for warmup. Both commands preserve workflow and phase policy. Unrecognized contract
or enforcement schema identities still need explicit correction.

After reviewing the migration and successful verification, retain backups outside the catalog
directories or remove them deliberately. No contract or enforcement rewrite is required by this
migration. Engineering remains advisory, read on every lifecycle pass by default; adopters can retire
all its entries while retaining a valid empty catalog. The package still requires a populated E
starter catalog. Publishing the release also requires serving the new principles schema at its
canonical URL; generating a package alone does not publish that URL.

To adopt the new loading default in an existing installation, deliberately amend each lifecycle
row in `.agents/cg/phases.json` to `always: ["A", "P", "E"]` and `conditional: []`, then align
the preserved workflow instructions to read E on every pass. `cg init` and catalog migration
preserve both files; upgraded skills respect that retained loading policy. This changes context
loading only, not contract rules or enforcement mappings. Empty adopter E remains valid.

Init may leave the three legacy `architecture.schema.json`, `engineering.schema.json`, and
`product.schema.json` files in an older installation. Converted catalogs use only
`principles.schema.json`; the legacy files can be removed after migration. Contract and
enforcement schemas remain in use.

## Older installations and recovery

Use the same `cg init` entry point for 0.6.0 and earlier installations. Keep the saved docs root and profiles; older installations without saved settings must supply them explicitly. Init refreshes framework files and retains repository context, with legacy principle conversion as described above. Unknown formats and missing product rationale remain explicit migration failures, not permission to discard content.

After refreshing, reload editor skills and use warmup to confirm intent and inspect mapping gaps. Unmapped boundaries need adoption; an already mapped graph needs an additive reseed only where current evidence calls for it. Reseed preserves authored purpose, exclusions and P IDs; it does not move application code or prove complete implementation correspondence. An unchanged reseed should write nothing.

`cg --version --json` reports the CLI path and content identity; init records that identity. Status and lifecycle admission detect an installation mismatch. Use the intended CLI for both init and subsequent work. Identity matching cannot prove that an already-running agent reread its skills, so stop active agents before upgrading and reload afterward.

## Workflow retirement in 0.7.0

This release removes cg-prepare and cg-auto-run. Planning now includes technical readiness; production owns incremental preparation, implementation and the dependency-aware continuation loop. Sign-off completes deferred tests/docs and verification, returning implementation defects to produce. Produce asks for batch or per-item review and reports item-level Code/Test/Docs progress.

There is no legacy execution adapter or automatic conversion of old queues and auto-run ledgers. Init retires known framework-owned skill files and discovery wrappers with recoverable backups and removes their root skill-catalog entries. Repository-owned plans, evidence, workflow and phase policy remain intact. Reconcile retained policy with the new skill responsibilities before using it for delivery; extra files added inside a retired skill directory are preserved. Retained historical preparation-family policy is inactive and does not restore the retired stage.

### Shared delivery records and sign-off

Both planned production and exploratory work now end at `cg delivery handoff` and use one sign-off procedure. New metadata is `.agents/cg/deliveries/<programme>.json`. Existing `.agents/cg/prototypes/` records remain readable and writable in place; init neither moves nor deletes them. Do not copy a programme record into both directories: duplicates are rejected rather than choosing one history. `cg prototype` remains an alias to the same commands. Status/next JSON now exposes `receipt`; sign-off entry is `delivery-completion` with `handoffReady` distinguishing accepted handoffs from early assessment.

Re-init backs up manifest-owned prototype-completion, sprint-completion and phase-sign-off references before retiring them. Custom reference files, delivery evidence, plans and repository-owned workflow policy remain preserved. Reconcile any retained policy that names separate sign-off procedures; a narrow phase request still limits scope but does not require a different completion loop.

## Expert skills

Init now supplies `api-expert`, `mobile-expert`, `web-expert` and `ui-design-expert` alongside the six lifecycle skills. It creates `.agents/cg/experts.md` only when absent. Keep project constraints and selections there, or add a distinctly named `<name>-expert` skill; shipped default files are refreshed on re-init. Custom files not shipped by the release are preserved. Run sync for selected host discovery. Experts do not require lifecycle phase or root catalog changes. See [adding experts](experts.md).

If a supplied expert path already exists without framework ownership in the installation manifest, init stops before modifying repository files. Retain that expert under a distinct project name and update the index before retrying; it is never silently replaced by the new default.

The shared contract authoring template installs at `.agents/cg/templates/contract.template.yaml`. Init backs up and removes the three superseded warmup/produce template files only when the prior manifest establishes ownership; unowned templates and authored contracts remain intact.

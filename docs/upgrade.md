# Upgrade

`cg init` handles both first installation and upgrades. **0.8.0 is the oldest supported
upgrade source; 1.0.0 is the baseline.** Both can upgrade directly to 1.1.0 with the same
command. An intermediate installation of 1.0.0 is unnecessary. Both releases already
use the shared principles schema, so their standard catalogs need no format conversion.

## Upgrade to 1.1.0

Install the intended 1.1.0 CLI first. Once published, use `npm install --global contract-graph@1.1.0`;
for an unpublished release, install its independently packed tarball. Repository initialization
does not fetch packages or change the global CLI.

Stop active coding agents and finish or checkpoint their work. Open plans need not be completed:
roadmaps, queues, decisions and delivery receipts are preserved.

```bash
cd <your-repository>
cg --version --json
cg init --check
cg init --yes
```

`--check` previews without writes and exits 1 when changes are needed. Omit `--yes` for
interactive confirmation. Saved docs roots and profiles are reused; supply `--docs` and
`--profile` if those choices were not recorded. Successful init runs sync and verification.
Review the diff, reload your agent's skills, then run `/cg-warmup` to reconcile retained policy
and confirm intent where needed before continuing work.

On Windows, use `cg.cmd` with the same arguments if PowerShell blocks `cg.ps1`.
See [Windows setup](../README.md#windows-powershell).

## What init updates

| File | Upgrade behavior |
| --- | --- |
| Skills, hooks, schemas, selected editor discovery | Refresh from the installed release |
| `architecture.yaml`, `engineering.yaml` | Back up changed files, then install release defaults |
| Current `product.yaml` | Validate and preserve byte-for-byte, including authored rules and comments |
| Contracts, enforcement, project context and intent records | Preserve repository content |
| Workflow, phase policy, docs, plans and delivery records | Preserve repository choices and history |
| Shared agent entry | Refresh the generated CG BOOTSTRAP block; preserve surrounding guidance |

Init reports retained workflow and phase-policy differences without rewriting them. Notices
alone do not make `--check` fail. Review deliberate stage restrictions and always-E or missing-E
choices during warmup; a clean scaffold check does not prove that repository policy is reconciled.
To adopt conditional engineering loading, deliberately change lifecycle rows in
`.agents/cg/phases.json` to `always: ["A", "P"]`, `conditional: ["E"]` and align the workflow.
Engineering remains advisory.

Changed catalogs are backed up under `.agents/cg/backups/init/<content-hash>/`. Unchanged runs
do not add backups. Review previous A/E amendments before reapplying them; init installs release
defaults rather than merging local preferences. Catalog application attempts rollback on failure;
the whole init/sync/verify sequence is not one filesystem transaction.

Known obsolete framework files are retired with backups under the historical
`.agents/cg/backups/retired-0.7.0/` path. Custom files are preserved. The removed
`cg-plan/references/prepared-plan.md` requires a matching, non-adopted prior manifest hash:
modified or unowned copies stay in place with a notice. Superseded warmup/produce contract
templates and per-expert notices require prior ownership evidence. No backup purge occurs.

The four supplied expert skills refresh on re-init; `.agents/cg/experts.md` is preserved.
An existing default expert path without framework ownership blocks writes. Retain custom experts
under distinct names and update the index before retrying. See [experts](experts.md).

Use the intended CLI for init and subsequent work: `cg --version --json` reports its path and
content identity, and init records that identity. Reloading agents is still necessary; identity
matching cannot prove that a running agent reread its skills. Repository upgrades do not update CI pins.

## What changes from 1.0.0

- **Shorter task procedures:** warmup loads intent, adoption or reseed instructions as needed. Concrete bounded corrections can proceed through produce without creating a separate plan, queue or receipt. Existing programme gates and required acceptance still apply.
- **Local programme selection:** status and next support explicit session/worktree selection and an all-programme summary. Selection does not resume suspended work or grant execution authority. See [programme selection](workflow.md#bounded-corrections-and-programme-selection).
- **Focused discovery:** optional route suggestions and bounded context hydration extend exact routing; advisory queries select E entries or categories. Existing exact-route APIs remain available. See [contracts](contracts.md).
- **Receipt storage:** older receipts remain readable; successful close compacts legacy storage losslessly. Optional v3 delta compression requires compatible readers and can be converted back to v2. See [receipt storage](workflow.md#bounded-corrections-and-programme-selection).

Init and sync refresh the shared agent entry’s marked CG BOOTSTRAP block, including when an older entry has only the generated principles index. Surrounding repository guidance, workflow and phase policy remain preserved.

Fresh installations load relevant engineering advice conditionally. Existing workflow and phase policy remain preserved, including always-E choices; reconcile them deliberately rather than assuming init changed them. Init retires the exact obsolete prepared-plan reference only with matching prior ownership/hash evidence and a recoverable backup. Modified or unowned copies remain with a notice.

V3 is not enabled automatically for new receipts. Before opting in with `cg delivery compact --programme <slug> --format delta`, coordinate all readers: 1.0.0 cannot read v3. Before reverting to an older CLI, use 1.1.0 to convert affected Closed receipts with `--format v2`; active receipts must complete their normal lifecycle before explicit compaction. Do not edit storage envelopes manually or close work solely to downgrade it.

## What changed from 0.8.0 to 1.0.0

- **Windows PowerShell installation:** global npm installation with lifecycle scripts enabled removes only the verified package-owned `cg.ps1`, allowing bare `cg` to use the existing batch launcher. macOS and Linux installations are unchanged. Script-disabled or unfamiliar-wrapper environments retain the `cg.cmd` fallback; no execution-policy change is required. See [Windows setup](../README.md#windows-powershell).
- **Chat file links:** refreshed agent guidance uses host-supported local file paths and line numbers for links in chat. Repository Markdown retains portable relative paths and heading anchors.

The 1.0.0 baseline retains the contract formats, CLI commands and lifecycle introduced in earlier releases. Refresh installed skills with `cg init` and reload your agent host. Existing repository-owned context, workflow and phase policy remain preserved.

## Shared delivery records and sign-off

Delivery records live in `.agents/cg/deliveries/`. Existing `.agents/cg/prototypes/` records
remain readable and writable in place, and `cg prototype` remains an alias. Init does not move
or delete these records. Duplicate programme records across both directories are rejected.
There is no automatic conversion of old queues or auto-run sessions; reconcile retained workflow
before resuming their recorded scope. See [delivery workflow](workflow.md).

1.0.0 and 1.1.0 both read logical v1 and interned v2 receipts. Only 1.1.0 reads optional v3
deltas; default writes remain compatible. Convert Closed receipts back to v2 with the newer
runtime before rolling readers back. Status/next expose `receipt`; sign-off uses
`delivery-completion` and `handoffReady`. A Closed receipt can have a null next action when
no cleanup remains.

## Legacy content recovery

A repository may retain older content even after its CLI was updated. Compatibility recovery
is based on those files, not the recorded package version; this does not extend the supported
release range below 0.8.0. Known historical contract/enforcement schema URLs are updated without
changing authored content, graph edges or commands. Unknown formats block conversion.

For legacy product rules missing rationale, init preserves `product.yaml`, refreshes installed
files and returns exit code 1 with a `/cg-warmup` handoff. Sync and verification wait until the
owner confirms the missing reasons. Warmup prepares that input and finishes init; it must not
invent placeholder policy. Prepared input can also be supplied with
`cg init --yes --reasons reasons.json`. Invalid catalogs or supplied reasons block writes.
An empty legacy product catalog needs no rationale; omit the reasons file once migration succeeds.

This is only needed when a repository retains older catalog content. Fresh 0.8.0 and
1.0.0 installations already use
`https://contractgraph.dev/schema/principles-v1.schema.json`. Converting an older catalog changes its format,
not just its schema URL. Contract and enforcement keep their existing v1 formats and IDs.

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
migration. Engineering remains advisory, loaded when relevant by default; adopters can retire
all its entries while retaining a valid empty catalog. The package still requires a populated E
starter catalog. Publishing the release also requires serving the new principles schema at its
canonical URL; generating a package alone does not publish that URL.

To adopt the new loading default in an existing installation, deliberately amend each lifecycle
row in `.agents/cg/phases.json` to `always: ["A", "P"]` and `conditional: ["E"]`, then align
the preserved workflow instructions to load relevant E conditionally. `cg init` and catalog migration
preserve both files; upgraded skills respect that retained loading policy. This changes context
loading only, not contract rules or enforcement mappings. Empty adopter E remains valid.

Init may leave the three legacy `architecture.schema.json`, `engineering.schema.json`, and
`product.schema.json` files in an older installation. Converted catalogs use only
`principles.schema.json`; the legacy files can be removed after migration. Contract and
enforcement schemas remain in use.

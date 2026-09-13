# Upgrade

## Update an existing repository with cg init

Install the intended CLI build, then run init in your adopting repository. For an unpublished
0.6.0 build, run `npm run pack` in the Contract Graph checkout, then
`npm install --global ./dist/tar/contract-graph-0.6.0.tgz`.

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
automatically replace your repository-owned workflow; see the auto-run section below.

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
release and migrates product rules. Its preflight blocks before any installation writes if product
conversion needs input. Both commands preserve workflow and phase policy. Unrecognized contract
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

## Earlier release upgrades

How to move an existing Contract Graph install from 0.3.0 or 0.4.0 to 0.5.0.

This is the human path. After `cg init`, the agent procedure is `/cg-warmup` (adoption or
reseed). Installed `.agents/cg/workflow.md` is preserved and may still say “warmup once”; the
replaced skill is the procedure.

## Sequence

```bash
npm install --global contract-graph@0.5.0
cd <repo>
cg init --yes --docs docs
cg verify
```

Keep the same `--profile` set; add a profile only if you need a new harness. A stored `all`
selection expands to `agents`, `claude`, and `copilot`. Non-interactive init needs `--docs docs`
(or another single-directory root) when `docs/` already exists. Reload the IDE so the replaced
`/cg-*` skills appear, then `/cg-warmup` in a new chat.

`cg init` prints the next step: **adoption** while roots are unmapped or still need descent,
**reseed** when `cg modules` exits 0. A 0.3.0 graph that is already connected takes reseed.
With the current CLI, init also refreshes A/E, migrates legacy P, and updates known old schema
declarations. Existing contract content stays intact until `/cg-warmup` runs.

Adding a harness later is another `cg init --yes --profile claude` (keep `--docs`), not warmup.
`cg sync` copies each module `AGENTS.md` to `CLAUDE.md`.

## Adoption or reseed

| `cg modules` | What warmup does |
|---|---|
| any `UNMAPPED` or `DESCEND` | **Adoption** (or resume): write missing contracts |
| exit 0, all governed | **Reseed**: additive only |

`cg modules` lists roots the language adapters detect. Directories that already have a
`contract.yaml` but are not adapter roots do not appear as `UNMAPPED`. Exit 0 means those
detected roots are governed; reseed still walks children from the graph and current cues.

## What a non-empty reseed writes

A connected 0.3.0 graph is the high-value case. Against current cues it may:

- add a child `contract.yaml` for a separable package that already exists;
- add the child edge on the parent, and the child path on existing routes whose `when`
  already names that surface (phrases and existing contract paths stay);
- move the child's services off the parent `surface` so they are not duplicated;
- append the next unused `Pnn-nn` rows and `enforcement.yaml` detectors, citing a command
  already on disk when one exists (`unproven — …` only when none does);
- bind those new P IDs on the contracts they constrain.

`purpose`, `forbids`, and existing P IDs stay. In-flight `cg-plan` trees and an older
adoption corrective set are left in place. The delta is
`<docs>/plans/warmup-reseed-delta.md` until the owner files it under decisions.

## What init replaces

The supported default is one global CLI, followed by `cg init` in each adopting repository.
Do not add a local npm dependency merely to refresh that repository's skills. When testing an
unpublished build, pack it and install the tarball globally, then run that global `cg init`.
The hook uses `cg` on PATH, matching ordinary skill commands; `CG_BIN` is an explicit test override.

`cg --version --json` reports the CLI path and a content identity for its runtime, skills, hooks,
and schemas. Init records that identity alongside the existing file baselines. `cg status` reports
a mismatch or an older unrecorded installation, and lifecycle dispatch requires re-init with the
intended CLI. This catches different development builds sharing a release version. It does not
prove that an already-running agent reread a skill or that repository-owned policies are identical
to vendor defaults. After updating, reload the skills and preserve the user's current task scope.

`cg init` **refreshes** skills, schemas, hooks, architecture, and engineering. It **migrates**
legacy product format while retaining authored rules and requiring any missing rationale.
Contracts and enforcement keep their content apart from known legacy schema declarations.
Workflow, phase policy, and docs are preserved. Init does not merge A/E amendments or delete
leftover `.agents/rules` from older installs. There is no separate `cg upgrade` verb.

## Adopting the 0.6.0 auto-run workflow

The 0.6.0 source includes Manager–Engineer auto-run instructions and direct user questions backed
by the decision log. Install the package build you intend to test, then run `cg init --yes --docs
docs` with your existing docs root and profiles. This updates skills and their role references;
it does not publish the package or change repository-owned workflow choices.

An existing `workflow.md` may still require logging instead of asking in chat or stopping all
auto-run activity at an unblock route. Deliberately reconcile those clauses with the new workflow
before using the new roles, preserving your other amendments. Compare against the package's
`agent/cg/workflow.md`. Re-init and warmup do not silently make this policy choice for you.

Fresh phase workers, independent model selection and asynchronous questions depend on the host.
Without workers, the skill stops unless the invocation names `mixed-context`. Use `**Status:** Closed` only after acceptance, worker-ownership reconciliation and
persistence of queued answers. Delete those ledgers rather than archiving them;
`cg residue` reports them even if stale links remain. Cancellation and authority exhaustion
retain Suspended recovery state when cleanup conditions are unmet. Older standalone
`Closed` markers remain recognized; an explicit Active or Suspended status takes precedence. `cg verify` checks
graph integrity, not whether a particular host executed the Manager–Engineer protocol correctly.

## 0.3.0 versus 0.4.0

- **0.3.0 → 0.5.0** is the high-value reseed. Replaced skills bring Phase D, `warmup.yaml` cues,
  and route-after-child. A graph that stopped at module leaves can gain child contracts, P rows,
  and route targets.
- **0.4.0 → 0.5.0** is mostly the same skills with an explicit reseed entry. An empty delta is
  success: nothing was missing against current cues.

Consecutive reseed with unchanged cues should write no file and stop.

## Stale catalog

Typical 0.3.0 and 0.4.0 installs already have `hierarchy.kinds`, `graph.recurse`,
`graph.surface`, and `graph.adapters`. If `cg verify` reports the catalog is older than this
verifier, run `cg init` to refresh the release defaults with a backup, or amend it deliberately.

## What reseed will not do

- Copy a template over an existing `contract.yaml`.
- Blank `purpose`, `forbids`, or existing P IDs.
- Merge packaged `architecture.yaml` into the repository.
- Move application code or replay a product-specific continuity programme.
- Prove that every implementation dependency matches the graph.

Reseed can miss too: it is an agent walk of current cues, not import-correspondence.

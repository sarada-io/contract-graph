# Migrating from 0.1.0 to 0.2.0

Version 0.2.0 adds `cg next`, `cg residue`, the opt-in `cg-auto-run` skill, and a Claude Code gate
command. It also changes active planning from one file per Step to one queue document per phase.

The upgrade is supported in place. Contract Graph now distinguishes framework-owned files from
repository-owned context: re-running `cg init` replaces `.agents/skills/` and `.agents/hooks/`,
but preserves `.agents/cg/`, the selected documentation trees, module contracts, and the
repository-authored portions of root entry files.

## Upgrade the scaffold

Start with a clean working tree so the preview and resulting diff are unambiguous.

```bash
npx contract-graph@0.2.0 init . --check
npx contract-graph@0.2.0 init . --yes
npx contract-graph@0.2.0 verify
```

`--check` exits 1 when an upgrade is available. Preserve any intentional edits under
`.agents/skills/` before applying; those framework-owned files are replaced. The upgrade also adds
ignore rules for local auto-run ledgers.

## Enable the Claude Code gate

`cg init` writes the command but leaves user-owned hook settings untouched. Follow the single
[registration procedure in the README](../README.md#enabling-the-claude-code-gate) if the
repository uses Claude Code.

## Migrate an active programme

Version 0.2.0 reads one queue document per phase instead of one file per Step. A programme now has
this shape:

```text
docs/plans/<programme>/roadmap.md
docs/plans/<programme>/<phase>_detailed_preparation.md
```

If no programme is active, no content migration is needed. For an active 0.1.0 programme:

1. Move its roadmap to `docs/plans/<programme>/roadmap.md`.
2. Combine that phase's Step briefs, in priority order, into
   `<phase>_detailed_preparation.md`, converting each brief title to a `## Step <n>` heading and
   its body headings to `###`.
3. Link the phase document from the roadmap.
4. Run `npx contract-graph@0.2.0 next .` and confirm it names the stage implied by the Step states.
5. Run `npx contract-graph@0.2.0 residue .`; archive or remove only artifacts it reports after
   confirming they are no longer part of the programme.

Do not enable unattended advancement until `cg next` parses the migrated queue successfully.

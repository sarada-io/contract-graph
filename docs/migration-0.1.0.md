# Migrating from 0.0.1 to 0.1.0

Version 0.1.0 is intentionally breaking. It replaces the package’s template tree, renames and
consolidates the lifecycle skills, renames the `--design` flag and the `ops` pack, adds persisted
editor/pack/docs selection, and changes which generated discovery files are required.

Four things need your attention, in rough order of how loudly they fail: the skill renames, the
`--design` flag, the `DP-OPS-*` rule IDs, and the new document trees.

There is no automatic `cg migrate` command in 0.1.0. The supported migration is to scaffold a
clean 0.1.0 governance tree and port your repository-specific edits into it.

## The lifecycle skills were renamed

Four of the six skills changed identity. The names now sort into workflow order, so an editor
listing the `cg-` namespace shows the sequence rather than an arbitrary order.

| 0.0.1 | 0.1.0 | Change |
|---|---|---|
| `cg-plan` | `cg-plan` | unchanged |
| `cg-prepare` | `cg-prepare` | unchanged |
| `cg-execute` | `cg-produce` | renamed |
| `cg-complete` | `cg-sign-off` | renamed, and absorbed `cg-document` |
| `cg-document` | `cg-sign-off` | **merged** — no longer a separate skill |
| `cg-decide` | `cg-unblock` | renamed; sorts after the loop because it is entered from any stage, not a stage itself |
| — | `cg-warmup` | **new**; sorts last because it is run once at adoption and never again |

`cg-sign-off` keeps both jobs and both entry paths: closing a phase, and — invoked on its own —
writing durable design records, product and operator guides, and diagrams. Documentation work that
used to start at `cg-document` now starts at `cg-sign-off`; nothing it could do was dropped.

`cg-warmup` is the one to run first on a 0.0.1 repository you are re-scaffolding: it rebuilds the
inheritance and routing maps against your real modules, which is most of what the migration
procedure below asks you to port by hand.

Port anything you customised in a canonical `.agents/skills/<old-name>/SKILL.md` into the
corresponding new folder, and update every reference in your own documents, prompts, and scripts.
`cg verify` fails on a `.claude/` wrapper whose canonical source no longer exists, so a stale
wrapper directory left behind by the rename is caught rather than ignored.

## Principles keep their filenames, and gain a check

`.agents/cg/principles/architecture.md` and `product.md` keep the names and the shape they had in
0.0.1: one file per family, each principle a `## AP-nn.` section. Your rule text ports across
unchanged.

What is new is enforcement. 0.1.0 requires every rule to sit under the heading matching its own ID,
rejects a principle heading defined twice, rejects a rule appearing before any heading, and rejects
a rule from the wrong family. A 0.0.1 file that drifted — a rule pasted under a neighbouring
heading — fails on arrival. That is the check doing its job; fix the filing rather than working
around it.

## `principles/` is flat, and every family has its own prefix

0.0.1 had `architecture.md` and `product.md` under `principles/`, with design sets under
`.agents/cg/design/`. 0.1.0 puts all six in one flat directory, each file owning one family.

| 0.0.1 | 0.1.0 | Rules |
|---|---|---|
| `principles/architecture.md` | `principles/architecture.md` | `AP-*` — unchanged |
| `principles/product.md` | `principles/product.md` | `PP-*` — unchanged |
| `design/saas.md` | `principles/design.md` | `DP-SAAS-01-01` → `DP-01-01` |
| `design/ops.md` | `principles/operations.md` | `DP-OPS-01-01` → `OP-01-01` |
| `design/ux.md` | `principles/ux.md` | `DP-UX-01-01` → `UP-01-01` |
| — | `principles/security.md` | `SP-*` — new |

The two-part `DP-<SET>-nn-nn` form is gone; every family now reads `XX-nn-nn`, the same shape
`AP-` and `PP-` always had. `AP-` and `PP-` are still the only families inherited into contracts —
the other four are read at a fork, because an unavoidable guide is just a rule.

**Rewrite your rule IDs and every citation of them**, in the same commit: enforcement-map rows,
contracts, prose, and your own scripts. `cg verify` catches the map side by name — a row citing an
ID no principles file defines fails, and so does a rule whose family disagrees with its file.

## Selection moved to the phase map

```bash
cg init . --design saas,ops   # 0.0.1
cg init .                     # 0.1.0 — all six families ship
```

There is no opt-in install any more, and no `--design`, `--packs`, or `cg packs`. Every family is
present; **`map/phases.json` decides which are read in which phase**, which is where the decision
belonged — a repository does not want fewer principles available, it wants the right ones loaded at
the right moment.

Unknown options are refused rather than ignored, so a stale script fails loudly instead of
scaffolding something you did not ask for.

## New: document trees, a phase map, and an install manifest

`cg init` writes three things 0.0.1 did not.

**`docs/plans/`, `docs/design/`, `docs/guides/`.** The skills already wrote to
`docs-plans/decision-log.md` in 0.0.1 but nothing created it. They are now scaffolded, under a
`docs/` root, with seed files. If `docs/` already exists in your repository, `cg init` asks before
using it — nothing is overwritten either way — or pass `--docs <dir>` to choose up front. The
choice is recorded, and the contract self-sufficiency check follows it.

Port your existing decision log into `docs/plans/decision-log.md`, keeping entry IDs unchanged.

**`.agents/cg/map/phases.json`.** Which rule families and domain sets each lifecycle phase loads,
keyed on rule token rather than filename. `init` narrows it to the packs you installed. If you add
a pack later, `cg verify` fails until a phase claims it — that is the prompt to decide where it
belongs.

**`.agents/cg/map/manifest.json`.** What this version installed and the hash each file had on
arrival. Nothing consumes it yet; `cg upgrade` in a later version will, and its baseline cannot be
captured retroactively — which is why it ships now. Files that predate the install are recorded
`adopted: true`, so a manifest written over your ported tree does not claim your edits are
pristine.

## Why re-running init in place is not enough

`cg init` never overwrites existing files, so running 0.1.0 over a 0.0.1 repository leaves the old
governance paths in place beside the new ones and produces a tree that is half of each. Scaffold
clean and port instead.

## Migration procedure

1. Preserve the current repository and make sure its working tree is recoverable.
2. Record the domain packs you use and choose editor profiles with `cg packs` and `cg profiles`.
3. In a separate clean directory, run:

   ```bash
   npx contract-graph@0.1.0 init . --packs <packs> --profile <profiles>
   npx contract-graph@0.1.0 sync
   npx contract-graph@0.1.0 verify
   ```

4. Port only user-authored meaning from the old governance tree:

   - project identity and amendments from `.agents/cg/contract.md`;
   - routing, inheritance, and real enforcement rows from `.agents/cg/map/`, rewriting any
     `DP-OPS-*` ID to `DP-OPERATIONS-*`;
   - product principles into `principles/product.md`, each under its own `## PP-nn.` heading;
   - deliberate edits to domain packs and canonical `.agents/skills/` sources;
   - your decision log into `docs/plans/decision-log.md`;
   - module boundaries and invariants from each `<module>/.agents/cg/contract.md`.

5. Do not port generated inherited blocks, principle indexes, root entry files, shared rule
   pointers, or Claude wrappers. Let `cg sync` regenerate them from the new sources.
6. Move the clean governance result into the upgraded project—or move the project source into the
   clean scaffold—without retaining the old monolithic principle files.
7. Run the final gate from the project root:

   ```bash
   cg sync
   cg verify
   cg sync --check
   ```

Treat a failure after migration as a disagreement to resolve, not a file to silence. In
particular, every ported `AP-` or `PP-` rule still owes exactly one real enforcement-map row; do
not relabel a testable constraint as a `guide` to make the upgrade green.

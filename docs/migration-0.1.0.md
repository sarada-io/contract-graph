# Migrating from 0.0.1 to 0.1.0

Version 0.1.0 is intentionally breaking. It replaces the monolithic principle files and the
package’s template tree, adds persisted editor/design selection, renames and consolidates the
lifecycle skills, and changes which generated discovery files are required.

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
| `cg-decide` | `cg-unblock` | renamed; sorts last because it is entered from any stage, not a stage itself |

`cg-sign-off` keeps both jobs and both entry paths: closing a phase, and — invoked on its own —
writing durable design records, product and operator guides, and diagrams. Documentation work that
used to start at `cg-document` now starts at `cg-sign-off`; nothing it could do was dropped.

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

Design sets move from `.agents/cg/design/` to `.agents/cg/principles/domains/`.

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
   - routing, inheritance, and real enforcement rows from `.agents/cg/map/`;
   - product principles into `principles/product.md`, each under its own `## PP-nn.` heading;
   - deliberate edits to domain packs and canonical `.agents/skills/` sources;
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

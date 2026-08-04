# Migrating from 0.0.1 to 0.1.0

Version 0.1.0 is intentionally breaking. It replaces the monolithic principle files and the
package’s template tree, adds persisted editor/design selection, and changes which generated
discovery files are required.

There is no automatic `cg migrate` command in 0.1.0. The supported migration is to scaffold a
clean 0.1.0 governance tree and port your repository-specific edits into it.

## Why re-running init in place is not enough

`cg init` never overwrites existing files. That safety rule means running 0.1.0 over a 0.0.1
repository leaves the old monolithic architecture/product principle files beside the new
`AP-nn-*.md` files. The 0.1.0 loader rejects that mixed layout by filename, correctly, so an
in-place overlay is not a migration.

## Migration procedure

1. Preserve the current repository and make sure its working tree is recoverable.
2. Record the design packs you use and choose editor profiles with `cg packs` and `cg profiles`.
3. In a separate clean directory, run:

   ```bash
   npx contract-graph@0.1.0 init . --design <packs> --profile <profiles>
   npx contract-graph@0.1.0 sync
   npx contract-graph@0.1.0 verify
   ```

4. Port only user-authored meaning from the old governance tree:

   - project identity and amendments from `.agents/cg/contract.md`;
   - routing, inheritance, and real enforcement rows from `.agents/cg/map/`;
   - product principles into separate `PP-nn-<slug>.md` files;
   - deliberate edits to design packs and canonical `.agents/skills/` sources;
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

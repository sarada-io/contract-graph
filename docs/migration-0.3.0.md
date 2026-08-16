# Migrating to Contract Graph 0.3.0

0.3.0 replaces the 0.2 markdown contract graph with schema-backed YAML nodes. `cg init` does not
rewrite repository-owned catalogs or contracts. An adopting 0.2 repository that runs `npx
contract-graph@0.3.0 init .` keeps its old files until you replace them on purpose.

This is a breaking scaffold change. Do not overlay 0.3 skills onto a 0.2 graph and call it upgraded.

## What to expect

| 0.2 | 0.3 |
|---|---|
| Markdown contract file per governed unit | `<unit>/.agents/cg/contract.yaml` |
| Companion maps and inheritance sidecars | Parent, child, dependency, and route edges on the node |
| Mixed principle families (`AP`, `PP`, `DP`, and similar) | `A` architecture principles, `P` product guidelines, `E` engineering guidelines |
| Contract `rules` listing mixed families | Contract `rules` list **`P` only**; `A` applies globally |
| Decision log families `01` (autonomous) and `02` (owner), hyphenated | `DA-NN` (autonomous) and `DU-NN` (owner review) |
| Generated Markdown as a second source | YAML is canonical; `cg contract show` projects Markdown |

Skills, hooks, and JSON Schema files are framework-owned (`replace` on `cg init`). Contracts,
`architecture.yaml`, `guidelines/`, `enforcement.yaml`, `workflow.md`, and `phases.json` are
repository-owned (`preserve`).

## Upgrade an existing 0.2 repository

1. Archive the 0.2 graph (root and per-module markdown contracts, old principle files) so you can
   read it. Do not delete it until the 0.3 graph verifies.
2. Install 0.3: `npx contract-graph@0.3.0 init .`
3. If `cg verify` fails because the preserved catalog has no `hierarchy.kinds` or `graph.recurse`,
   copy the packaged `architecture.yaml` (or merge those sections). `cg init` will not overwrite
   the file you already have.
4. Run `cg-warmup` once. A brownfield typically has no 0.3 contracts. Write the graph from the
   code and warmup §2a. Predecessor markdown is a checklist against the tree, not a graph to copy.
   Carry a predecessor `P` rule only when the code still obeys it.
5. `cg sync` writes each module's `AGENTS.md` and `CLAUDE.md` pointers from its YAML contract.
   Run it before `cg verify` after new module contracts appear.
6. Re-number open decision-log entries to `DU-NN` / `DA-NN` if you keep the ledger. Harvest
   rejects the 0.2 hyphenated `DL` heading grammar.

`cg verify: OK` means the authored YAML graph is well-formed. It does not mean every product rule
is proven against implementation, or that imports match declared dependencies.

## New repository

```bash
npx contract-graph@0.3.0 init .
```

Fill the root contract, then follow the printed route. There is nothing to migrate.

## Honest limits (unchanged)

0.3 proves authored-graph closure: reciprocity, acyclicity, root reachability, catalog grammar,
and declared surface paths. It does not yet prove that source contains no undeclared child, that
every named symbol is exported, or that implementation imports obey every declared edge.

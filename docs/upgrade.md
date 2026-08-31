# Upgrade

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

Keep the same `--profile` set; add a profile only if you need a new harness. Then `/cg-warmup`
in a new chat.

| `cg modules` | What warmup does |
|---|---|
| any `UNMAPPED` or `DESCEND` | **Adoption** (or resume): write missing contracts |
| exit 0, all governed | **Reseed**: additive only |

`cg init` **replaces** skills, schemas, and hooks. It **preserves** contracts,
`architecture.yaml`, `product.yaml`, `engineering.yaml`, `enforcement.yaml`, `workflow.md`,
`phases.json`, and docs. There is no `cg upgrade` merge of catalogs.

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
verifier, copy the packaged architecture catalog or amend it deliberately. `cg init` will not
overwrite it.

## What reseed will not do

- Copy a template over an existing `contract.yaml`.
- Blank `purpose`, `forbids`, or existing P IDs.
- Merge packaged `architecture.yaml` into the repository.
- Move application code or replay a product-specific continuity programme.
- Prove that every implementation dependency matches the graph.

Reseed can miss too: it is an agent walk of current cues, not import-correspondence.

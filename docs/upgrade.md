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

Keep the same `--profile` set; add a profile only if you need a new harness. A stored `all`
selection expands to `agents`, `claude`, and `copilot`. Non-interactive init needs `--docs docs`
(or another single-directory root) when `docs/` already exists. Reload the IDE so the replaced
`/cg-*` skills appear, then `/cg-warmup` in a new chat.

`cg init` prints the next step: **adoption** while roots are unmapped or still need descent,
**reseed** when `cg modules` exits 0. A 0.3.0 graph that is already connected takes reseed.
After init, git should show skills, schemas, hooks, and first-line pointers changing;
`architecture.yaml` and existing contracts stay clean until `/cg-warmup` runs.

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

`cg init` **replaces** skills, schemas, and hooks. It **preserves** contracts,
`architecture.yaml`, `product.yaml`, `engineering.yaml`, `enforcement.yaml`, `workflow.md`,
`phases.json`, and docs. It does not merge catalogs, and it does not delete leftover
`.agents/rules` from older installs. There is no `cg upgrade` verb.

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

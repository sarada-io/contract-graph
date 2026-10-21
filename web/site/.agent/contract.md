# Website publication contract

Parent: [Website application](../../.agent/contract.md). Owns deterministic composition of declared website inputs into the served asset map and generated directory.

## Composition and child routes

| Responsibility | Child contract | Consumed surface |
| --- | --- | --- |
| Shared document structure and metadata rendering | [Shell](../shell/.agent/contract.md) | `renderPage`, common templates |
| Page bodies, metadata and derived figure presentations | [Pages](../pages/.agent/contract.md) | Explicit `manifest.json` page directories |
| Ordered common and page CSS | [Presentation](../presentation/.agent/contract.md) | `presentation/entry.json` |
| Ordered browser startup and controls | [Interactions](../interactions/.agent/contract.md) | `interactions/entry.json` |
| Untransformed assets, redirects and crawler files | [Static resources](../static/.agent/contract.md) | Explicit `manifest.json` copy entries |

## Implementation and reading routes

- [publication.mjs](../publication.mjs): `validateAssetPath` and `readInput` confine reads; `assembleSite` returns the sorted output Map; `checkOutput` compares paths and bytes; `buildSite` owns freshness, locking and replacement of `web/public/`.
- [manifest.json](../manifest.json) selects pages, copied files and ordered bundle entry files. Adding a source file does not publish it.
- [documentation.mjs](../documentation.mjs): `loadGuides` reads the explicitly marked public guide table in `docs/README.md`; direct lowercase Markdown basenames, unique routes and opening titles are required. `schemaNames`, `brandNames` and `readSharedInput` confine the remaining shared inputs; `documentationLink` translates links; `renderDocumentation` owns heading IDs, legacy aliases, tables, copy controls and validated Mermaid figure substitution; `sharedSchemas` and `sharedBrandAssets` emit canonical bytes.
- [EDITING.md](../EDITING.md) is the contributor editing index. [Operations](../../scripts/.agent/contract.md) invokes these APIs for checks and local preview; publication never owns a second server or deploy command.

## Boundary promises

Reject undeclared inputs, private/hidden paths, traversal, symlinks, malformed declarations, missing files and output collisions before replacing successful output. Bundle order and wrappers come only from the declared entry files. `assembleSite` performs no writes; check mode rejects missing, changed or extra output without rewriting it. Build replacement uses the existing lock and staging/swap path, retaining recoverable previous output when a filesystem failure prevents recovery.

Render exactly the declared canonical guides from [docs](../../../docs/README.md), schemas from [Verification](../../../src/runtime/verification/.agent/contract.md)'s sources and shared brand marks from `docs/assets/`. Guide meaning belongs to [Authoring](../../../src/skills/.agent/contract.md). Preserve canonical schema identities and byte-identical legacy aliases. All guides use one [template](../pages/docs/guide.html), inheriting shared metadata defaults from the docs hub; the index supplies labels/descriptions and canonical Markdown supplies titles. Generate hub cards and sitemap routes from the same discovered catalog. Unlisted Markdown, subdirectories, plans and maintainer records are never discovered. Preserve the architecture filename-to-route exception. Template slots are strict; anchors must resolve, heading IDs remain unique, and derived figures must match their canonical Mermaid hashes. Never copy guide prose or schemas back into site source.

## Verification

[publication.test.mjs](../../test/publication.test.mjs) checks composition, failure isolation, confinement, deterministic bytes and shell integration. [shared-content.test.mjs](../../test/shared-content.test.mjs) checks provenance, shared-input confinement, links, anchors and figures. [site-promises.test.mjs](../../test/site-promises.test.mjs) checks integrated navigation, metadata and schema identities. Run `npm run web:build`, `npm run web:check` and `npm run check:maintainer` from the repository root. Maintainer `.agent/` files must never become publication inputs.

# Website static resource contract

Parent: [Publication](../../.agent/contract.md). Owns existing untransformed website assets, host metadata and compatibility fallback documents.

## Source and caller routes

- [assets](../assets) owns public image/icon files and self-hosted fonts; preserve the bundled [font licence](../assets/fonts/OFL.txt) and [brand guidance](../../../BRANDING.md).
- [_headers](../_headers) owns asset response directives; [_redirects](../_redirects) owns legacy route status/destinations.
- [robots.txt](../robots.txt) points to the canonical sitemap. [Publication](../../.agent/contract.md) generates `sitemap.xml` from all rendered full-page routes; there is no manually maintained page list.
- Existing `community/`, `contract-graph/`, `cg/`, `watch/`, `for-developers/`, `for-product-managers/` and `whats-included/` HTML are compatibility fallbacks. [manifest.json](../../manifest.json) explicitly selects their copy paths; nothing is published by directory discovery.

## Boundary promises

Copy declared assets byte-for-byte. Preserve legacy redirects and local fallback destinations, including hashes and noindex behaviour. Sitemap entries use the production apex, include all indexable full pages and omit fallback pages; omit optional lastmod rather than inventing content-change dates. Coordinate route additions/removals with [Pages](../../pages/.agent/contract.md), rather than silently retiring links.

Schema payloads are generated from canonical `src/cg/schema/` by [Publication](../../.agent/contract.md), including legacy aliases; do not author schema copies here. Shared WebP brand marks also come from `docs/assets/`. Maintain only the remaining website-owned assets here. Credentials, source contracts, private records and development instructions never belong in the publication manifest.

Verification: [sitemap.test.mjs](../../../test/sitemap.test.mjs), exact-copy/private-path cases in [publication.test.mjs](../../../test/publication.test.mjs) and schema identities in [site-promises.test.mjs](../../../test/site-promises.test.mjs). Run `npm run web:build`, `npm run web:check` and `npm run check:maintainer`; check deployed host redirects after an authorised release because local preview serves fallback HTML instead of applying Cloudflare host rules.

Preserve `/whats-included/` as the permanent redirect and noindex local fallback, retaining incoming hashes such as `#skills` and defaulting to `#whats-included`. Keep old community, developer, product-manager, cg, watch and schema aliases, including redirect chains, unless retirement is explicitly requested.

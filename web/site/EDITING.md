# Editing the website

Start at [the website application contract](../.agent/contract.md), then [Publication](.agent/contract.md) or [Operations](../scripts/.agent/contract.md) and the selected child. This index names concrete editing surfaces; the linked contracts own their promises.

From `web/`, edit source here, then run `./urun serve`. Restart the server after changes to assembler or renderer modules. Opening or reloading a page regenerates
`public/`. Do not fix generated output by hand.

| Change | Edit here |
| --- | --- |
| Header navigation or footer | `shell/header.html` or `shell/footer.html` |
| Common document head or pre-paint theme | `shell/head.html` or `shell/theme-bootstrap.html` |
| Homepage content | `pages/home/body.html` |
| Why Dev Kit / How to use / Get Started | `pages/problem/`, `pages/ways-to-work/`, `pages/start/` |
| Technical guide prose | Canonical `../../docs/*.md`; the guide shells under `pages/docs/` contain the generated-content slot |
| Page title, description, canonical URL or active navigation | That page's `metadata.json` |
| Theme colours and fonts | `presentation/theme/tokens.css` |
| Header/footer styles | `presentation/navigation/` |
| Reusable cards, buttons, prose and responsive rules | `presentation/components/` |
| Page-specific styles | CSS beside the page under `pages/` |
| Browser menu / theme / analytics / video / command controls | `interactions/navigation/`, `theme/`, `analytics/`, `video/`, `commands/` |
| Image/font resources, redirects, robots or sitemap | Corresponding file under `static/` |
| Canonical schema payloads | `../../src/cg/schema/`; both URL families are generated at build time |
| Add/remove a page or copied asset | `manifest.json`, then the owning source directory |
| Local menu | `../scripts/urun.mjs` |
| Local HTTP preview | `../scripts/preview/server.mjs` |
| Shared guide rendering / schema generation | `documentation.mjs` |
| File presence checks | `../scripts/maintenance/assets.mjs` |
| Deployment build gate | `../scripts/build-site.mjs` |

A full page has `metadata.json` and `body.html`. Technical guide shells contain exactly one `{{documentation}}` slot; their prose comes from the declared root Markdown source. Metadata values are plain strings,
not HTML; the renderer escapes them. The body is trusted repository HTML and includes
its main section and any page-specific dialog. The shell owns the common document
structure. `current` is the exact matching primary destination, or an empty string
when this page has no primary-nav link. Redirect fallback pages remain independent
files under `static/`.

The manifest is an explicit allowlist. Adding a file under source does not publish
it. Never add `.agents/`, `AGENTS.md` or development documents as copied assets.
Literal shell slots use `{{name}}`; unknown or missing slots fail the build. There
is no template expression language.

Commands from the combined repository root:

```sh
npm run web:build             # regenerate public/ and run the deployment build checks
npm run web:check             # reject stale, missing or extra generated files
npm run web:serve             # regenerate and preview; reload to apply source edits
npm run check:maintainer      # validate the repository and website Markdown graph
```

From `web/`, `./urun build`, `./urun check` and `./urun serve` enter the same website implementation. Root `./urun` owns npm development activities.

Keep accepted website product/page decisions in [web/AGENTS.md](../AGENTS.md). A source move is
not a copy or design change. Preserve CSS ordering, query tokens, compatibility
hashes and the legacy video dialog. Change cache tokens in affected page metadata
when changing the corresponding CSS or script content.

`public/` is ignored generated output. GitHub Actions runs the same build gate before production upload; pull requests only validate and hosted previews stay disabled. See [deployment and cutover](../DEPLOY.md).

## Composition order

`presentation/entry.json` lists CSS sources in cascade order. Page-owned rules are
interleaved with common rules; do not sort this list or gather files recursively.
Mixed responsive selector groups stay in `presentation/components/` so their
ordering and shared ownership remain visible.

`interactions/entry.json` is the explicit startup order. Each source is a complete
JavaScript statement sequence; the assembler encloses the sequence in the original
IIFE. Analytics startup defines `report` before tabs, video, copying and engagement
use it. No script loading, event timing or browser module mode changed. To edit one
behaviour, read its directory plus this order; do not create another implementation
in a page body. Fragment files are inputs, not individually loaded scripts.

The original urun exports remain compatible. New tooling callers should import
preview or maintenance directly instead of importing the interactive menu.

# Editing the website

Start at [the website application contract](../.agent/contract.md), then [Publication](.agent/contract.md) or [Operations](../scripts/.agent/contract.md) and the selected child. This index names concrete editing surfaces; the linked contracts own their promises.

Edit source here, then run `./urun web serve` from the repository root. Restart the server after changes to assembler or renderer modules. Opening or reloading a page regenerates
`public/`. Do not fix generated output by hand.

| Change | Edit here |
| --- | --- |
| Header navigation or footer | `shell/header.html` or `shell/footer.html` |
| Common document head or pre-paint theme | `shell/head.html` or `shell/theme-bootstrap.html` |
| Homepage content | `pages/home/body.html` |
| Why Dev Kit / How to use / Get Started | `pages/problem/`, `pages/ways-to-work/`, `pages/start/` |
| Technical guide prose | Canonical `../../docs/*.md`; select public guides in the marked table in `../../docs/README.md` |
| Marketing page metadata | That page's `metadata.json` |
| Guide layout and metadata | Shared `pages/docs/guide.html` and docs hub `metadata.json`; guide title comes from its H1, label/description from the canonical index |
| Theme colours and fonts | `presentation/theme/tokens.css` |
| Header/footer styles | `presentation/navigation/` |
| Reusable cards, buttons, prose and responsive rules | `presentation/components/` |
| Page-specific styles | CSS beside the page under `pages/` |
| Browser menu / theme / analytics / video / command controls | `interactions/navigation/`, `theme/`, `analytics/`, `video/`, `commands/` |
| Images/fonts, redirects or robots | Corresponding file under `static/`; sitemap is generated from rendered routes |
| Canonical schema payloads | `../../src/cg/schema/`; both URL families are generated at build time |
| Add/remove a marketing page or copied asset | `manifest.json`, then the owning source directory |
| Publish a technical guide | Add its Markdown file and one row in the public table in `../../docs/README.md`; no website directory or manifest entry |
| Shared local menu | Root `scripts/urun.mjs` |
| Local HTTP preview | `../scripts/preview/server.mjs` |
| Shared guide rendering / schema generation | `documentation.mjs` |
| File presence checks | `../scripts/maintenance/assets.mjs` |
| Deployment build gate | `../scripts/build-site.mjs` |

Authored marketing pages and hubs have `metadata.json` and `body.html`. All technical guides use shared `pages/docs/guide.html` and `card.html` templates and the docs hub metadata defaults. The canonical index table supplies discovery order, labels and descriptions; each guide’s opening H1 supplies its title and its filename supplies the URL. The architecture guide keeps its older URL. Only direct lowercase Markdown basenames are accepted; unlisted files and subdirectories stay unpublished. Hub cards, guide pages, in-page navigation and sitemap are generated without per-guide website files. Metadata values are plain strings,
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

Root `./urun` (Windows: `.\urun.cmd`) has a Website submenu alongside the npm activities. Noninteractive commands are `./urun web build`, `./urun web check` and `./urun web serve --port 8000`. These call the same build/check/preview paths. From `web/`, use `../urun web serve` on macOS/Linux or `..\urun.cmd web serve` on Windows; there is no second launcher.

Keep accepted website product/page decisions in their [owning maintenance contracts](../.agent/contract.md); the root [AGENTS.md](../../AGENTS.md) is the sole contributor entry. A source move is
not a copy or design change. Preserve CSS ordering, query tokens, compatibility
hashes and the legacy video dialog. Change cache tokens in affected page metadata
when changing the corresponding CSS or script content.

`public/` is ignored generated output. GitHub Actions runs the same build gate before production upload; pull requests only validate and hosted previews stay disabled. See [deployment and rollback](../DEPLOY.md).

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

Tooling callers import preview or maintenance directly. The shared root menu owns terminal input, command dispatch and platform launchers.

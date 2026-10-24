# contractgraph.dev website target

This directory builds the public website from the same repository as the `contract-graph` npm package. Plain HTML, CSS and JavaScript retain the existing design and browser behaviour; the Node assembler adds canonical Markdown guides using a root development dependency. Read [root AGENTS.md](../AGENTS.md), [the maintenance contract](.agent/contract.md) and [site/EDITING.md](site/EDITING.md) before changing website code.

The reviewed source snapshot came from `sarada-io/contract-graph-web` commit `cc807595cf8dc40ded01d214ba75756828718c54`. Git history, installed `.agents/` content, delivery receipts, intent records, local working plans, deployment state and credentials were excluded. The original repository remains unchanged. Scholarly paper sources retain their attribution and licences in Sarada's separate research archive; they are not product or website build inputs.

## Maintainer graph

Start at [the website application contract](.agent/contract.md). Its [Publication](site/.agent/contract.md) child composes [Shell](site/shell/.agent/contract.md), [Pages](site/pages/.agent/contract.md), [Presentation](site/presentation/.agent/contract.md), [Interactions](site/interactions/.agent/contract.md) and [Static resources](site/static/.agent/contract.md). [Operations](scripts/.agent/contract.md) owns build/preview commands. Each node records entry points, dependencies, boundary promises and the relevant checks; follow the selected responsibility before reading code. These are repository-only Markdown contracts, excluded from served output and the npm package.

## Source ownership

| Content | Canonical source |
| --- | --- |
| Technical guides | Root Markdown files selected by the public guide table in `docs/README.md` |
| Contract, principles and enforcement schemas | Root `src/cg/schema/`, emitted byte-for-byte at both `/schema/` and `/contract-graph/schema/` |
| Homepage, product pages and documentation hub | `site/pages/` |
| Guide layout and metadata | One `site/pages/docs/guide.html` template, docs hub metadata defaults, canonical Markdown H1 and index description |
| Guide discovery and sitemap | Generated from the canonical public index and rendered page routes; no per-guide website entry |
| Shared HTML and navigation | `site/shell/` |
| Ordered CSS and browser behaviour | `site/presentation/entry.json` and `site/interactions/entry.json` |
| Shared WebP brand marks | Root `docs/assets/`, emitted without source duplication |
| Other images, fonts, redirects and host metadata | `site/static/` and the explicit publication manifest |

To publish a new guide, write a root `docs/<name>.md` file starting with one H1 and add a row to the marked public table in `docs/README.md`. Its page, hub card, translated links and sitemap entry follow automatically. Other Markdown files and subdirectories are not published.

Do not edit generated `public/`, duplicate guide prose in HTML, or restore copied schema definitions. Existing architecture figure presentations are derived snapshots of the Mermaid blocks in the canonical guide, guarded by SHA-256 in `figures.json`. The lifecycle diagram uses the same mechanism. A guide containing Mermaid blocks also requires derived presentations and `figures.json` under `site/pages/docs/<slug>/`. When changing a diagram, update its accessible presentation and source hash together; a mismatch blocks publication. Old article anchors remain available through the explicit compatibility map in `documentation.mjs`.

## Local commands

Node.js 18.17 or newer is required. From the repository root:

```sh
npm ci
npm run web:build
npm run web:check
npm run web:serve
npm run check:public
```

`web:build` assembles the complete site, checks required files, runs all website tests and verifies output freshness. `web:serve` builds and serves the site at `http://localhost:4173`; reload after content edits. Restart the preview after changing the assembler or shared renderer modules. Root `./urun` or `.\urun.cmd` offers both npm and Website menus. Run `./urun web build`, `./urun web check` or `./urun web serve --port 8000` from the root for noninteractive use. From this directory use `../urun web serve` on macOS/Linux or `..\urun.cmd web serve` on Windows.

The assembler selects allowlisted inputs and rejects traversal, symlinks, missing sources, unknown slots and output collisions before replacing output. Only `web/public/` is uploaded to Cloudflare; no package installation or website build publishes anything. The npm target remains `dist/build/`, with archives in `dist/tar/`; web files and Markdown build dependencies are excluded from that package.

## Publication

Successful current `main` pushes deploy through GitHub Actions to the existing Cloudflare Worker. [DEPLOY.md](DEPLOY.md) describes the active configuration, credential rotation, deployment verification and rollback. Deployment waits for the Linux, Windows and public-source checks; pull requests only validate. Maintain `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the `website-production` GitHub environment and keep Cloudflare Git builds disconnected. Keep hosted previews disabled. Merging to `main` authorises website publication, so technical guidance and schemas must describe the released npm package or clearly identify upcoming capabilities. npm publication remains separate. Secrets belong in ignored local environment files or platform secret stores; this repository is publicly readable.

# contractgraph.dev website target

This directory builds the public website from the same repository as the `contract-graph` npm package. Plain HTML, CSS and JavaScript retain the existing design and browser behaviour; the Node assembler adds canonical Markdown guides using a root development dependency. Read [AGENTS.md](AGENTS.md), [the maintenance contract](.agent/contract.md) and [site/EDITING.md](site/EDITING.md) before changing website code.

The reviewed source snapshot came from `sarada-io/contract-graph-web` commit `cc807595cf8dc40ded01d214ba75756828718c54`. Git history, installed `.agents/` content, delivery receipts, intent records, local working plans, deployment state and credentials were excluded. The original repository remains unchanged. Published paper sources retain their own attribution and licence under [papers](../papers/README.md), outside both build outputs.

## Source ownership

| Content | Canonical source |
| --- | --- |
| Ten technical guides | Root `docs/*.md`, explicitly selected by `site/documentation.mjs` |
| Contract, principles and enforcement schemas | Root `src/cg/schema/`, emitted byte-for-byte at both `/schema/` and `/contract-graph/schema/` |
| Homepage, product pages and documentation hub | `site/pages/` |
| Guide hero, metadata and compatibility fragments | Guide shells under `site/pages/docs/`; article prose is generated |
| Shared HTML and navigation | `site/shell/` |
| Ordered CSS and browser behaviour | `site/presentation/entry.json` and `site/interactions/entry.json` |
| Shared WebP brand marks | Root `docs/assets/`, emitted without source duplication |
| Other images, fonts, redirects and host metadata | `site/static/` and the explicit publication manifest |

Do not edit generated `public/`, duplicate guide prose in HTML, or restore copied schema definitions. Existing architecture figure presentations are derived snapshots of the Mermaid blocks in the canonical guide, guarded by SHA-256 in `figures.json`. The lifecycle diagram uses the same mechanism. When changing a diagram, update its accessible presentation and source hash together; a mismatch blocks publication. Old article anchors remain available through the explicit compatibility map in `documentation.mjs`.

## Local commands

Node.js 18.17 or newer is required. From the repository root:

```sh
npm ci
npm run web:build
npm run web:check
npm run web:serve
npm run check:public
```

`web:build` assembles the complete site, checks required files, runs all website tests and verifies output freshness. `web:serve` builds and serves the site at `http://localhost:4173`; reload after content edits. Restart the preview after changing the assembler or shared renderer modules. From this directory, `./urun` or `.\urun.cmd` opens the website menu and `./urun serve --port 8000` previews on a different port. Root `./urun` continues to own npm development activities.

The assembler selects allowlisted inputs and rejects traversal, symlinks, missing sources, unknown slots and output collisions before replacing output. Only `web/public/` is uploaded to Cloudflare; no package installation or website build publishes anything. The npm target remains `dist/build/`, with archives in `dist/tar/`; web files, papers and Markdown build dependencies are excluded from that package.

## Publication

After the one-time setup in [DEPLOY.md](DEPLOY.md), successful `main` pushes deploy through GitHub Actions to the existing Cloudflare Worker. Deployment waits for the Linux, Windows and public-source checks; pull requests only validate. Configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions secrets and disable the old Cloudflare Git-build publisher. Keep hosted previews disabled. Merging to `main` authorises website publication, so technical guidance and schemas must describe the released npm package or clearly identify upcoming capabilities. npm publication remains separate. Secrets belong in ignored local environment files or platform secret stores; this repository is publicly readable.

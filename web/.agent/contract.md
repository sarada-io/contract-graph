# Website publication contract

Parent: [repository](../../.agent/contract.md). Owns the static website target, its presentation, shared-content rendering and local operations.

## Entry points and ownership

- [publication.mjs](../site/publication.mjs) assembles the explicit [manifest](../site/manifest.json) into ignored `web/public/`; [render.mjs](../site/shell/render.mjs) owns the shared shell.
- [documentation.mjs](../site/documentation.mjs) renders the ten canonical [human guides](../../docs/README.md), translates repository links, preserves old anchors and validates the derived architecture figures against their Markdown source hashes. It selects exactly three shared [schema definitions](../../src/cg/schema/) for both canonical and legacy URLs and the two shared WebP marks from [docs/assets](../../docs/assets/).
- [site](../site/) owns marketing bodies, page metadata, shell, ordered styles, browser behaviour and static assets. Technical article bodies are generated; never restore a second authored article or schema payload here.
- [build-site.mjs](../scripts/build-site.mjs) owns the website build gate; [assets.mjs](../scripts/maintenance/assets.mjs) checks required generated files. [urun.mjs](../scripts/urun.mjs), [paths.mjs](../scripts/paths.mjs), [server.mjs](../scripts/preview/server.mjs) and the [launchers](../urun) own local preview/operations.
- [tests](../test/) cover publication, content provenance, compatibility routes and local operations. [AGENTS.md](../AGENTS.md) retains accepted design decisions; [DEPLOY.md](../DEPLOY.md) owns hosting and cutover. The deployment job in [CI](../../.github/workflows/ci.yml) owns publication to the existing Worker after the Linux, Windows and reusable public-source checks pass.

## Boundary promises

Keep plain HTML/CSS/JavaScript, the existing shell and browser startup order, light/dark themes, navigation, copy controls and local preview. Build-only dependencies belong in root devDependencies and must support Node 18.17+. The [Authoring](../../src/skills/.agent/contract.md) owner retains human guide meaning and the [Verification](../../src/runtime/verification/.agent/contract.md) owner retains schema semantics.

Only `web/public/` is served. Both targets select explicit inputs; website source, papers, governance, secrets and internal records must not enter the npm package. Shared-content reads use an explicit allowlist and reject symlinks and path traversal. Keep schema bytes and identities unchanged, including the `/contract-graph/schema/` aliases. Do not copy credentials, installed governance, receipts, local paths or unreviewed source history into this public repository.

Build and preview never publish. After the one-time setup in DEPLOY.md, successful current `main` pushes publish through GitHub Actions; pull requests and other branches never deploy. Production jobs are serialised and skip superseded commits. Keep hosted previews disabled and disable the old Cloudflare Git-build publisher so only one deployment path remains. Store credentials in GitHub Actions secrets, exposed only to the deploy step. Merging to `main` is the website publication decision: technical guidance must describe the released npm package or clearly identify upcoming capabilities. npm publication remains separate.

Verification: `npm run web:build`, `npm run web:check`, `npm run check:maintainer`, `npm run check:public`, and `npm test`. Package separation changes also require `npm run pack` and tarball inspection. Review desktop/mobile and light/dark rendering when presentation changes.

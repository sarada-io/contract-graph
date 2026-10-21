# Website application contract

Parent: [repository](../../.agent/contract.md). Owns contractgraph.dev as the public website target, composed from canonical product sources and website presentation.

## Route a website change

Start here, choose the responsible child, then read its selected implementation and tests. Follow sibling links only when their promises change. These repository-only Markdown contracts use the same maintainer map as the CLI; they are excluded from website output and do not install consumer YAML governance.

| Request | Next contract | Starting surface |
| --- | --- | --- |
| Build output, source selection, generated guide prose, schemas, anchors or stale figures | [Publication](../site/.agent/contract.md) | `site/publication.mjs`, `site/documentation.mjs`, `site/manifest.json` |
| Page copy, shared guide layout, page-specific styles or derived figures | [Pages](../site/pages/.agent/contract.md) | The selected page or shared guide template |
| Header, footer, common head, active navigation or pre-paint theme | [Shell](../site/shell/.agent/contract.md) | Shared HTML and `render.mjs` |
| Theme colours, shared layout, CSS order or responsive styling | [Presentation](../site/presentation/.agent/contract.md) | `entry.json` and the relevant stylesheet |
| Mobile menu, theme switching, command controls, video or analytics | [Interactions](../site/interactions/.agent/contract.md) | `entry.json` and the relevant browser fragment |
| Images, fonts, redirects, crawler metadata or old URL fallbacks | [Static resources](../site/static/.agent/contract.md) | Declared static file and manifest entry |
| Preview server, paths, required-file checks or build gate | [Operations](../scripts/.agent/contract.md) | Existing website script |
| Hosting, production deployment, rollback or release alignment | This boundary; [deployment guide](../DEPLOY.md) | [Wrangler configuration](../wrangler.jsonc), [CI](../../.github/workflows/ci.yml) |

Direct children are [Publication](../site/.agent/contract.md) and [Operations](../scripts/.agent/contract.md). Publication decomposes the editable application into shell, pages, presentation, interactions and static resources. Tests under [web/test](../test) verify those owners; they are not a separate application subsystem.

## Integration promises

- Keep the existing plain HTML/CSS/JavaScript application, design, navigation, light/dark themes, accessibility and compatibility URLs. The root [AGENTS.md](../../AGENTS.md) is the sole contributor entry; child contracts retain accepted product decisions. [BRANDING.md](../BRANDING.md) owns brand guidance.
- [Authoring](../../src/skills/.agent/contract.md) owns canonical guide meaning in `docs/`; [Verification](../../src/runtime/verification/.agent/contract.md) owns schema semantics in `src/cg/schema/`. Website children own their rendering and presentation, never a second authored guide or schema definition.
- Only generated `web/public/` is served or uploaded. Website source, maintainer contracts, papers, credentials and local records remain outside both the served assets and npm package. [Distribution](../../src/runtime/distribution/.agent/contract.md) owns the package boundary and CI orchestration.
- Build-only dependencies stay in root devDependencies and support Node.js 18.17+. Root npm commands retain their library target; website commands are separate.
- Building and previewing never publish. Successful current `main` pushes deploy through GitHub Actions after Linux, Windows and security checks; other branches only validate. Keep Cloudflare Git builds and hosted previews disabled. Production deployments are serialised, skip superseded commits and expose credentials only to the deployment step.
- Merging to `main` is the website publication decision. Guidance must describe released npm capabilities or clearly identify upcoming features. npm publication remains separate; follow DEPLOY.md for production verification and rollback.

Verification: `npm run check:maintainer`, `npm run check:public`, `npm run web:build`, `npm run web:check` and `npm test`. Review desktop/mobile and both themes for presentation changes. Package-selection changes also require Distribution's package checks. The maintainer checker verifies links, parent backlinks, reachability and module owner pointers; it does not prove semantic ownership, implementation confinement or safe parallel edits.

## Product maintenance constraints

Preserve the existing compact site identity and page responsibilities. A scoped copy/style request does not authorise changing navigation, redesigning the site, replacing its plain HTML/CSS/JavaScript stack, adding a frontend framework or CMS, or moving content between destinations. Current user instructions can intentionally change these decisions; update the affected owner contract in the same change. Use British/NZ spelling in new prose.

Keep marketing copy release-neutral: no package release badges, version-specific promotion or hard-coded `softwareVersion`. Retain genuine schema identities and Node/format compatibility requirements. Installation uses `npm install -g contract-graph`; update examples use `contract-graph@latest`. Preserve product limitations: graph verification does not prove implementation correctness or eliminate drift. Do not invent CLI/skill behavior to simplify copy.

The root [maintenance menu](../../scripts/urun.mjs), owned by [Distribution](../../src/runtime/distribution/.agent/contract.md), provides both package and Website actions. Website operations remain here; there is no second agent entry or local menu. Papers remain outside website work and both outputs. Hosted previews stay disabled unless the owner requests otherwise; local review never changes publishing settings.

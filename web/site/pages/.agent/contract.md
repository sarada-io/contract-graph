# Website page contract

Parent: [Publication](../../.agent/contract.md). Owns each page's visitor-facing purpose, body, metadata and page-specific presentation inputs.

## Select a page before reading implementation

| Request | Source |
| --- | --- |
| Homepage introduction, structured data or retained video dialog | [home](../home) |
| Why the kit exists and architectural-drift examples | [problem](../problem) |
| Planning/delivery versus prototyping | [ways-to-work](../ways-to-work) |
| Installation, first workflow and included tools/skills | [start](../start) |
| Documentation hub and the shared guide template | [docs](../docs) |
| Public schema landing page | [schema](../schema) |

Marketing pages and the docs/schema hubs have `metadata.json` and `body.html`; optional CSS and structured data live beside them. The [manifest](../../manifest.json) selects these authored pages. Technical guides all use [guide.html](../docs/guide.html); they have no individual body, metadata or manifest entry. [card.html](../docs/card.html) supplies the shared discovery-card markup. Their title, navigation label and description come from the canonical documentation index and Markdown.

## Boundary promises and dependencies

Marketing bodies and the docs/schema hubs are authored here. Technical guide prose is authored once in [root docs](../../../../docs/README.md), owned by [Authoring](../../../../src/skills/.agent/contract.md). The shared guide template provides the hero, breadcrumb, article and next-page links. Architecture/lifecycle figures are derived presentations with source hashes, validated by [Publication](../../.agent/contract.md); update presentation and hash together when the canonical Mermaid source changes.

Metadata supplies the production canonical URL, social text, output path, active navigation and cache-version strings to [Shell](../../shell/.agent/contract.md). Keep one H1 per full page and preserve published fragment IDs. Page-specific CSS belongs beside its page; [Presentation](../../presentation/.agent/contract.md) owns bundle order and common styles. [Interactions](../../interactions/.agent/contract.md) owns browser behaviour: preserve its DOM/data hooks rather than embedding duplicate implementations in bodies.

Adding/moving an authored public route requires its manifest and metadata to agree. Adding a technical guide requires only a direct Markdown filename in the marked public table in `docs/README.md`; Publication generates its route, discovery card and sitemap entry. Coordinate retired URLs with [Static resources](../../static/.agent/contract.md). Do not remove legacy destinations as an incidental page edit.

Verification: [site-promises.test.mjs](../../../test/site-promises.test.mjs), [shared-content.test.mjs](../../../test/shared-content.test.mjs) and [sitemap.test.mjs](../../../test/sitemap.test.mjs). Run `npm run web:build` and `npm run check:maintainer`; inspect changed copy/layout at desktop/mobile widths and in both themes when relevant.

## Accepted page roles and design

Preserve approved copy during styling work; the current body is the copy source, rather than a duplicated prose specification. Scope CSS to its owning page and inspect surrounding/responsive rules before changing selectors.

- `/` remains a compact two-column introduction: hero and two-step quick start on the left, video and Why/How destination cards on the right; stack on mobile and keep the footer directly after it. Keep the selected Set up tab, optional read-only assessment tab, Node prerequisite and Windows `cg.cmd` fallback. The overview opens the existing video dialog through `#watch`, staying on-site; do not restore the removed Explore card or long detail sections.
- `/problem/` owns architectural drift. Preserve its intent heading and neutral pinned definition note, approximately 55/45 on desktop and stacked on mobile. Follow with symptoms, causes and solution in that order. Symptom/cause cards are equal-width pairs, five semantic list rows each, tinted header/footer bands and inset separators; no zebra striping, rankings, per-row icons or interactive decoration for static text. Do not clip text with fixed heights.
- `/ways-to-work/` keeps plan-and-deliver for understood outcomes and prototyping for uncertain experiences. Both proceed to sign-off; accepting a preview does not complete delivery.
- `/start/` combines setup and kit contents: installation, terminal/agent steps, first workflow, `#whats-included`, `#skills`, then further guides. Keep equal-width setup columns aligned with the outer container. `cg init` prepares a repository; `/cg-warmup` confirms project context. Retain Warmup, Plan, Produce, Prototype, Sign-off and Unblock.
- `/docs/` discovers the public technical guides; `/docs/.../` holds their focused detail and in-page navigation. `/schema/` remains the human schema index. Dedicated destinations retain detail instead of collapsing into the homepage. Compatibility pages do not become independent content again.

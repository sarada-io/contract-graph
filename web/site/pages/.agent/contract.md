# Website page contract

Parent: [Publication](../../.agent/contract.md). Owns each page's visitor-facing purpose, body, metadata and page-specific presentation inputs.

## Select a page before reading implementation

| Request | Source |
| --- | --- |
| Homepage introduction, structured data or retained video dialog | [home](../home) |
| Why the kit exists and architectural-drift examples | [problem](../problem) |
| Planning/delivery versus prototyping | [ways-to-work](../ways-to-work) |
| Installation, first workflow and included tools/skills | [start](../start) |
| Documentation discovery and individual guide shells | [docs](../docs) |
| Public schema landing page | [schema](../schema) |

Each declared page has `metadata.json` and `body.html`; optional CSS and structured data live beside it. The [manifest](../../manifest.json) is Publication's page allowlist. [AGENTS.md](../../../AGENTS.md) records accepted navigation, page roles and copy/design decisions.

## Boundary promises and dependencies

Marketing bodies and the docs/schema hubs are authored here. Technical guide prose is authored once in [root docs](../../../../docs/README.md), owned by [Authoring](../../../../src/skills/.agent/contract.md). Individual guide bodies provide their hero and one generated-documentation slot. Architecture/lifecycle figures are derived presentations with source hashes, validated by [Publication](../../.agent/contract.md); update presentation and hash together when the canonical Mermaid source changes.

Metadata supplies the production canonical URL, social text, output path, active navigation and cache-version strings to [Shell](../../shell/.agent/contract.md). Keep one H1 per full page and preserve published fragment IDs. Page-specific CSS belongs beside its page; [Presentation](../../presentation/.agent/contract.md) owns bundle order and common styles. [Interactions](../../interactions/.agent/contract.md) owns browser behaviour: preserve its DOM/data hooks rather than embedding duplicate implementations in bodies.

Adding/moving a public route requires the manifest, page metadata and [Static resources](../../static/.agent/contract.md)'s sitemap/compatibility rules to agree. Do not remove legacy destinations as an incidental page edit.

Verification: [site-promises.test.mjs](../../../test/site-promises.test.mjs), [shared-content.test.mjs](../../../test/shared-content.test.mjs) and [sitemap.test.mjs](../../../test/sitemap.test.mjs). Run `npm run web:build` and `npm run check:maintainer`; inspect changed copy/layout at desktop/mobile widths and in both themes when relevant.

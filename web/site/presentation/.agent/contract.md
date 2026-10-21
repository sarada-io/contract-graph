# Website presentation contract

Parent: [Publication](../../.agent/contract.md). Owns the shared visual system and explicit CSS cascade consumed by all full pages.

## Source routes

- [entry.json](../entry.json) lists the exact source order for `styles.css`, including interleaved page-owned CSS. Publication concatenates those bytes; do not replace the order with recursive discovery or alphabetical sorting.
- [theme/tokens.css](../theme/tokens.css) owns colours, typography and theme variables.
- [navigation](../navigation) owns header/footer layout and desktop navigation rules.
- [components](../components) owns reusable controls, cards, prose, sections, diagrams' surrounding layout and shared responsive rules. Select the existing selector before changing implementation.
- Page-specific CSS remains with [Pages](../../pages/.agent/contract.md), including docs diagrams; coordinate entry order here when those files change.

## Boundary promises

Preserve the accepted brand, self-hosted fonts, light/dark theme variables, spacing and responsive behaviour described by [Pages](../../pages/.agent/contract.md) and [BRANDING.md](../../../BRANDING.md). Keep readable contrast, focus states and reduced-motion handling. Scoped page changes must not silently alter unrelated pages, and shared changes need review at every affected layout.

[Shell](../../shell/.agent/contract.md) owns the structural selectors; [Interactions](../../interactions/.agent/contract.md) owns state/data/ARIA changes. Coordinate changes across those interfaces. Update affected page metadata cache tokens when changing published styles. CSS and browser fragments are direct bundle inputs; their ownership is declared here and by entry lists without injecting maintainer comments into the served bytes.

Verification: ordered-bundle preservation in [publication.test.mjs](../../../test/publication.test.mjs), followed by `npm run web:build` and `npm run check:maintainer`. Tests do not establish visual quality: inspect desktop/mobile, both themes and document overflow for visual changes.

Use the existing IBM Plex Sans/Mono fonts, navy/teal/blue palette, rounded cards and theme variables. Keep a compact, calm and legible presentation, readable contrast, semantic headings, visible focus, skip links, reduced motion and keyboard access. Preserve system theme plus visitor override. Avoid mobile overflow, oversized empty gaps, tiny text used to force a fit and hard-coded single-theme colours. Check desktop/mobile and both themes for changes; reset temporary browser viewport overrides. Guide cache tokens inherit from the docs hub metadata.

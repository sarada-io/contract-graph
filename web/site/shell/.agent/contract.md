# Website shell contract

Parent: [Publication](../../.agent/contract.md). Owns the shared document frame and strict rendering interface consumed by full pages.

## Surface and implementation

- [render.mjs](../render.mjs): `renderTemplate(template, slots)` accepts exactly the named string slots; `renderPage(metadata, body, templates, structuredData)` validates page metadata and composes the common HTML.
- [document.html](../document.html) sets document structure and script placement; [head.html](../head.html) sets canonical/social metadata and assets.
- [header.html](../header.html) and [footer.html](../footer.html) own shared navigation, accessible external links and attribution.
- [theme-bootstrap.html](../theme-bootstrap.html) applies the stored/system theme before paint. Runtime theme switching belongs to [Interactions](../../interactions/.agent/contract.md); visual tokens belong to [Presentation](../../presentation/.agent/contract.md).

## Boundary promises

Every full [page](../../pages/.agent/contract.md) uses this shell. Preserve required destinations, skip navigation, menu/control hooks, footer contact/credit and exactly the selected primary navigation state. Redirect fallback HTML belongs to [Static resources](../../static/.agent/contract.md) and does not acquire the full shell.

Metadata is plain data: escape it, reject unknown/missing fields and require the production canonical URL to match the output route. Insert trusted repository page HTML in one pass without interpreting inserted content as template instructions. Preserve pre-paint theme behaviour and coordinate changes to browser selectors or CSS with their owning siblings. Adding a shell slot requires its caller and template to change together.

Verification: shell/escaping/slot fixtures in [publication.test.mjs](../../../test/publication.test.mjs) and integrated navigation/canonical metadata in [site-promises.test.mjs](../../../test/site-promises.test.mjs). Run `npm run web:build` and `npm run check:maintainer`; inspect affected pages, desktop/mobile navigation and both themes when changing rendered structure.

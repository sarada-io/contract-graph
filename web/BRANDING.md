# Contract Graph web brand

The product site is a sibling of [sarada.io](https://sarada.io): same structural
palette, a distinct mark, and a more tool-like type system.

## Direction

The mark is a C-shaped contract boundary around eight connected square nodes
that form a branching capital G: a repository pocket, the contracts inside it,
and the routes between them. The website supports that idea with a precise,
honest system for people building and maintaining software with coding agents.

- navy (`#082844`) for trust, structure, and primary text
- dark teal (`#077B87`) for accessible links and actions
- bright teal (`#11B7A5`) for connection and decorative accents
- blue (`#2F6FE8`) for routes and gradient endpoints
- cool paper (`#F4F7F8`) for the page field
- IBM Plex Sans for product and documentation voice
- IBM Plex Mono for commands, YAML, and CLI

Bright teal and blue are decorative colors. Body copy and small text should use
navy or dark teal so contrast remains accessible.

The site theme follows the visitor's `prefers-color-scheme` setting. The header
control can override that choice; without an override, OS theme changes are
followed live.

## Site assets

| Asset | Use |
| --- | --- |
| `contract-graph-mark.svg` | Ink mark (light surfaces); header/footer identity via CSS mask |
| `contract-graph-mark-white.svg` | Reverse mark for dark surfaces |
| `contract-graph-mark.webp` / `contract-graph-mark-white.webp` | Raster exports of the mark |
| `favicon.svg` | Browser icon; follows `prefers-color-scheme` |
| `favicon-32.png` / `favicon.ico` | Bitmap fallbacks |
| `apple-touch-icon.png` | Saved mobile shortcut |
| `contract-graph-og-v2.jpg` | Social sharing preview (1200×630) |
| `contract-graph-video-poster-v2.jpg` | Retained legacy poster; no longer used on the site |
| `contract-graph-video-poster-v2-800.webp` / `-1280.webp` | Retained legacy responsive posters; no longer used on the site |
| `fonts/ibm-plex-sans-latin.woff2` | Self-hosted IBM Plex Sans (latin, variable 400–700) |
| `fonts/ibm-plex-mono-latin-400.woff2` / `-500.woff2` | Self-hosted IBM Plex Mono (latin) |
| `contract-graph-composition-spine.svg` | Mental-model diagram |

Sarada lockups do not appear in the header. Credit Sarada in the footer as the
open-source home of the project.

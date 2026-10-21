# Website browser interaction contract

Parent: [Publication](../../.agent/contract.md). Owns the browser startup sequence and visitor controls bundled as `site.js`.

## Select the behaviour

| Behaviour | Source |
| --- | --- |
| Deferred analytics setup and shared `report` function | [analytics/startup.js](../analytics/startup.js) |
| Mobile navigation, Escape/outside click and desktop transition | [navigation/startup.js](../navigation/startup.js) |
| Stored theme override, system preference and theme-colour updates | [theme/startup.js](../theme/startup.js) |
| Quick-start tabs, keyboard selection and focus | [commands/tabs.js](../commands/tabs.js) |
| Clipboard controls and success/failure feedback | [commands/copy.js](../commands/copy.js) |
| Legacy video dialog, iframe lifetime and watch hash | [video/startup.js](../video/startup.js) |
| Engagement measurements | [analytics/engagement.js](../analytics/engagement.js) |

## Integration promises

[entry.json](../entry.json) is the sole startup order. Publication concatenates complete statement fragments inside one IIFE; fragments are not separately loaded browser modules. Analytics defines `report` before its consumers. Preserve synchronous setup and deferred analytics loading; do not introduce duplicate handlers or another page-level implementation.

Coordinate DOM IDs, classes, data attributes and ARIA hooks with [Shell](../../shell/.agent/contract.md) and [Pages](../../pages/.agent/contract.md); coordinate state classes with [Presentation](../../presentation/.agent/contract.md). Keep keyboard/focus behaviour, theme override persistence, clipboard failure feedback, dialog cleanup and existing hash compatibility. Preserve the established analytics property and event meaning; changing tracking is an explicit product decision under [AGENTS.md](../../../AGENTS.md).

Verification: [interactions.test.mjs](../../../test/interactions.test.mjs) executes the generated bundle against behaviour fixtures; [publication.test.mjs](../../../test/publication.test.mjs) verifies the wrapper and declared byte order. Run `npm run web:build` and `npm run check:maintainer`; use a real browser for changed navigation, clipboard, theme or video interactions, because fixtures do not prove browser integration or accessibility.

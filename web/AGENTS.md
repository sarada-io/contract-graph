<!-- Website source imported as a reviewed snapshot; internal records and source Git history are excluded. -->

# Agent guide: Contract Graph Dev Kit website

This file applies to web/ within the combined public repository. Start at [the repository contract](../.agent/contract.md), follow [the website application contract](.agent/contract.md), then select its responsible child before reading implementation. Read this guide before editing. It records
owner decisions from the website work on 24 September 2026, not just generic
coding advice. Its purpose is to prevent agents from undoing accepted decisions,
duplicating content, or replacing the design without consultation.

## 1. Essential rules — read even for small tasks

- Preserve the existing design and information architecture. This is an existing
  product site, not a blank canvas or a request for a new landing page.
- Make the smallest coherent change that satisfies the current request. A request
  to tighten padding does not authorise rewriting copy or reorganising pages.
- Do not radically redesign, introduce a new visual language, change the stack,
  remove navigation destinations, or redistribute page ownership without discussing
  that specific change with the user first, unless they have already requested it.
- Do not ask again for permission to do an explicitly approved change. Routine
  fixes, scoped copy edits, alignment, and verification can proceed directly.
- Suggestions and implementation are different: if the user asks for advice,
  explain the recommendation. When they accept it, implement the agreed scope.
- New explicit user instructions override these recorded decisions. After an
  intentional change to a lasting decision, update this file to prevent reversion.
- Preserve existing uncommitted work. A dirty checkout may contain the owner's
  work or earlier accepted changes. Do not reset files to HEAD to simplify a task.
- Keep documentation, GitHub, and npm reachable. Their disappearance was an
  explicitly corrected regression during this work.
- Keep site copy release-neutral. Do not reintroduce a package release badge,
  release-specific marketing copy, or a hard-coded softwareVersion in metadata.
- The owner authorised automatic website publication from `main` on 21 October 2026. After the one-time setup in DEPLOY.md, successful current `main` pushes deploy through GitHub Actions after Linux, Windows and security checks. Feature branches and pull requests only validate. Editing, building and local preview never deploy; npm publication remains separate.

## 2. Repository and runtime

The owner approved source composition and automatic generation before deployment
on 25 September 2026. Use the maintainer graph for responsibility and [site/EDITING.md](site/EDITING.md) for its concrete editing surface. The design and page ownership decisions below remain authoritative.

This directory owns the website for **Contract Graph Dev Kit**. The CLI lives at ../src/; canonical human guides live at ../docs/ and schemas at ../src/cg/schema/. The merge is authorised; preserve the existing website stack, design and routes.

- Plain HTML, CSS, and JavaScript; the existing Node assembler generates static output. The shared Markdown renderer is a root development dependency; no frontend framework or browser runtime dependency is added.
- `site/` owns editable sources and contracts. `public/` is generated output and
  remains the sole served/uploaded asset root. Do not hand-edit generated files.
- `site/presentation/entry.json` owns stylesheet order; `theme/`, `navigation/` and
  `components/` own common styling. Page-specific CSS lives beside page content.
- `site/interactions/entry.json` owns browser startup order; `navigation/`, `theme/`,
  `commands/`, `video/` and `analytics/` own their named behaviours. Publication
  preserves the existing IIFE and synchronous initialisation order.
- `site/shell/` owns the shared document head, header, footer and theme bootstrap.
  `site/pages/` owns marketing bodies and page metadata; ../docs/ owns technical guide prose. `site/manifest.json` lists website outputs; documentation.mjs explicitly selects shared guide and schema inputs.
  The assembler uses literal slots only, with no template expression language.
- `scripts/urun.mjs` provides the local menu and compatible exports; `scripts/preview/`
  owns HTTP serving and `scripts/maintenance/` owns generated-file checks; `site/documentation.mjs` selects the shared guide and schema inputs.
- `urun`, `urun.cmd`, and `run-dev.sh` are launchers; reuse them.
- Cloudflare Workers Static Assets hosts the site, NOT Cloudflare Pages or Sites.
- Do not add React, Tailwind, a bundler, a component framework or a CMS for ordinary website changes. Reuse the Node assembly path and the root build-only Markdown renderer.
- Keep this file at repository root, outside `public/`.
- `papers/` holds published paper sources, one directory per paper. It is not
  website content: do not assemble or serve it, and do not edit a paper during
  website work.

Read `README.md` for commands, `BRANDING.md` for assets and palette, and `DEPLOY.md`
for hosting. Deployment examples in those documents are instructions for an
already-authorised deployment, not permission to deploy during an unrelated task.

## 3. Agreed navigation

Full site pages use this header order:

1. Brand mark and “Contract Graph Dev Kit” → `/`
2. **Why Dev Kit** → `/problem/`
3. **How to use** → `/ways-to-work/`
4. **Get Started** → `/start/` (visually prominent pill/button)
5. **Docs** → `/docs/`
6. GitHub icon → `https://github.com/sarada-io/contract-graph`
7. npm icon → `https://www.npmjs.com/package/contract-graph`
8. Existing theme control; mobile menu toggle at the appropriate breakpoint.

Use the exact label **Why Dev Kit**, with spaces. Do not revert to “Why DevKit”.
Do not rename “How to use” back to “How it works” in navigation without a request.
“What's included” is no longer a separate primary navigation destination.

The three core destinations were simplified, then Docs and the external icons
were explicitly restored. The final decision includes ALL of them. Do not treat
an earlier three-link proposal as the current specification.

- Preserve `id="site-nav"`, mobile toggle behaviour, accessible icon names, and
  `aria-current="page"` on the actual current destination.
- External links retain `target="_blank"`, `rel="noopener"`, and accessible
  “opens in a new tab” text where used.
- A site-wide header change belongs in `site/shell/header.html` and must regenerate
  every full page, including Docs and Schemas. Preserve page-specific active state.
- Do not inject full navigation into small redirect fallback pages.
- Footer links remain Why Dev Kit, How to use, Get Started, Dev Kit Docs, GitHub,
  and npm, with the existing contact and Sarada credit.
- Retain `hello@contractgraph.dev`, the existing brand mark, and footer attribution.

## 4. Page ownership and visible structure

| URL | Purpose | What belongs here |
| --- | --- | --- |
| `/` | Compact product introduction and routing | Existing hero, quick start, three destination cards, footer |
| `/problem/` | Why the Dev Kit is useful | Intent heading, pinned drift note, symptoms, causes, solution |
| `/ways-to-work/` | How to use it | Plan and deliver; explore through prototyping; owner/agent responsibilities |
| `/start/` | Setup AND kit contents | Install, initialise, warmup, first workflow, included files/tools/skills, further guides |
| `/docs/` | Detailed documentation hub | Links to the existing technical guides |
| `/docs/.../` | Detailed technical guidance | Existing focused documentation and in-page navigation |
| `/schema/` | Schema reference | Human index and canonical schema files |
| `/whats-included/` | Compatibility URL | Redirect to `/start/#whats-included`; no independent content page |

Do not collapse all pages into the homepage. Do not re-create separate product,
developer, or included-content pages merely because old aliases still exist.
Dedicated pages hold the detail; the homepage helps visitors choose where to go.

### Homepage: keep it short

Keep the established desktop composition: broad main hero on the left and stacked
navigation cards on the right. Stack sensibly on mobile.

Hero heading:

> Give your coding agent lasting context and a clear workflow.

Keep the existing short product explanation. The quick start has two steps:

1. **Step 1: Install in a terminal** — `npm install -g contract-graph`.
2. **Step 2: Choose an option** — accessible tabs using the existing quick-start behaviour:
   - **Set up the project** is selected and visible by default: `cg init` in the
     repository’s terminal, then `/cg-warmup` in the coding agent; link to `/start/`.
     On Windows PowerShell, the terminal command is `cg.cmd init` when `cg` does not start.
   - **Unsure of adaptation?** is initially inactive. Its panel contains the exact
     copyable prompt: “Use "cg analyse" (or "cg.cmd analyse" on Windows PowerShell)
     to assess this repository for Contract Graph adoption.” Include a copy button
     and link to `/docs/analyse/`. The repository stays unchanged. The install in
     step 1 remains the prerequisite; do not repeat it inside this panel.

Show only the selected panel; preserve keyboard tab navigation and mobile text wrapping.
Use a connected tab bar with a shared baseline, a top accent on the active tab,
and a bordered content panel. Both active and inactive tabs have visible borders
and rounded top corners, not pill shapes.
Retain the Node.js prerequisite, the Windows PowerShell `cg.cmd` alternative, and
project-context confirmation guidance.
Do not change CLI prerequisites without checking evidence.

The right-hand rail contains, in order:

1. A compact video thumbnail with a centred play icon, labelled
   “Watch Overview”, opening the embedded video in the existing dialog via #watch.
   Keep visitors on the website; do not make the card navigate to YouTube.
2. “Why do we need a Dev Kit?” → `/problem/`
3. “How do I use it?” → `/ways-to-work/`

The owner removed the Explore card on 25 September 2026. Docs, GitHub and npm
remain reachable through the header and footer. Keep the introduction and
Get started commands together in the left hero; on mobile the rail stacks below.
The current video is https://youtu.be/wddXz-8AmlE. Preserve legacy /watch routing.
Do not restore long content sections below the hero. The footer follows the hero.

Keep the detailed assessment procedure in `/docs/analyse/`, linked from the
assessment tab and the Docs hub; Get Started retains its existing setup.

### Problem page: agreed opening

Keep the breadcrumb and small “Why Dev Kit” label.

Heading:

> It keeps the code aligned with your intent and minimises the drift.

Pinned note:

> **Drift** is the gap between the software you think you have and the software your coding agent has actually built.
>
> As the software grows, that gap can widen, making even small changes harder to understand, implement, and verify.

- Desktop introduction uses approximately **55% left / 45% right**, with the
  heading on the left and the pinned note on the right, vertically balanced.
- The note has a small pin icon and “Pinned note” label, neutral surface, subtle
  border/shadow, normal body-sized text, bold “Drift”, and a muted consequence.
- No teal callout stripe, bright teal note fill, large definition heading, or
  duplicated “Why Dev Kit?” question. Those approaches were explicitly superseded.
- On mobile, stack the intent above the note. Keep note text left-aligned.
- Classes: `.drift-intro`, `.drift-intent`, `.drift-note`, `.drift-note-label`,
  `.drift-note-impact`. Prefer editing these owners over adding competing rules.

Then show these sections in order:

1. **What does drift look like?**
   Intro: “Drift can show up in the structure of the code and its behaviour.”
   Equal-width cards: Code structure drift / Behaviour and logic drift.
2. **Why does drift happen?**
   Intro: “Agent behaviours and session conditions can both contribute to drift.”
   Equal-width cards: Coding agent problems / Coding session problems.
3. **How does Contract Graph Dev Kit help?**
   Existing solution explanation and three cards: Shared project context,
   Contracts and dependencies, Guided delivery workflow.
4. Existing How to use / Get started actions, then footer.

Do not infer that the 55/45 introduction means every card grid should be unequal.
The paired list blocks stay equal-width on desktop and stack on mobile.

### Problem page: final row styling

The four symptom/cause cards deliberately use designed rows, not visible bullets:

- Five items per card, preserving semantic lists (`ul role="list"`).
- Tinted title band, uniform body-row background, subtle inset separators aligned
  with the text, and a narrow bottom strip matching the header tint.
- No zebra stripes; alternating row colours were tried and explicitly removed.
- No numbered rankings, added icons per row, or interactive hover treatment for
  static text unless specifically requested.
- Compact padding and readable body text; do not inflate these into large cards.
- Footer strip stays at the bottom of the card and follows its rounded corners.
- Current owner: `.drift-look`; pairing: `.drift-pair`.
- Current baseline: header padding `1.1rem 1.4rem`, row padding `0.85rem 1.4rem`,
  row minimum height `4.25rem`, body font `0.95rem`, line-height `1.55`, footer
  strip `0.65rem`. These are a reference, not a reason to resist an explicit edit.
- Do not force equal fixed heights that clip text at narrower widths or zoom.

### Problem page: preserve the accepted five-item lists

Code structure drift:

1. New code takes on work an existing component already owns.
2. Related functionality gets scattered across distant modules or components.
3. Circular dependencies form between components, making changes harder to isolate.
4. Small changes require edits across many unrelated files.
5. Components grow to handle several unrelated responsibilities.

Behaviour and logic drift:

1. The same behaviour gets implemented twice in different parts.
2. Similar features behave differently across the application.
3. Special cases accumulate, making the original logic harder to follow.
4. Old and new implementations coexist without a clear replacement.
5. Changes add new code because the right place isn’t clear.

Coding agent problems:

1. Repeated fixes can reinforce a mistaken assumption instead of correcting it.
2. Agents can stop at a working solution before checking architectural fit.
3. Agents can follow nearby patterns without checking their wider consequences.
4. Agents can expand the scope beyond what the change requires.
5. Existing workarounds can become patterns the agent copies and spreads.

Coding session problems:

1. Undocumented design decisions can leave agents guessing where changes belong.
2. Earlier constraints can be overlooked or lost as sessions grow.
3. Keyword searches can find relevant code while missing wider context.
4. Outdated documentation can steer agents towards structures that no longer exist.
5. Passing tests can hide changes that weaken the existing architecture.

Do not re-add the removed tool-failure item to the session list or the removed
business-rules item to structure drift. Do not add the generic “ambiguous requests”
point to this comparison: the owner chose to focus on architectural drift.
These are possible failure modes, not claims that every agent always behaves so.

### Get Started: one combined destination

Maintain this order:

1. “Install, then confirm the project.” and prerequisite/setup introduction.
2. “In a terminal”: install CLI and run `cg init` in the target repository.
3. “In your coding agent”: `/cg-warmup` and project-context confirmation.
4. “Choose your first workflow”: link to detailed workflows.
5. `#whats-included`: included skills, CLI tools, contracts, and project files.
6. `#skills`: the six skills and what each is for.
7. Further written guides and existing footer.

Desktop setup uses two equal columns, terminal left and agent right. The hero,
setup, and kit contents share the outer container alignment. Do not put setup
back into a narrow centred `.container.prose` while surrounding sections are wide.
Use `.start-page`, `.start-steps`, and `.start-workflow` for page-specific styling.
The hero is deliberately smaller than the old oversized, heavily wrapped title.
Mobile stacks the steps. Preserve readable command blocks and wrapping paths.

The skills are Warmup, Plan, Produce, Prototype, Sign-off, and Unblock. Do not
invent commands or silently alter lifecycle behaviour to simplify marketing copy.
`cg init` prepares the repository; `/cg-warmup` confirms project context. They are
not interchangeable and installation alone does not confirm intent.

### How to use and Docs

- Preserve the two modes on `/ways-to-work/`: plan and deliver for understood
  outcomes; prototype for uncertain experiences. Both proceed to sign-off.
- Keep the distinction between accepting a preview and completing delivery.
- Docs are a substantial existing part of this site, not optional collateral.
- Preserve the hub and guides for vision, contracts, workflow, lifecycle,
  architecture, intent, prototype, experts, and upgrade.
- Preserve technical limitations and verification caveats. Do not imply graph
  validation proves implementation correctness or that the kit eliminates drift.

## 5. Evergreen wording and technical compatibility

The owner explicitly requested that the website remain useful across releases.

- No “Release 0.7.0”, “Public beta 0.7.0”, or similar package-version promotion.
- The homepage currently says “Open source · Public beta”; do not add a number.
- Do not restore `softwareVersion` as a stale hard-coded JSON-LD field.
- Upgrade examples use `contract-graph@latest`; basic installation remains
  `npm install -g contract-graph`.
- Use “update an existing installation”, “installed release”, or a feature/format
  description when that is more accurate than a historical release label.
- Do not erase compatibility constraints just to remove version wording. Describe
  required capabilities and supported formats, or consult the actual implementation.
- Schema `v1` identifiers, Node.js requirements, and format identities are NOT
  marketing package versions. Do not remove or invent changes to them.
- Preserve old anchors such as upgrade `#to-070` as compatibility anchors, while
  the visible heading and current navigation use `#update`.
- Release-neutral copy still needs verification when product behaviour changes;
  do not claim it guarantees compatibility with every future implementation.

## 6. Visual system and accessibility

- Reuse the existing IBM Plex Sans and IBM Plex Mono self-hosted fonts, brand
  assets, navy/teal/blue palette, rounded cards, restrained backgrounds, and spacing.
- Use theme variables (`--surface`, `--ink`, `--text-muted`, `--border`, etc.).
  Avoid hard-coded colours that only work in one theme.
- Both dark and light themes are supported; follow system preference and preserve
  the visitor's override. Do not force a default theme during a layout fix.
- Keep one H1 per content page, H2 section headings, H3 card headings. Do not use
  headings solely to enlarge paragraphs.
- Keep skip links, accessible navigation names, keyboard focus, readable contrast,
  icon descriptions, reduced-motion handling, and semantic content.
- Do not introduce large empty vertical gaps, tiny text to force a fit, fixed-width
  mobile overflow, or one-size-fits-all grid changes.
- User preference here is compact, calm, legible presentation. Decorative changes
  are not automatically improvements.
- Use British/NZ spelling in new prose: behaviour, minimise, initialise.
- Preserve exact approved wording during styling work unless asked to revise it.

## 7. URLs, metadata, schemas, and legacy support

- Production canonical origin is `https://contractgraph.dev`; never replace it
  with localhost metadata because the preview runs locally.
- Keep titles, descriptions, Open Graph, sitemap, robots, and canonical URLs
  coherent when changing pages. Do not stamp all pages with the homepage title.
- `/whats-included/` is a permanent redirect in `_redirects`, with a small noindex
  HTML fallback for the local static server. Keep both. Its fallback preserves
  existing hashes such as `#skills` and defaults to `#whats-included`.
- Keep old `/community/contract-graph/...`, `/for-developers/`, `/for-product-managers/`,
  `/cg`, `/watch`, and schema aliases unless specifically authorised to retire them.
- Some old developer URLs route through `/whats-included/`; a redirect chain is
  not permission to delete compatibility destinations.
- The sitemap includes indexable pages, not noindex redirect shells. Keep lastmod
  accurate for changed content; do not update every date for an unrelated edit.
- Public schema files are generated from ../src/cg/schema/ and must preserve their exact schema identities. Never restore authored website schema copies.
- Keep GA property `G-WFGE117XBY`; do not substitute Sarada's property or introduce
  new tracking for an unrelated request.

## 8. Working procedure to avoid drift

Before editing:

1. Read this file and inspect `git status --short`.
2. Identify the actual owning HTML, CSS selectors, and any JS behaviour.
3. Inspect the current rendered page for layout tasks. Search results alone are
   not enough to judge alignment, spacing, theme, or responsive behaviour.
4. State the intended scoped change briefly. Ask only when the unresolved choice
   materially changes the agreed structure or requires new authorisation.

While editing:

- Read surrounding code and responsive overrides before appending CSS. Prefer
  updating an existing owner rule over accumulating specificity patches.
- Page-specific changes should be scoped; global selectors affect Docs too.
- If changing a shared header/footer, inspect all full pages and preserve active
  navigation state. Exact string replacements can silently miss variants.
- Keep lists and text in their assigned pages; do not copy long sections elsewhere
  to work around a navigation or layout problem.
- Do not infer deletion from absence in a screenshot: hidden mobile navigation,
  redirect fallbacks, dialogs, and deep-link handlers can still be required.
- Bump the stylesheet query token in affected `site/pages/**/metadata.json` files
  when CSS changes so cached deployments load the intended stylesheet. Existing
  tokens vary; do not mistake that for multiple stylesheet implementations.
- Edit only the owning source for a one-line copy request; generated output follows
  from assembly. Do not reformat unrelated page sources.
- Do not mix deployment, dependency updates, schema refreshes, or cleanup of
  unrelated assets into a visual adjustment.

Verification:

```sh
# Reuse an existing server if it is already serving this repository.
./urun serve
# Equivalent noninteractive entry:
node scripts/urun.mjs serve --port 4173

# Generate before the existing test suite:
./urun build

# Existing test suite:
node --test test/*.test.mjs

# Static file presence check (propagates failure):
node --input-type=module -e 'import { checkSiteFiles } from "./scripts/urun.mjs"; process.exitCode = checkSiteFiles();'

git diff --check
```

- `./urun build` assembles `public/`; `./urun check` checks output freshness.
  `node scripts/build-site.mjs` generates and runs the deployment checks.
  Run `npm ci` at the repository root first; the Markdown renderer is a build-only development dependency.
- On macOS, one existing cwd test can encounter `/var` versus `/private/var`
  temporary-directory aliases. In that case rerun with a canonical temporary root:
  `TMPDIR=/private/tmp node --test test/*.test.mjs`. Explain the distinction rather
  than claiming an initial failure never happened or changing production code.
- For small copy edits, inspect the exact result and diff; unnecessary new tests
  are not useful. For navigation/page moves, run existing tests and check links,
  redirects, anchors, sitemap, and active menu states.
- For layout changes, visually verify desktop and mobile and check overflow.
  Check both themes when changing colours. Reset temporary viewport overrides.
- Check restored icons and links at the desktop/mobile breakpoint, not only at
  a very wide desktop viewport.
- Test the behaviour actually changed; unit tests do not prove visual quality.
- Do not overwrite a running user's server or close their browser tabs casually.

After editing:

- Review the diff for unintended changes and stale wording/links.
- Report what changed, what was checked, and any real limitation, concisely.
- Do not claim a screenshot, test, redirect, or deployment was verified unless it was.
- Keep local edits reviewable. A request to “close” the work does not by itself
  authorise a production push or destructive cleanup.

### Combined repository build and cutover

Run `npm ci` at the repository root before website builds. `npm run web:build` builds and runs the website checks; `npm run web:check` verifies freshness without writes. Follow DEPLOY.md for GitHub Actions secrets, the website-production environment and disabling the old Workers Builds integration. GitHub Actions is the single production publisher after activation; do not reconnect Cloudflare Git builds as a second publisher. Merging to `main` authorises website publication, including guides and schemas, so review release alignment before merging. Keep hosted previews disabled and preserve canonical URLs. External configuration and live deployment must be verified separately from local validation.


## 9. Decision maintenance

This guide is the durable record for future sessions. Update it when the user
explicitly changes page ownership, navigation, design direction, approved copy,
or compatibility policy. Keep superseded decisions clearly marked or replace
them; do not leave two conflicting “current” specifications.

If current files disagree with this guide, check recent changes and the user's
latest instructions before blindly restoring either version. Worktree differences
may be intentional work in progress. Explain a material conflict and consult the
user when its resolution would overturn an accepted design decision.

A future redesign can be appropriate, but it must be an intentional, discussed
project decision. “Improve”, “polish”, “fix alignment”, or “make it cleaner” should
not be interpreted as permission to replace this site's identity or structure.

## Hosted preview policy — 25 September 2026

The owner requested removal of public previews. Keep `preview_urls: false` in
Wrangler and hosted preview URLs and non-production branch builds disabled in
Cloudflare. Use `./urun serve` for local review. Re-enabling hosted previews
requires explicit owner authorisation. Main-merge production publishing remains.

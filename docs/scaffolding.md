# Scaffolding Contract Graph

This is the contributor guide to changing what `cg init` writes. The executable source of truth is
`SCAFFOLD_MAPPING` in `src/scripts/init.js`; editor discovery is configured separately under
`src/scaffold/profiles/`.

## Source mapping

| Package source | Repository target | Mode | Install policy |
|---|---|---|---|
| `src/principles/*.md` | `.agents/cg/principles/` | always — all six families | preserve |
| `src/governance/` | `.agents/cg/` | always | preserve |
| `src/skills/` | `.agents/skills/` | always | replace |
| `src/scaffold/hooks/` | `.agents/hooks/` | always | replace |
| `src/scaffold/rules/` | `.agents/rules/` | always | preserve; `sync` owns the generated content |
| `src/scaffold/module/` | `src/` | greenfield starter only | preserve |
| `src/scaffold/docs/plans/` | `docs/plans/` | always | preserve |
| `src/scaffold/docs/design/` | `docs/design/` | always | preserve |
| `src/scaffold/docs/guides/` | `docs/guides/` | always | preserve |
| `src/scaffold/profiles/` | nowhere | read by `init`, never copied | n/a |

The rules are directory-level so a new asset needs no per-file manifest edit. `replace` updates
framework core after showing the plan; `preserve` never overwrites repository context. That
distinction makes `cg init` both the install and upgrade command.

The starter module is written only when the repository has no detected project content. A
brownfield install leaves the example `src/` tree out and clears its example inheritance entry so
`cg-warmup` can map the real modules instead.

Scaffolding `cg-gate.mjs` does not activate it: hook settings remain user-owned. Registration is
documented once, in the root README.

`init` also writes `.agents/cg/map/profile.json` with the selected editor profiles and the docs
root, records installed-file baselines in `manifest.json`, and appends ignore rules for auto-run
ledgers. `sync` and `verify` use the profile record to distinguish a missing selected artifact from
an editor that was never selected.

## The two mapping detectors

The test suite checks the mapping in both directions:

1. **Coverage:** every file under `src/`, excluding runtime code in `src/scripts/` and profile
   configuration in `src/scaffold/profiles/`, must match exactly one mapping rule. Add a file under
   `src/` without extending the mapping and the test reports that file as unmapped. Overlapping
   rules fail too.
2. **Round trip:** `init` scaffolds a temporary repository and its file set is compared with an
   independently encoded canonical source-to-target mapping. This catches a source rule aimed at
   the wrong target, even if the copy itself succeeds.

Both tests are in `test/verify.test.js`. When changing the mapping, mutation-check the relevant
detector: add an intentionally unmapped file or temporarily redirect a target, confirm the focused
test goes red, then restore the mutation.

## Adding an editor profile

Do not start with a blog post or another tool’s convention. Establish what the editor actually
reads first. For an installed application whose bundle contains literal path patterns, a useful
first pass is:

```bash
grep -rho --binary-files=text -E '\{"filenamePattern":"[^"]*"\}' \
  "/Applications/<Editor>.app" | sort -u | grep -Ei "agent|rule|workflow|skill"
```

String-literal search proves presence, not absence: dynamically constructed paths will not appear.
Confirm the result by placing a minimal artifact in a scratch repository and checking the real
editor UI.

Once the discovery surface is verified:

1. Add `src/scaffold/profiles/<name>.scaffolding.conf.json`.
2. Give it a lowercase `name`, user-facing `displayName`, `rootPointers`, optional
   `skillWrappers`, and `extends`.
3. Use `extends` for unions. `all` extends the individual profiles rather than copying them.
4. Add exact-artifact tests: the profile must write everything it owns and nothing owned only by
   another profile. Also test missing selected artifacts and absent unselected artifacts.
5. Test malformed fields, unknown names, and any new inheritance path. Profile loading rejects a
   cycle by its chain and fails before `init` writes a partial repository.
6. Run `npm test`, then `./cg try <name>` and open `tmp/<name>` in the real editor.

A profile can be a named no-op. That is preferable to inventing a redundant file merely to make
the configuration look substantial.

### The boundary a profile may not cross

A profile adds discovery artifacts. It never changes governance. `every profile scaffolds
byte-identical universal governance` asserts this directly: it scaffolds every bundled profile and
compares everything outside the discovery surface byte for byte, with `.agents/cg/map/profile.json`
the single permitted difference because it records the selection.

Without that test the neutrality claim would be assumed rather than checked. Per-profile artifact
tests cannot catch it — a profile writing its own governance file still writes exactly what it
declares, so every one of those tests stays green while `.agents/` stops being the same tree for
every editor.

Mutation-check it by adding a `rootPointers` entry under `.agents/` to any profile config and
confirming the test goes red.

## Document trees may not be conventions only

The three trees under `docs/` are scaffolded rather than assumed. Before they were, `cg-unblock` and
`cg-sign-off` both wrote to `docs/plans/decision-log.md`, `workflow.md` forbade contracts from
citing that path, and the mapping created none of it — a convention with no artifact behind it, in
a tool whose purpose is to reject exactly that.

`every document tree the shipped skills reference is scaffolded` derives its expectation from the
shipped prose: it extracts every `docs-<name>/` mentioned in a skill or governance file and
requires a scaffolded repo to contain it. Naming a fourth tree in a skill therefore fails the build
until a mapping rule creates it.

The seeded files carry the boundary the framework depends on: `docs/plans/` is transient and no
contract may cite it, `docs/design/` is permanent and contracts may. A decision that outlives its
phase moves from the first to the second, or becomes a rule with a detector.

### Relocating them

The three trees sit under a configurable root. `SCAFFOLD_MAPPING` marks their rules `docsRoot:
true`, and `resolveTarget` swaps the leading segment for the repository's choice, so relocation is
one field rather than a special case threaded through the copier. `init` records the root in
`profile.json`; `cg verify` derives the self-sufficiency pattern from that record via
`planPathPattern`, so moving the trees moves the check with them. A rule that only held at the
default path would be a rule the first repository to move its docs escaped.

The prompt lives in `cli.js`, not `init.js`. `init` takes a resolved root and stays
non-interactive, which is what keeps it usable from tests and scripts.

## What ships in the package

`files` lists `bin`, `src`, `docs`, `README.md`, and `LICENSE`, so a new file under `src/` reaches
users by default. Two exclusions keep maintainer-only material out: `!src/scripts/dev.js`, the
`./cg try` helper, and `!docs/RELEASING.md`, the private publishing runbook.

`the published tarball ships consumer sources and no maintainer tooling` runs
`npm pack --dry-run` and asserts both halves — the exclusions hold, and they did not take the
scaffold sources with them, which is how a `files` negation usually fails.

## Worked example: Antigravity

Google Antigravity IDE v2.1.1 was checked against its installed application bundle. It registers
repository discovery for `.agents/rules/**/*.md` and `.agents/workflows/**/*.md`; it also reads a
root `AGENTS.md`. Contract Graph’s universal scaffold already writes `.agents/rules/cg.md`, so the
`antigravity` profile needs no additional discovery artifact. Selecting `codex` or `all` also adds
`AGENTS.md`, but Antigravity does not require that extra pointer to discover Contract Graph.

Two negative findings matter:

- `.agents/skills/` was not registered as an Antigravity discovery path. Contract Graph keeps its
  canonical skills there, but does not claim that Antigravity automatically offers them.
- `GEMINI.md` resolves under `~/.gemini/`, not the repository. A repository scaffolder must not
  write user-global configuration.

Re-run the bundle inspection and scratch-repository check when a new Antigravity version ships.
The recorded result is evidence for v2.1.1, not a permanent promise about another product.

## The phase map

`map/phases.json` records which rule families each lifecycle phase loads. It is
keyed on the rule token — `AP`, `PP`, `DP` — never on a filename. That is the whole point:
principle files can be split, merged, or renamed without touching loading, and loading can change
without touching the files. `workflow.md` already applied this idea to module contracts under its
Lazy-Loading Rule; the phase map is the same rule on the principles axis.

`always` means *load it if this repository selected it*, never *it must exist*. `DP` is excluded
from contract inheritance on purpose — an inherited guide would be unavoidable, and an unavoidable
guide is just a rule — so a repository with no fork-loaded principle files is perfectly valid.

All six families ship, so the phase map is the only thing deciding where each is read. Two
detectors, `[11]`, keep it honest in both directions:

1. **Resolvable** — every token names a real rule family. A typo would otherwise load nothing,
   silently.
2. **Reachable** — every family present is named by at least one phase. A family nothing loads is
   governance nobody reads, which is the same failure an unchecked enforcement map produces.

Adding a seventh family therefore fails verification until you say which phases read it. That is
deliberate: it turns "where does this belong?" into a build question with one obvious answer.

## The install manifest

`map/manifest.json` records what version installed each file and the hash it had on arrival.

No command reads it. There is deliberately no `cg upgrade`: `cg init` is idempotent and already
replaces framework core on every run, so a second verb doing the same work would only be a second
way to get it wrong. The record still ships, because a baseline cannot be captured retroactively —
if a future release needs to tell a file you edited from one still exactly as shipped, the evidence
has to have been written when the file arrived.

Two properties are load-bearing and each has a test:

- **A preserved file's entry is never refreshed.** Re-running `init` after you edit `.agents/cg/`
  content must not re-hash it. Refreshing would adopt your edits as pristine and destroy the only
  evidence that you changed anything. A *replaced* file is the opposite case: `init` just wrote it,
  so its entry is updated to match, or the manifest describes a file that is no longer on disk.
- **Only files `init` copies are recorded.** Anything `cg sync` regenerates is excluded: its hash
  would go stale on the next sync, and a baseline must never treat a generated artifact as content
  you own.

A file that already existed when Contract Graph arrived is recorded with `adopted: true` — its
contents predate the install, so the hash is evidence of what is there rather than of what shipped.

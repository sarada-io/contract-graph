# Scaffolding Contract Graph

This is the contributor guide to changing what `cg init` writes. The executable source of truth is
`SCAFFOLD_MAPPING` in `src/scripts/init.js`; editor discovery is configured separately under
`src/scaffold/profiles/`.

## Source mapping

| Package source | Repository target | Mode |
|---|---|---|
| `src/principles/*.md` | `.agents/cg/principles/` | always |
| `src/principles/design/` | `.agents/cg/principles/design/` | selected by `--design` |
| `src/governance/` | `.agents/cg/` | always |
| `src/skills/` | `.agents/skills/` | always |
| `src/scaffold/rules/` | `.agents/rules/` | always |
| `src/scaffold/module/` | `src/` | always |
| `src/scaffold/profiles/` | nowhere | read by `init`, never copied |

The rules are directory-level deliberately. Adding a skill reference or asset should not require a
second per-file manifest edit. The mapping selects a subtree, preserves its relative paths, and
retains the installer’s never-overwrite behavior.

`init` also writes `.agents/cg/map/profile.json` with the selected editor profiles and design
packs. `sync` and `verify` resolve that record, so an absent editor artifact is distinguishable
from an editor that was never selected.

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

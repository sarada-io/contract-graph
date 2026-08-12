# Contributing

## Setup

```bash
node --test "test/**/*.test.js"
```

Node 18.17+. No dependencies to install — that is deliberate, and a PR adding a runtime dependency
needs to argue for it. This is a tool whose whole job is trust; every dependency is supply-chain
surface on a verifier.

## Trying a scaffold locally

```bash
./cg try claude          # POSIX shells
npm run try -- claude    # everywhere, including Windows
```

Scaffolds a throwaway repository in `tmp/<target>`, runs `init` → `sync` → `verify`, and reports
which artifacts the named editor actually reads. `tmp/` is gitignored and safe to delete.

`cg verify` proves a scaffold is well-formed; `./cg try` is how you check an editor finds it. The
second is not something the verifier can close on its own.

The helper is `src/scripts/dev.js`, and it is **excluded from the published package** by the
`"!src/scripts/dev.js"` entry in `files`. It is repository tooling: it writes to `tmp/`, it is
reached only through `./cg` and `npm run try`, and neither of those ships. A test asserts the
exclusion holds, because `files` includes `src` and the default for anything added there is to
reach users.

## Changing the scaffold

`SCAFFOLD_MAPPING` in `src/scripts/init.js` is the executable source of truth for what `cg init`
writes. Its rules are directory-level: every consumer-facing file under `src/`, except runtime
scripts and profile configuration, must match exactly one rule.

Each rule has an ownership policy:

- `replace` is framework-owned. `cg init` updates it from the installed package.
- `preserve` is repository-owned context. `cg init` writes it only when it is absent.

The test suite checks the mapping in both directions. Coverage rejects an unmapped file or one
claimed by overlapping rules. A round-trip test scaffolds a temporary repository and compares the
result with an independently encoded source-to-target map. When changing the mapping, first make
the relevant detector fail with one deliberate mutation, then restore it and run `npm test`.

Editor profiles live in `src/scaffold/profiles/` and may add discovery artifacts only; they may not
change the universal contract or governance tree. To add one:

1. Confirm the paths the real editor reads using its installed application and a scratch
   repository. A string found in an application bundle proves presence, not absence.
2. Add `<name>.scaffolding.conf.json` with its lowercase name, display name, root pointers,
   optional skill wrappers, and inheritance.
3. Add tests for its exact artifacts, missing selected artifacts, absent unselected artifacts,
   malformed configuration, and profile neutrality.
4. Run `npm test`, then `./cg try <name>` and inspect `tmp/<name>` in the real editor.

A profile may be a named no-op when the universal scaffold already supplies everything its editor
discovers. Do not invent a redundant file merely to give the profile a visible artifact.

## The rule that applies to this repository too

**A rule and its enforcing test land in the same commit.** A PR that adds a check to `verify.js`
without a fail-on-demand test in `test/` will be asked for the test. A PR that adds a rule to a
fork-loaded principle file without either a detector (`invariant`) or a cost clause (`guide`) will be asked for
that.

### Fail-on-demand, specifically

Every check needs a test that mutates one thing in an otherwise-green repository and asserts *that
specific check* fires. A test that only proves the green path passes is indistinguishable from a
check that does nothing.

`test/verify.test.js` shows the shape: `makeRepo()` builds a green fixture, `edit()` breaks exactly
one thing, `assertFails(dir, code, note)` asserts the right code fires and prints every actual
failure when it does not.

## Changing a fork-loaded principle file

A pack rule is either:

```markdown
- **DP-SET-01-01** `invariant` — <the rule>
```
…which owes exactly one enforcement-map row and a real detector, or:

```markdown
- **DP-SET-01-01** `guide` — <the rule>
  **Cost:** <what choosing this makes harder, slower, or unavailable>
```
…which must never have an enforcement-map row.

Marking a testable rule as a `guide` to avoid writing its detector is the failure mode the marker
exists to catch.

**Rule IDs are never renumbered.** Append within a principle; redefine in place; never reuse. Set
*names* may be renamed, split, or merged — they are routing labels, not identities.

## Adding a fork-loaded principle file

Add `src/principles/<name>.md`. The file name must be lowercase-kebab and its rules must
carry the matching uppercase set token: `src/principles/operations.md` holds
`OP-*`. The
verifier checks this.

A pack should arrive with rules, not as an empty namespace — an empty set invites rules written to
fill it.

## Imported rules

If a rule comes from somewhere else, it arrives with the rule but without the case behind it or its
cost. Before it lands, state what it costs **here**. If that cannot be stated, the rule is being
adopted on reputation rather than reasoning, and it should be dropped. Check the source's licence
before copying text; a paraphrase carrying your own cost clause is usually the better artifact
anyway.

## Commit expectations

- One change per commit where practical.
- A behaviour change updates its documentation in the same commit.
- Say what the change **costs** in the message when it costs something.

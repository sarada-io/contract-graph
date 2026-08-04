# Contributing

## Setup

```bash
node --test "test/**/*.test.js"
```

Node 18.17+. No dependencies to install — that is deliberate, and a PR adding a runtime dependency
needs to argue for it. This is a tool whose whole job is trust; every dependency is supply-chain
surface on a verifier.

## The rule that applies to this repository too

**A rule and its enforcing test land in the same commit.** A PR that adds a check to `verify.js`
without a fail-on-demand test in `test/` will be asked for the test. A PR that adds a rule to a
design pack without either a detector (`invariant`) or a cost clause (`guide`) will be asked for
that.

### Fail-on-demand, specifically

Every check needs a test that mutates one thing in an otherwise-green repository and asserts *that
specific check* fires. A test that only proves the green path passes is indistinguishable from a
check that does nothing.

`test/verify.test.js` shows the shape: `makeRepo()` builds a green fixture, `edit()` breaks exactly
one thing, `assertFails(dir, code, note)` asserts the right code fires and prints every actual
failure when it does not.

## Changing a design pack

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

## Adding a design pack

Add `src/principles/design/<name>.md`. The file name must be lowercase-kebab and its rules must
carry the matching uppercase set token: `src/principles/design/ops.md` holds `DP-OPS-*`. The
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

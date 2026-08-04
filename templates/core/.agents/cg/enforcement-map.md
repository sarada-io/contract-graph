# Enforcement Map

Companion to `.agents/cg/principles.md` and `.agents/cg/design/`. AP-01 requires a detector per
enforceable rule; this file records which detector covers which rule ID.

**A rule that claims enforceability without a detector is aspirational.** Track the gap; do not
pretend it is closed.

## Which rules belong here

| Family | In this map? |
|---|---|
| `AP-*` | yes — every rule |
| `PP-*` | yes — every rule |
| `DP-*` marked `` `invariant` `` | yes |
| `DP-*` marked `` `guide` `` | **never** — a preference is not falsifiable by a test |

`cg verify` enforces both directions: an `invariant` rule with no row fails, and a `guide` rule
with a row fails.

## Make every detector falsifiable

A rule that targets a construct the codebase does not use yet will pass **vacuously** forever, and a
vacuous pass is indistinguishable from a real one.

Give each detector a companion probe that runs the identical rule shape against something the
codebase *does* use, and assert that the probe **fails**. If the probe ever starts passing, the
production rule beside it has stopped enforcing anything.

This is the single highest-value habit in this file. Skip it and the map becomes a list of tests
that are green because they check nothing.

## Map

| Rule | Detector |
|---|---|
| AP-01-01, AP-01-02 | `cg verify`: every enforceable rule has a row here, and no `guide` does |
| AP-02-01 | <dependency-cycle check in your build's architecture-test layer> *(not yet built)* |
| AP-02-02, AP-02-05 | <forbidden-import / dependency-direction rule> *(not yet built)* |
| AP-02-03 | <adapter slices do not depend on each other; the contract layer never depends on the persistence module> *(not yet built)* |
| AP-02-04 | <each collection or table claimed by exactly one owning writer> *(not yet built)* |
| AP-03-02, AP-03-05 | <tool invocation without a policy pass fails closed> *(not yet built)* |
| AP-04-01 | <privileged deletion requires an authenticated recorded actor; receipt written only after every store verifies empty> *(not yet built)* |
| AP-04-03 | <build scan rejects literal secrets in configuration and source> *(not yet built)* |
| AP-04-06 | <no write path bypasses the `schemaVersion` stamp; a record outside the supported window raises a typed error> *(not yet built)* |
| AP-06-01 | <no driver for an undeclared store on the runtime classpath> *(not yet built)* |

Replace each `<…>` with the real detector as you build it, and delete the `(not yet built)` marker
in the same commit as the test.

## Adding a rule

When a rule is added to `principles.md` or a design set, add its row here **in the same commit**
(AP-01-02). The detector lands in that commit too — not the next one.

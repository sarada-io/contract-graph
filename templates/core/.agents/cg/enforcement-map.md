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

`cg verify` enforces this in both directions. An `AP-`/`PP-` rule with no row fails, a `DP-`
`invariant` with no row fails, a `guide` **with** a row fails, and a row citing a rule ID no
principles file defines fails.

**A row is not a detector.** `cg verify` proves the row exists; only the detector named in it
proves the rule. A row still carrying `<…> *(not yet built)*` is an open debt, and a rule whose
cell says it is not machine-checkable is making that claim out loud where a reviewer can dispute
it — which is the point. Neither is a pass.

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
| AP-01-01, AP-01-02 | `cg verify`: every `AP-`/`PP-` rule and every `DP-` invariant has exactly one row here, no `guide` does, and no row cites an undefined rule ID |
| AP-01-03 | <CI workflow runs the stages in the declared order and fails the job on any red stage> *(not yet built)* |
| AP-02-01 | <dependency-cycle check in your build's architecture-test layer> *(not yet built)* |
| AP-02-02, AP-02-05 | <forbidden-import / dependency-direction rule> *(not yet built)* |
| AP-02-03 | <adapter slices do not depend on each other; the contract layer never depends on the persistence module> *(not yet built)* |
| AP-02-04 | <each collection or table claimed by exactly one owning writer> *(not yet built)* |
| AP-03-01 | <the input-safety gate resolves without a model client on its call path> *(not yet built)* |
| AP-03-02, AP-03-05 | <tool invocation without a policy pass fails closed> *(not yet built)* |
| AP-03-03 | <no authorization decision originates in a UI, route, or prompt layer> *(not yet built)* |
| AP-03-04 | <every action declared side-effecting requires a confirmation token the caller cannot forge> *(not yet built)* |
| AP-04-01 | <privileged deletion requires an authenticated recorded actor; receipt written only after every store verifies empty> *(not yet built)* |
| AP-04-02 | <every registered record class resolves to a retention policy with a TTL or a scheduled job> *(not yet built)* |
| AP-04-03 | <build scan rejects literal secrets in configuration and source> *(not yet built)* |
| AP-04-04 | <telemetry emitters reject unredacted customer content and PII at the boundary type> *(not yet built)* |
| AP-04-05 | <identity resolves to one stable subject claim, and erasure covers every store that holds it> *(not yet built)* |
| AP-04-06 | <no write path bypasses the `schemaVersion` stamp; a record outside the supported window raises a typed error> *(not yet built)* |
| AP-05-01 | <deny-list: no configuration key resolves to pipeline order, the safety gate, tool defaults, confirmation, or authorization> *(not yet built)* |
| AP-06-01 | <no driver for an undeclared store on the runtime classpath> *(not yet built)* |
| AP-06-02 | <no message-broker or ESB client on the runtime classpath> *(not yet built)* |
| AP-06-03 | <the build produces exactly the declared set of deployables> *(not yet built)* |
| AP-06-04 | **Not machine-checkable** — "boring" and "widely known" are judgements about a hiring pool, not properties of the tree. Enforced at review, on the record, when a dependency is added |
| AP-06-05 | **Not machine-checkable** — no test can tell an unmaintained capability from a quiet one. Enforced at the decision harvest each phase close |

Replace each `<…>` with the real detector as you build it, and delete the `(not yet built)` marker
in the same commit as the test.

## Adding a rule

When a rule is added to `principles.md` or a design set, add its row here **in the same commit**
(AP-01-02). The detector lands in that commit too — not the next one.

# Enforcement Map

Companion to every file under `.agents/cg/principles/`. AP-01 requires a detector per
enforceable rule; this file records which detector covers which rule ID.

**A rule that claims enforceability without a detector is aspirational.** Track the gap; do not
pretend it is closed.

## Which rules belong here

| Family | In this map? |
|---|---|
| `AP-*`, `PP-*` — inherited into every contract | yes — every rule |
| `DP-*`, `OP-*`, `UP-*`, `SP-*` marked `` `invariant` `` | yes |
| `DP-*`, `OP-*`, `UP-*`, `SP-*` marked `` `guide` `` | **never** — a preference is not falsifiable by a test |

`cg verify` enforces this in both directions. An `AP-`/`PP-` rule with no row fails, a fork-family
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

## What Contract Graph checks, and what it cannot

`cg verify` proves this map is **complete and internally consistent**: every `AP-`/`PP-` rule has
exactly one row, every fork-loaded `invariant` has one, no `guide` does, and no row cites a rule ID
no principles file defines.

It cannot prove any of the rules below, because they are claims about *your* code — its dependency
graph, its stores, its configuration surface. Those detectors live in your build and are yours to
write. Every row is specified precisely enough to implement without reading the rule again: what to
enumerate, what to assert, and what makes it fail.

**A row is not a detector.** A row still carrying `*(not yet built)*` is an open debt, and counting
those is the honest measure of how enforced this repository actually is.

## Map

| Rule | Detector |
|---|---|
| AP-01-01, AP-01-02 | **Built.** `cg verify`: every `AP-`/`PP-` rule and every fork-family `invariant` has exactly one row here, no `guide` does, and no row cites an undefined rule ID |
| AP-01-03 | Parse the CI definition; assert its steps appear in the order format → architecture tests → build → unit → integration, and that no step is allowed to fail (`continue-on-error`, an or-true shortcut, or equivalent). Fails when a stage is out of order, missing, or non-blocking *(not yet built)* |
| AP-02-01 | Build the module graph from the build tool's own resolution (`go list -deps`, Gradle `dependencies`, `madge`, `deptrac`) and assert it is acyclic. Fails naming the cycle *(not yet built)* |
| AP-02-02, AP-02-05 | For each bounded context, enumerate its imports and assert none reaches another context's internal packages — only that context's published contract type. Fails naming the importing file and the forbidden target *(not yet built)* |
| AP-02-03 | Assert no import edge exists between two adapter slices, and none from the contract layer to any persistence package. Fails naming the edge *(not yet built)* |
| AP-02-04 | Enumerate every write call site per table or collection and assert exactly one owning module appears across them. Fails listing the table and its competing writers *(not yet built)* |
| AP-03-01 | Compute the transitive call or import closure from the input-safety gate's entry point and assert no model-client type appears in it. Fails naming the path that reaches one *(not yet built)* |
| AP-03-02, AP-03-05 | Invoke each registered tool and action with the policy chain absent and assert every one refuses rather than proceeds; separately assert no role or authorization value resolves from the configuration source. Fails on any tool that runs, or any role key that is configurable *(not yet built)* |
| AP-03-03 | Assert every authorization decision function is reachable only from the domain layer, and that no route, controller, view, or prompt module performs a permission comparison. Fails naming the layer that decided *(not yet built)* |
| AP-03-04 | Enumerate actions declared side-effecting and assert each rejects a request whose confirmation token is absent, replayed, or client-generated. Fails naming the action that accepted one *(not yet built)* |
| AP-04-01 | Assert a privileged deletion with no authenticated actor is refused, and that the receipt is written only after every registered store reports the subject empty. Fails if a receipt precedes an unverified store *(not yet built)* |
| AP-04-02 | Enumerate registered record classes and assert each resolves to a retention policy carrying a TTL or a named scheduled job. Fails listing unmapped classes *(not yet built)* |
| AP-04-03 | Scan configuration and source for known credential prefixes and high-entropy literals; assert every match is a reference (environment variable or secret-manager key), never a value. Fails naming file and line *(not yet built)* |
| AP-04-04 | Assert the telemetry emitter accepts only a redacted type at its boundary, and that emitting raw customer content or PII fails to compile or throws. Fails if an unredacted value reaches an emitter *(not yet built)* |
| AP-04-05 | Assert exactly one subject-claim resolver exists, every store's subject field resolves through it, and an erasure run visits every registered store. Fails naming a store the erasure path misses *(not yet built)* |
| AP-04-06 | Assert no write path reaches a store without passing the `schemaVersion` stamp, and that reading a record outside the supported window raises a typed error rather than defaulting. Fails naming the bypassing path *(not yet built)* |
| AP-05-01 | Enumerate every configuration key the application resolves and assert none matches the deny-list: pipeline order, control flow, the safety gate, tool defaults, confirmation, authorization. Fails naming the key and its resolution site *(not yet built)* |
| AP-06-01 | Assert the runtime dependency set contains no persistence driver outside the allowlist declared in the root contract. Fails naming the undeclared driver *(not yet built)* |
| AP-06-02 | Assert the runtime dependency set contains no message-broker or ESB client. Fails naming the dependency and the module that pulled it in *(not yet built)* |
| AP-06-03 | Assert the artifact list the build produces equals the deployable set declared in the root contract. Fails on any extra or missing deployable *(not yet built)* |
| AP-06-04 | **Not machine-checkable** — "boring" and "widely known" are judgements about a hiring pool, not properties of the tree. Enforced at review, on the record, when a dependency is added |
| AP-06-05 | **Not machine-checkable** — no test can tell an unmaintained capability from a quiet one. Enforced at the decision harvest each phase close |

Each row above names the *shape* of its detector, not an implementation: the enumeration is
language-specific, the assertion is not. Give every one a companion probe as described above, or a
rule that targets a construct you do not use yet will pass vacuously forever.

Replace each `<…>` with the real detector as you build it, and delete the `(not yet built)` marker
in the same commit as the test.

## Adding a rule

When a rule is added to any file under `principles/`, add its row here **in the same commit**
(AP-01-02). The detector lands in that commit too — not the next one.

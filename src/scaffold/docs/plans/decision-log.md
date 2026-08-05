# Decision log

The working ledger `cg-unblock` writes to and `cg-sign-off` harvests from. It is **transient by
design**: a permanent contract may never cite this file or a plan ticket ID as the authority for a
rule, and `cg verify` fails the build when one does. A decision that survives its phase graduates
to a durable design record under `docs/design/`, or to a rule under `.agents/cg/principles/` with
its detector.

Numbering is stable and never reused. `DL-01-<NN>` entries are autonomous decisions recorded for
traceability and go straight to *Resolved*. `DL-02-<NN>` entries need an owner answer and start in
*Pending your review*. When one is answered, move the entry — do not duplicate or renumber it.

## Pending your review

_(none yet)_

Entries here use this shape:

```markdown
### DL-02-01 — <short title>
**Raised:** <date> · <source>
**Blocks:** <the smallest exact unit that cannot proceed>
**Unblocks when:** <objective answer or prerequisite state>

**Context:** <why the blocking test applies>

**Options:**
- **A) <option>** <recommendation and trade-off>
- **B) <option>** <trade-off>
- **Other:** type your own.

**Your answer:** _(blank)_
```

## Resolved

_(none yet)_

A resolved entry keeps its original ID and adds the answer, the date it was answered, and the one
bounded edit that reverses it.

## Promotion

A resolved decision becomes a candidate for a permanent rule only when the same decision shape has
appeared at least twice **and** it can be stated without citing its source decision, a ticket, or a
path under `docs/plans/`. `cg-sign-off` classifies a declared cohort; promotion itself is delivery
work that runs through `cg-produce`, because a new rule owes its detector in the same change.

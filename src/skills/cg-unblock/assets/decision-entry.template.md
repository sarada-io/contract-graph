# Decision entry template

Copy one filled heading into `<docs>/plans/decision-log.md`. Resolve `<docs>` from
`.agents/cg/profile.json` `docs` (default `docs`). Do not keep this instructional prose
in the ledger.

Numbering is per family and never reused: `DU-01`, `DU-02`, … for owner review; `DA-01`, `DA-02`, …
for autonomous decisions. Do not restart a family at `01` because the other family advanced.

## Owner review — paste under *Pending your review*

### DU-NN — <short title>
**Raised:** <date> · <source>
**Blocks:** <the smallest exact unit that cannot proceed>
**Unblocks when:** <objective answer or prerequisite state>

**Context:** <why D-1 or D-3 applies>

**Options:**
- **A) <option>** <recommendation and trade-off>
- **B) <option>** <trade-off>
- **Other:** type your own.

**Your answer:** _(blank)_

When answered, move the same `DU-NN` heading to *Resolved*. Add **Answered:** and **Reverses by:**.
Do not duplicate or renumber.

## Autonomous — paste under *Resolved*

### DA-NN — <short title>
**Raised:** <date> · <source>
**Answered:** <date> · <the decision taken>
**Reverses by:** <one bounded edit>

**Context:** <why D-2 applied and no D-3 trigger>

**Options considered:**
- **A) <option>**
- **B) <option>**

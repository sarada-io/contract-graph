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
**Scope:** <affected programme, phases, boundaries, and Steps>
**Depends on:** <accepted decision IDs and their relevant constraints, or None>
**Supersedes:** <decision IDs within this scope, or None>

**Context:** <question, evidence checked by Engineer and Manager, and why D-1 or D-3 applies>

**Options:**
- **A) <option>** <recommendation and trade-off>
- **B) <option>** <trade-off>
- **Other:** type your own.

Include every viable option; A and B do not limit the option count.
**Recommendation:** <option and reason; pending until the user answers>
**Asked:** <date and chat/interaction reference, or Not yet asked>
**Your answer:** _(blank)_

When answered, move the same `DU-NN` heading to *Resolved*. Preserve the selected option or typed
solution verbatim under **Your answer**. Add **Answered:** (date and actor), **Decision:** (scoped
interpretation), **Rationale:**, **Reverses by:** (actual cost, including irreversible), and
**Applied to:** (updated artifacts and blockers cleared). Leave ambiguous responses pending while
requesting clarification. Do not duplicate or renumber.

## Autonomous — paste under *Resolved*

### DA-NN — <short title>
**Raised:** <date> · <source>
**Answered:** <date> · <the decision taken>
**Reverses by:** <one bounded edit>

**Context:** <why D-2 applied and no D-3 trigger>

**Options considered:**
- **A) <option>**
- **B) <option>**

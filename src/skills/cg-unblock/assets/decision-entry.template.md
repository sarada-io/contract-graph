# Decision entry template

Copy one filled heading into `<docs>/plans/decision-log.md`. Resolve `<docs>` from
`.agents/cg/profile.json` `docs` (default `docs`). Do not keep this instructional prose
in the ledger.

Numbering is per family and never reused: `DU-01`, `DU-02`, … for owner review; `DA-01`, `DA-02`, …
for autonomous decisions. Do not restart a family at `01` because the other family advanced.

## Owner review — paste under *Pending your review*

### DU-NN — <plain-language question the owner can answer>

**Why your input is needed:** <what changed, why existing approval does not settle it, and the consequence for the product or work>
**What to review:** <link to the concrete proposal or resulting document and relevant sources; summarize actual changes, distinguishing agreed content from new interpretation>

**Your options:**
- **A) <choice>** — <what accepting this does and its tradeoff; mark recommended only with a reason>
- **B) <choice>** — <what this does and its tradeoff>
- **Other:** Describe your preferred outcome.

Include every viable option. For context confirmation, use **Approve — this reflects our agreed direction** and **Request changes — tell us what is missing or incorrect**. Never substitute a snapshot hash for reviewable content.

**What happens next:** <what the agent will do after each answer and which affected work waits; state independent work that can continue when relevant>
**Your answer:** _(blank — reply in the conversation; the agent records it here)_

**Supporting evidence**

**Raised:** <date> · <source>
**Blocks:** <the smallest exact unit that cannot proceed>
**Unblocks when:** <objective answer or prerequisite state>
**Scope:** <affected programme, sprint ID/name or phase, Feature/Bug/Task IDs, boundaries, and Steps>
**Depends on:** <accepted decision IDs and their relevant constraints, or None>
**Supersedes:** <decision IDs within this scope, or None>
**Evidence:** <checked authority, exact review snapshot and binding sources when applicable; technical identifiers belong here>
**Asked:** <date and chat/interaction reference, or Not yet asked>

When answered, move the same `DU-NN` heading to *Resolved*. Preserve the selected option or typed
solution verbatim under **Your answer**. Add **Answered:** (date and actor), **Decision:** (scoped
interpretation), **Rationale:**, **Reverses by:** (actual cost, including irreversible), and
**Applied to:** (updated artifacts and blockers cleared). Leave ambiguous responses pending while
requesting clarification. Do not duplicate or renumber.

## Autonomous — paste under *Resolved*

### DA-NN — <short title>
**Scope:** <programme, sprint ID/name, and affected Feature/Bug/Task IDs; or repository scope>
**Raised:** <date> · <source>
**Answered:** <date> · <the decision taken>
**Reverses by:** <one bounded edit>

**Context:** <why D-2 applied and no D-3 trigger>

**Options considered:**
- **A) <option>**
- **B) <option>**

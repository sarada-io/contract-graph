# Product Principles — start here

This file has no rules yet, and that is correct. A `PP-` rule is one you owe to *this* product's
market, pricing, or shape — not one that would hold for any repository. On day one you have none,
because nobody has built the product yet. A starter set of somebody else's product opinions is
exactly what you do not want inherited.

Product principles accrue instead: an unspecified detail gets decided from the principles and
logged, the same decision recurs, and at a phase close the decision harvest promotes it here. See
`.agents/cg/workflow.md`.

Your first file will be `PP-01-billing.md` and look like this:

```markdown
## PP-01. Billing shape

- **PP-01-01** — Every price is quoted in minor units.
```

Add its detector row to `.agents/cg/map/enforcement.md` in the same commit. If the rule binds
specific folders, add its ID to those entries in `.agents/cg/map/inheritance.json` and run
`cg sync`.

The same conventions as architecture rules apply: cite by ID and never by position, never
renumber, and state the rule in full so it survives deletion of whatever plan produced it.

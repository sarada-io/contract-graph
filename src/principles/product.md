# Product Principles

This file ships with no rules, and that is correct. A `PP-` rule is one you owe to *this* product's
market, pricing, shape, or tenancy model — not one that would hold for any repository. On day one
you have none, because nobody has built the product yet. A starter set of somebody else's product
opinions is exactly what you do not want inherited.

Product principles accrue instead: an unspecified detail gets decided from the principles and
logged, the same decision recurs, and at a phase close the decision harvest promotes it here. See
`.agents/cg/workflow.md`.

**A repository that already has code is the exception, and it is not a small one.** Its product
rules were decided years or months ago and are sitting in the code — one seam that builds every
storage path, one class that decides authorization, one adapter package that may import the
vendor SDK. `cg-warmup` harvests those into this file in a single pass rather than waiting for
them to re-accrue over several phases, because until a rule is written here, every future session
pays to re-read the code to learn it. If this file is populated and you did not write it, warmup
did, and its report lists every rule for you to keep, reword, or delete.

Your first principle goes in this file and looks like this:

```markdown
## PP-01. Billing shape

- **PP-01-01** — Every price is quoted in minor units.
```

Add its detector row to `.agents/cg/map/enforcement.md` in the same commit. If the rule binds
specific folders, add its ID to those entries in `.agents/cg/map/inheritance.json` and run
`cg sync`.

The same conventions as architecture rules apply: cite by ID and never by position, never
renumber, and state the rule in full so it survives deletion of whatever plan produced it.

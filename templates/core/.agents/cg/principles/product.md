# Product Principles

**Audience:** the maintainer, any future contributor, and every coding agent working in this
repository. Rules here bind exactly as hard as the architecture ones do.

**Precedence:** where generated code and this document disagree, **this document wins and the
code is wrong.** Where this document and a transient plan disagree, this document wins.

## This file has no rules yet, and that is correct

A `PP-` rule is one you owe to *this* product's market, pricing, or shape — not one that would
hold for any repository. On day one you have none, because nobody has built the product yet. A
starter set of somebody else's product opinions is exactly what you do not want inherited.

They accrue instead: an unspecified detail gets decided from the principles and logged, the same
decision recurs, and at a phase close the decision harvest promotes it here. See
`.agents/cg/workflow.md`.

## Adding the first one

1. Open `# Product Principles` below and add `## PP-01. <the principle>` with a one-line statement
   of what it protects.
2. Add the rule under it as `- **PP-01-01** — <full text>`.
3. Add its row to `.agents/cg/map/enforcement.md` **in the same commit** — `cg verify` fails
   otherwise, and that is `AP-01-02` doing its job.
4. If the rule binds specific folders, add its ID to those entries in
   `.agents/cg/map/inheritance.json` and run `cg sync`.

The same conventions as architecture rules apply: cite by ID and never by position, never renumber,
and state the rule in full so it survives the deletion of whatever plan produced it.

---

# Product Principles

<!-- Your first PP-nn principle heading and its rules go here. -->

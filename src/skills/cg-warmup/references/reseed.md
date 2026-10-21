## Reseed — additive, when every root is governed

Apply [responsibility review](responsibility-review.md) to the existing leaves and relevant siblings even when declarations validate. Include new overlap or mixed-responsibility findings in the existing corrective set and reseed delta; an unchanged graph is not an empty delta when new structural findings exist. Record follow-up ownership so repeated reseeds reuse rather than duplicate the finding.

Skip Phase A. Do not copy a template onto an existing `contract.yaml`. Do not blank `purpose`,
`forbids`, or existing P IDs. Walk the **installed** `graph.*` and
[the code-inspection catalog](../assets/warmup.yaml), not the packaged architecture catalog.

1. Re-walk every leaf with the Phase D table. `add-child` and a separable package already exists:
   write the child from the shared contract template; recurse. Never overwrite an existing contract.
2. `add-child` that would move code: append a **Restructure:** row to
   `<docs>/plans/warmup-corrective-set.md`. Do not wipe an in-flight `cg-plan` tree.
3. After each new child: `cg sync`, `cg verify`. Rewrite parent and root `routes` by **adding**
   the child path to routes whose `when` already names that surface. Do not delete existing
   `when` phrases or contract paths.
4. Harvest with §9, additively. New product rules get the next unused `Pnn-nn` and an
   `enforcement.yaml` row (`unproven — <violation>` when no detector). Skip when an existing P
   already covers the constraint. Never renumber P IDs. Fill root `purpose` / `forbids` only if
   they still contain `Replace this sentence`.
5. Write `<docs>/plans/warmup-reseed-delta.md` listing added contracts, added P IDs, amended
   routes, new responsibility-review findings, and skipped-because-already-covered items. If nothing is missing and no new findings exist: say so, **write no
   file**, stop.
6. `cg verify`. End with §12a, naming the delta or that it was empty.


Locate headings before reading [adoption](adoption.md), then read only Phase D (through Phase C), §9 (through §10), and §12a (through end) for the leaf audit, harvest and result. Use bounded line reads rather than opening the entire reference. Do not run its predecessor survey or full adoption loop.

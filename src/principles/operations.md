# Operations Principles

`OP-` rules. Load this file at a fork about delivery, migration, rollback, or recovery.

Every rule here is a `guide` with a stated cost.

## OP-01. Reversibility first

- **OP-01-01** `guide` — Prefer the option with the smaller rollback and migration cost.
  **Cost:** A bounded reversible intermediate may defer an otherwise cleaner end state.

- **OP-01-02** `guide` — Prefer fewer seams, writers, credentials, and moving parts.
  **Cost:** One component may retain narrowly related responsibility until evidence justifies another boundary.

## OP-02. Evidence before structure

- **OP-02-01** `guide` — Prefer waiting for evidence that a component is needed over adding it
  because the shape suggests it.
  **Cost:** The version without it ships first and is the one that has to be migrated when the evidence arrives.

- **OP-02-02** `guide` — Prefer a bad input degrading the runtime to a safe default over taking
  the runtime down.
  **Cost:** A degraded runtime can hide the bad input for a long time, so the fallback has to be loud somewhere even while it is quiet to the caller.

## OP-03. What the build proves

- **OP-03-01** `guide` — Prefer a check that runs in the build over one that runs at startup.
  **Cost:** Build-time checks need the facts available without the application running, which is sometimes a real restructuring rather than a move.

- **OP-03-02** `guide` — Prefer a check that fails on demand over one that has only ever passed.
  **Cost:** Every detector grows a second case proving it can fail, which is more test code guarding the tests.

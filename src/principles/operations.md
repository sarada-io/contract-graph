# Operations Principles

`OP-` rules. Load this file at a fork about delivery, migration, rollback, or recovery.

Every rule here is a `guide` with a stated cost.

## OP-01. Reversibility first

- **OP-01-01** `guide` — Prefer the option with the smaller rollback and migration cost.
  **Cost:** A bounded reversible intermediate may defer an otherwise cleaner end state.

- **OP-01-02** `guide` — Prefer fewer seams, writers, credentials, and moving parts.
  **Cost:** One component may retain narrowly related responsibility until evidence justifies another boundary.

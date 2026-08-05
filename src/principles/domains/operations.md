# Operations Design Principles

Load this set explicitly when an operations, delivery, migration, or recovery decision remains
after binding contracts and principles have been applied.

- **DP-OPERATIONS-01-01** `guide` — Prefer the option with the smaller rollback and migration cost.
  **Cost:** A bounded reversible intermediate may defer an otherwise cleaner end state.

- **DP-OPERATIONS-01-02** `guide` — Prefer fewer seams, writers, credentials, and moving parts.
  **Cost:** One component may retain narrowly related responsibility until evidence justifies another boundary.

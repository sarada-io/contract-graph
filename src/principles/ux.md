# User Experience Principles

`UP-` rules. Load this file at a fork about interaction, disclosure, task completeness, or the
responsiveness a person actually perceives.

Every rule here is a `guide`. A UX *target* — a budget, a contrast ratio, a p95 — is testable and
belongs in a contract's invariants with a detector. What lives here is which way to lean when two
designs both meet the target.

## UP-01. The surface carries the task

- **UP-01-01** `guide` — A customer-care agent does not leave the ticket surface to find task-relevant detail.
  **Cost:** The ticket surface must absorb progressive detail and bounded integrations, increasing its UI responsibility.

## UP-02. Perceived responsiveness

- **UP-02-01** `guide` — Prefer the design whose worst case you can state over the one whose average
  is better.
  **Cost:** A predictable surface often gives up throughput that a bursty one would have delivered on a good day.

- **UP-02-02** `guide` — Prefer measuring the real path before optimising it.
  **Cost:** Measurement takes time the fix would have taken, and sometimes confirms what you already suspected.

- **UP-02-03** `guide` — Prefer bounded queues, pools, and payloads to unbounded ones.
  **Cost:** A bound turns an unpredictable slowdown into a visible rejection you must now design a response for.

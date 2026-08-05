# Performance Domain Principles

Load this set explicitly when a latency, throughput, capacity, or cost-per-request decision remains
after binding contracts and principles have been applied.

Every rule here is a `guide`, and deliberately so. A performance *target* is testable and belongs in
a contract's invariants with a detector; what lives here is which way to lean when two designs both
meet the target.

- **DP-PERFORMANCE-01-01** `guide` — Prefer the design whose worst case you can state over the one
  whose average is better.
  **Cost:** A predictable design often gives up throughput that a bursty one would have delivered on a good day.

- **DP-PERFORMANCE-01-02** `guide` — Prefer measuring the real path before optimising it.
  **Cost:** Measurement takes time the fix would have taken, and sometimes confirms what you already suspected.

- **DP-PERFORMANCE-01-03** `guide` — Prefer removing work over doing the same work faster.
  **Cost:** Removing work usually means renegotiating a behaviour or a promise, which is a wider change than a local optimisation.

- **DP-PERFORMANCE-02-01** `guide` — Prefer a cache you can invalidate correctly over one that is
  merely faster.
  **Cost:** Correct invalidation needs an owner for every cached fact, and that ownership is work the uncached design never pays.

- **DP-PERFORMANCE-02-02** `guide` — Prefer bounded queues, pools, and payloads to unbounded ones.
  **Cost:** A bound turns an unpredictable slowdown into a visible rejection you must now design a response for.

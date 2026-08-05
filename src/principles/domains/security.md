# Security Domain Principles

Load this set explicitly when a trust-boundary, authorization, secret-handling, or exposure
decision remains after binding contracts and principles have been applied.

Every rule here is a `guide`. That is not a softening: the security properties that *are* testable
already live in the architecture principles as invariants with detectors — authorization decided
outside UI and prompt layers, no literal secrets in configuration, identity resolved to one stable
subject. What remains here is which way to lean when a fork is genuinely a judgement, and a
judgement marked `invariant` would be a detector nobody can write.

- **DP-SECURITY-01-01** `guide` — Prefer failing closed when a check cannot complete.
  **Cost:** An outage in the checking path becomes an outage in the feature, and you will be paged for both.

- **DP-SECURITY-01-02** `guide` — Prefer the design with the smaller blast radius over the one with
  the stronger perimeter.
  **Cost:** Partitioning duplicates state and operational surface that a single trusted zone would have shared.

- **DP-SECURITY-01-03** `guide` — Prefer a credential that expires on its own to one that must be
  remembered and rotated.
  **Cost:** Short-lived credentials need issuing infrastructure and a renewal path that can itself fail.

- **DP-SECURITY-02-01** `guide` — Prefer denying by default and naming each grant.
  **Cost:** Every legitimate new use begins as a bug report, and the grant list becomes a thing to maintain.

- **DP-SECURITY-02-02** `guide` — Prefer an audit record you would be willing to show an auditor to
  one that merely satisfies a log-retention setting.
  **Cost:** Records worth showing carry actor, intent, and outcome, which is more to capture, store, and redact.

- **DP-SECURITY-03-01** `guide` — Prefer treating anything that crossed a trust boundary as untrusted
  again on the far side.
  **Cost:** Re-validation duplicates checks a caller already performed, and shows up as latency on paths you control.

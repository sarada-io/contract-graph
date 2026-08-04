# Architecture Principles

## AP-04. Data discipline

- **AP-04-01** — Data is deletable completely, with a receipt, along **distinct paths that must not
  be collapsed**: erasure of one data subject's records, and removal of a whole account or
  workspace. The second is a **privileged action only** — authenticated, audited, with a recorded
  actor. No scheduled job and no customer-facing surface may perform it. Regulation and platform
  app stores mandate the first; build both before launch, not after.
- **AP-04-02** — Every record class with a lifecycle has an explicit retention policy, enforced by a
  scheduled job or a TTL, not by intention.
- **AP-04-03** — Secrets are references resolved at runtime, never values in configuration, source,
  or database records.
- **AP-04-04** — Customer content and PII are redacted at the telemetry boundary — logs, traces, and
  audit events — by policy, not convention.
- **AP-04-05** — Customer identity is a stable subject claim, erasable end to end.
- **AP-04-06** — Every persisted record carries an integer `schemaVersion`. Writers only ever write
  the current version; readers **upcast** older versions on read. A **bounded window** of supported
  versions is declared in code, and reading below the window is a typed error, never a silent
  default. Dropping a version out of the window requires a completed backfill. Without the version
  stamp and the window, schema-on-read degrades into unbounded, unknowable compatibility branches.

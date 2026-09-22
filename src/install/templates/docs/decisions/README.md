# Decision records

Durable reasoning, written and maintained by `cg-sign-off`. A record here answers *why* a shape was
chosen — the alternatives considered, the trade-off accepted, the threat or failure model, the
architecture consequence, and what supersedes what.

At every sign-off, consume relevant approved decisions into `.agents/cg/project-context.md`, the owning contract or an appropriate YAML catalog. Retain a record here only when its detailed rationale, active consumers or explicit retention policy still needs it. Preserve authority in completion evidence and update incoming links before removing an obsolete scope-owned record. Pending and unrelated decisions are not cleanup candidates. A retained durable record may be cited by a contract; a transient plan may not.

What belongs here:

- architecture decision records, dated and superseded rather than rewritten;
- domain, topology, persistence, and identity records;
- threat models and security reviews;
- diagrams whose source of truth is the record, not a slide.

What does not: task logs, branch names, sequencing, or command output — those stay in the phase
record under `docs/plans/`. Nor binding rules: structural bindings belong in
`.agents/cg/principles/architecture.yaml` with their measures, detectors, and negative fixtures; product
bindings belong in the P catalog with enforcement. A decision record that quietly becomes a rule
is a rule nothing enforces.

A dated record is historical evidence. When a retained decision changes, record its supersession; create a replacement record only if that detail still needs a separate home. Do not edit a past decision to look like the current one.

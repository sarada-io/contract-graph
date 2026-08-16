# Decision records

Durable reasoning, written and maintained by `cg-sign-off`. A record here answers *why* a shape was
chosen — the alternatives considered, the trade-off accepted, the threat or failure model, the
architecture consequence, and what supersedes what.

Unlike `docs/plans/`, this directory is **permanent**, so a contract may cite it. That is the whole
distinction between the two: a plan records what you are about to do, a decision record states what
you decided and why it still holds.

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

A dated record is historical evidence. When the decision changes, add a new record that supersedes
it and say so in both. Do not edit a past decision to look like the current one.

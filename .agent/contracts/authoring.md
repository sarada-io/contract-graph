# Authoring contract

Parent: [repository](README.md). Owns the prose and starter assets through which people and
agents use the product's graph and delivery capabilities.

## Surface and implementation

- [src/skills](../../src/skills/): six lifecycle skills and their references; optional experts
  under `experts/` install flat, with shared attribution outside their instructions.
- [workflow.md](../../src/cg/workflow.md), [phases.json](../../src/cg/phases.json),
  [experts.md](../../src/cg/experts.md) and [contract-graph-agent.md](../../src/cg/contract-graph-agent.md):
  shipped procedure, loading policy and agent entry context.
- [contract.yaml](../../src/cg/contract.yaml), [contract template](../../src/cg/templates/contract.template.yaml)
  and [install templates](../../src/install/templates/): initial context and authoring aids.
- [docs index](../../docs/README.md), [README](../../README.md) and
  [CONTRIBUTING](../../CONTRIBUTING.md): canonical human explanations and contributor validation.

## Boundary promises

Read the relevant skill and workflow before changing agent procedure. Warmup, plan, produce,
prototype, sign-off and unblock remain the lifecycle; experts add no stages. Use one contract
authoring template. Schema shape belongs to [Verification](verification.md), not copied skill rules.

Instructions consume [Delivery](delivery.md)'s state and [Graph](graph.md)'s routes. They must
not invent a second acceptance or completion mechanism. [Installation](installation.md) owns
replacement/preservation policy; changing an asset does not authorize overwriting adopter policy.
[Distribution](distribution.md) owns packaging. Keep human docs at one canonical page per topic,
and preserve durable facts before retiring temporary delivery records.

Production collects missing scope/review choices together through permitted selectable host questions
(with numbered chat fallback), reuses recorded answers and resumes eligible work under existing authority.
It preserves batch/per-item review choice and reports Item/Code/Test/Docs with
Yes/No/Partial/Blocked, followed by an actual next action or None. Plan owns outcomes and
technical readiness; produce owns incremental preparation, implementation and repairs.
Prepare and auto-run are retired stages. Optional coordinators and workers use existing plans
and receipts, not another ledger; expert selection remains repository-owned in `.agents/cg/experts.md`.

Completion leaves durable docs, owner-approved intent and YAML current, then removes obsolete
scope-owned process files. Preserve active shared dependencies, explicit retention policy and
the compact delivery receipt; do not replace deleted plans with permanent execution diaries.
The schema owns contract shape and the architecture catalog owns placement; example kinds in
the shared authoring template are not additional architectural requirements.

Verification: check links and claims for human-doc-only changes. Anything scaffolded from
`src/` requires `npm test`; changed interactions require the relevant contributor workflow checks.
This repository's own [Markdown routing graph](README.md) is maintainer context, not a shipped
skill, new product contract format, or lifecycle stage.

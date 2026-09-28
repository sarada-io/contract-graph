# Authoring contract

Parent: [repository](../contract.md). Owns the prose and starter assets through which people and
agents use the product's graph and delivery capabilities.

## Surface and implementation

- [src/skills](../../src/skills): six lifecycle skills and their references; optional experts
  under `experts/` install flat, with shared attribution outside their instructions.
- [responsibility review](../../src/skills/cg-warmup/references/responsibility-review.md): shared semantic ownership review for warmup, planning, implementation and sign-off; existing work and acceptance records own its evidence.
- [workflow.md](../../src/cg/workflow.md), [phases.json](../../src/cg/phases.json),
  [experts.md](../../src/cg/experts.md) and [contract-graph-agent.md](../../src/cg/contract-graph-agent.md):
  shipped procedure, loading policy and agent entry context.
- [project-context.md](../../src/cg/project-context.md): preserved project intent and current approved direction; warmup and unblock maintain it, and every sign-off reconciles decisions into their durable owners.
- [contract.yaml](../../src/cg/contract.yaml), [contract template](../../src/cg/templates/contract.template.yaml)
  and [install templates](../../src/install/templates): initial context and authoring aids.
- [docs index](../../docs/README.md), [README](../../README.md) and
  [CONTRIBUTING](../../CONTRIBUTING.md): canonical human explanations and contributor validation.

[Diagnostic procedure](../../src/diagnostics/analyse.md) and [portable cg-analyse skill](../../src/diagnostics/cg-analyse/SKILL.md) guide pre-adoption assessment using warmup’s existing analysis. They are package-only resources, not repository-installed lifecycle skills. Diagnosis never invokes adoption; explicit adoption hands off to init and existing lifecycle owners.

Documentation routing: `src/install/templates/docs/guides/` defines procedures for technical roles; `manuals/` defines product-user instructions, including gameplay. Sign-off closure checks §8 owns authoring and scoped relocation; warmup identifies existing audiences. Classify by purpose, not title, and preserve existing content/links when correcting placement.

## Boundary promises

Use **Contract Graph Dev Kit** as the full product name and **Contract Graph** as its short name.
Position it as a framework for agentic software development with repository-native contracts as a
graph at its core. Explain both the graph and the integrated planning, execution, review and
completion workflow. Keep `contract-graph`, `cg`, `/cg-*`, paths and schema identities stable.

Read the relevant skill and workflow before changing agent procedure. Warmup, plan, produce,
prototype, sign-off and unblock remain the lifecycle; experts add no stages. Use one contract
authoring template. Schema shape belongs to [Verification](../verification/contract.md), not copied skill rules.

Instructions consume [Delivery](../delivery/contract.md)'s state and [Graph](../graph/contract.md)'s routes. They must
not invent a second acceptance or completion mechanism. [Installation](../installation/contract.md) owns
replacement/preservation policy; changing an asset does not authorize overwriting adopter policy.
[Distribution](../distribution/contract.md) owns packaging. Keep human docs at one canonical page per topic,
and preserve durable facts before retiring temporary delivery records.

The primary audience is senior leadership in functional roles. [Owner communication](../../src/skills/cg-unblock/references/owner-communication.md) owns all user-facing decision and result language. Reviews contain only Context/background, Options, Recommendation and Why under a clear question; they live in the central human decision log until answered. Compact per-decision JSON in `.agents/cg/decisions/` owns temporary agent evidence; `harvest.js` reads it and legacy Markdown during migration. Technical commands and approval metadata do not belong in the owner review. Explain verification by its actual outcome and limits. Warmup and unblock accept conversational answers and keep ledger maintenance and skill routing with the agent. Next actions explain the owner’s choice and subsequent work without snapshot hashes or inventories of absent artifacts.

Production collects missing scope/review choices together through permitted selectable host questions
(with numbered chat fallback), reuses recorded answers and resumes eligible work under existing authority.
It preserves batch/per-item review choice and reports Item/Code/Test/Docs with
Yes/No/Partial/Blocked, followed by an actual next action or None. Plan owns outcomes and
technical readiness; produce owns incremental preparation, implementation and repairs.
Prepare and auto-run are retired stages. Optional coordinators and workers use existing plans
and receipts, not another ledger; expert selection remains repository-owned in `.agents/cg/experts.md`.

Every sign-off accounts for scope-owned resolved decisions and design records, preserves their authority in existing completion evidence, and drains consumed entries while retaining pending/shared dependencies.
Every implementation sign-off also records a bounded responsibility comparison and finding dispositions, including relevant sibling implementations, compatibility paths, challenged leaf rationales and changed fixtures. Graph/surface validation does not replace that review. Introduced or worsened ownership defects return to production; pre-existing out-of-scope findings retain an owner and active follow-up. This is agent procedure, not automatic semantic enforcement by the delivery runtime.
Completion leaves durable docs, owner-approved project context and YAML current, then removes obsolete
scope-owned process files. Preserve active shared dependencies, explicit retention policy and
the compact delivery receipt; do not replace deleted plans with permanent execution diaries.
The schema owns contract shape and the architecture catalog owns placement; example kinds in
the shared authoring template are not additional architectural requirements.

Verification: check links and claims for human-doc-only changes. Anything scaffolded from
`src/` requires `npm test`; changed interactions require the relevant contributor workflow checks.
This repository's own [Markdown routing graph](../contract.md) is maintainer context, not a shipped
skill, new product contract format, or lifecycle stage.

# Authoring contract

Parent: [repository](../../../.agent/contract.md). Owns the prose and starter assets through which people and
agents use the product's graph and delivery capabilities.

## Surface and implementation

This single `.agent/` owns all of `src/skills/`: the six lifecycle skills, their references, assets and host metadata, and the expert skills. Individual skills and their subdirectories do not have separate maintainer contracts. Use the source routes below to select the relevant procedure.

- [src/skills](..): six lifecycle skills and their references; optional experts
  under `experts/` install flat, with shared attribution outside their instructions.
- [responsibility review](../cg-warmup/references/responsibility-review.md): shared semantic ownership review for warmup, planning, implementation and sign-off; existing work and acceptance records own its evidence.
- [workflow.md](../../cg/workflow.md), [phases.json](../../cg/phases.json),
  [experts.md](../../cg/experts.md) and [contract-graph-agent.md](../../cg/contract-graph-agent.md):
  shipped procedure, loading policy and agent entry context.
- [project-context.md](../../cg/project-context.md): preserved project intent and current approved direction; warmup and unblock maintain it, and every sign-off reconciles decisions into their durable owners.
- [contract.yaml](../../cg/contract.yaml), [contract template](../../cg/templates/contract.template.yaml)
  and [install templates](../../install/templates): initial context and authoring aids.
- [docs index](../../../docs/README.md), [README](../../../README.md) and
  [CONTRIBUTING](../../../CONTRIBUTING.md): canonical human explanations and contributor validation.
- [papers](../../../papers/README.md): published paper sources, retaining their own attribution and licence, outside both distribution targets.

[Diagnostic procedure](../../diagnostics/analyse.md) and [portable cg-analyse skill](../../diagnostics/cg-analyse/SKILL.md) guide pre-adoption assessment using warmup’s existing analysis. They are package-only resources, not repository-installed lifecycle skills. Diagnosis never invokes adoption; explicit adoption hands off to init and existing lifecycle owners.

Documentation routing: `src/install/templates/docs/guides/` defines procedures for technical roles; `manuals/` defines product-user instructions, including gameplay. Sign-off closure checks §8 owns authoring and scoped relocation; warmup identifies existing audiences. Classify by purpose, not title, and preserve existing content/links when correcting placement.

## Boundary promises

Use **Contract Graph Dev Kit** as the full product name and **Contract Graph** as its short name.
Position it as a framework for agentic software development with repository-native contracts as a
graph at its core. Explain both the graph and the integrated planning, execution, review and
completion workflow. Keep `contract-graph`, `cg`, `/cg-*`, paths and schema identities stable.

Read the relevant skill and workflow before changing agent procedure. Warmup, plan, produce,
prototype, sign-off and unblock remain the lifecycle; experts add no stages. Use one contract
authoring template. Schema shape belongs to [Verification](../../runtime/verification/.agent/contract.md), not copied skill rules.

Instructions consume [Delivery](../../runtime/delivery/.agent/contract.md)'s state and [Graph](../../runtime/graph/.agent/contract.md)'s routes. They must
not invent a second acceptance or completion mechanism. [Installation](../../runtime/installation/.agent/contract.md) owns
replacement/preservation policy; changing an asset does not authorize overwriting adopter policy.

`src/install/templates/module/AGENTS.md` is the single authored module-pointer body. Installation supplies the selected AGENTS/CLAUDE filenames; its `discovery.js` renderer adapts that template to the unit name and depth.
[Distribution](../../runtime/distribution/.agent/contract.md) owns packaging. Keep human docs at one canonical page per topic,
and preserve durable facts before retiring temporary delivery records.
The [website owner](../../../web/.agent/contract.md) renders the guides selected by the marked public table in `docs/README.md` directly from `docs/`. Each selected file starts with one H1 and uses a direct lowercase Markdown basename. That table is the public opt-in and supplies navigation labels/descriptions; Website owns the shared page/card templates, heading navigation, compatible routes and generated sitemap. Unlisted files and subdirectories are not published. Update guide meaning here rather than maintaining parallel technical HTML. Preserve existing published anchors through the website compatibility map. Agent procedure under `src/` remains separate from human-facing guides.

The agent entry owns installed CLI launcher guidance. Lifecycle skills use bare `cg` after global npm launch correction and retain `cg.cmd` as the Windows PowerShell fallback when `cg.ps1` is blocked. The portable assessment skill supplies the same bootstrap before repository adoption. Launcher recovery preserves arguments and exit semantics; it does not authorize execution-policy changes, downloads or manual substitutes for verification. README owns human Windows setup and script-disabled installation limits; topic guides link to it.

The primary audience is senior leadership in functional roles. [Owner communication](../cg-unblock/references/owner-communication.md) owns all user-facing decision and result language, including host-supported chat links to local files and verified section lines. Portable relative links and anchors remain appropriate inside repository documents. Reviews contain only Context/background, Options, Recommendation and Why under a clear question; they live in the central human decision log until answered. Compact per-decision JSON in `.agents/cg/decisions/` owns temporary agent evidence; `harvest.js` reads it and legacy Markdown during migration. Technical commands and approval metadata do not belong in the owner review. Explain verification by its actual outcome and limits. Warmup and unblock accept conversational answers and keep ledger maintenance and skill routing with the agent. Next actions explain the owner’s choice and subsequent work without snapshot hashes or inventories of absent artifacts.

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
This repository's own [Markdown routing graph](../../../.agent/contract.md) is maintainer context, not a shipped
skill, new product contract format, or lifecycle stage.
First-party JavaScript uses concise JSDoc `@file` purpose and `@see` owner headers as described
in CONTRIBUTING. These links describe source-checkout ownership; maintainer contracts do not ship.
Fixtures, frozen readers, vendor assets and generated copies retain their existing bytes.

Warmup owns mode routing and intent, adoption and reseed references within this shared skills boundary. The generated agent entry owns the shared lifecycle bootstrap and authority table. Standalone bounded corrections use cg-produce without mandatory records or a cadence question; existing programme gates remain authoritative. Fresh phase defaults load E conditionally; retained policy controls upgrades. Declared harvest cohorts load their separate reference only when applicable.

The launcher, owner communication and lifecycle bootstrap sections are one generated CG BOOTSTRAP block in the shared agent template. Its selection instructions precede task context in fresh entries; each lifecycle skill directs recovery to that gate before following task-reading links. Installation reconciles exact historical framework reading orders into pointers to the current shared procedure while preserving customised orders and surrounding repository prose. Simple target selection needs no communication reference; material decisions and results retain that reference's requirements.

The shared bootstrap owns task selection, per-skill recovery entry and bounded context loading. Programme recovery starts with one text `cg status` query; unresolved selection stops for a scope question before task catalogs, receipts or history. Do not inspect every candidate or persist a guessed selection. After selection, retrieve only missing evidence; explicitly needed aggregate views use compact summary. Retained phase policy and fresh checks remain authoritative. Experts reuse current assignment context. Prototype invocation opens or reuses the clearly selected preview without another launch permission. Preview-only recovery uses recorded launch information without speculative write declarations or implementation catalog reading; required policy still applies before repairs/feedback edits. Report actual launch/visual evidence, and retain explicit acceptance and completion boundaries. Warmup adoption surveys and sign-off's applicable final checks remain complete.

Closure applicability separates universal decision/evidence obligations, implementation checks, existing queues, declared harvest cohorts and documentation-only scope. No synthetic queue or cohort is required. Shared bootstrap exposes lexical-route recovery.

## Warmup reading routes

| Change | Source |
| --- | --- |
| Readiness, mode selection and pending product upgrade | [SKILL.md](../cg-warmup/SKILL.md) |
| Initial intent or stale approval | [intent.md](../cg-warmup/references/intent.md) |
| Recursive mapping and interrupted adoption | [adoption.md](../cg-warmup/references/adoption.md) |
| Additive refresh of governed roots | [reseed.md](../cg-warmup/references/reseed.md) |
| Shared responsibility comparison | [responsibility-review.md](../cg-warmup/references/responsibility-review.md) |
| Context cues and host metadata | [warmup.yaml](../cg-warmup/assets/warmup.yaml), [openai.yaml](../cg-warmup/agents/openai.yaml) |

Warmup preserves authored purpose, exclusions, P identities and retained workflow policy. It proposes missing product rationale for owner confirmation before init completes migration; it does not invent rationale or rewrite application behavior. Greenfield work establishes intent and root context, while adoption maps existing code and reseed updates governed roots additively. Conditional reference loading does not make the six installed lifecycle skills optional.

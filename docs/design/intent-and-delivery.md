# Intent approval and sprint delivery design

**Status:** Implemented design. This record explains current representation and trade-offs; the installed skills own the agent procedure.

## Why these mechanisms exist

An implementation, its amended contracts and its tests can agree with one another while describing the wrong product. Owner-confirmed intent supplies the reference for judging a promise change. It does not replace Contract Graph's core purpose: traversable responsibilities and bounded implementation reading. Project intent also does not settle the expected experience of every change, so delivery separately agrees an outcome, reviews the working result and finishes verification.

See [Vision](../vision.md) for product purpose, [architecture considerations](../architecture-considerations.md) for authority and boundaries, [intent approval](../intent.md) for adoption, and [workflow](../workflow.md) for the human delivery model.

## One authoritative record per fact

| Record | Owns |
|---|---|
| `<docs>/project-intent.md` and named binding sources | Repository purpose, boundaries, variation and accepted source meaning. Existing canonical documents can remain authoritative. |
| `.agents/cg/intent.json` | Attributed review/approval and the content snapshot to which it applies. |
| Boundary `contract.yaml` | Current structural responsibility, surface, relationships, routes and promises, with discrepancies/evidence gaps stated honestly. |
| `<docs>/plans/<programme>/roadmap.md` | Agreed goals, sprint/item outcomes, dependencies and deferred obligations. It is transient scheduling context. |
| Prepared phase queues | Technical Step readiness, declared scope, assigned gates and handoffs. |
| Existing delivery records | Working-result review, attributed acceptance, completion-request scope, history and final source evidence. |
| Phase acceptance record | Final verification evidence. Other records link to it rather than duplicate it. |
| Durable design and product documents | Current rationale and guidance that must survive plan removal. |

`cg status` and `cg next` derive current routing from these records. They do not create another authoritative status ledger. Completed-scope plans and progress files are removed after durable knowledge and required evidence are preserved; the delivery receipt retains final sign-off text. Active shared dependencies and explicit repository retention policy remain exceptions. See [completion cleanup](../workflow.md#keeping-documentation-small).

## Intent representation and trust

The intent page has six required sections: Purpose and audience, Boundaries, Variation, Acceptance example, Open questions and Binding sources. Material questions must be resolved before approval. The current representation has repository-wide scope; module purpose is normally refined in contracts rather than represented by a second approval hierarchy.

`cg intent review` records a SHA-256 snapshot over the full page and explicitly listed source files. `cg intent approve` requires the exact reviewed snapshot and attributed response. A changed page or binding source invalidates freshness; unrelated implementation changes do not rewrite intent. Paths are constrained to the repository, including symlink targets. Init preserves the page and approval record.

Full-file freshness is deliberately conservative: even editorial changes require review. It avoids pretending that a Markdown semantic comparison can determine whether product meaning changed. References are explicit rather than transitively followed; a source needed to understand an obligation must be included in the binding-source list.

These records attribute an answer and establish content freshness, not authenticated identity or product conformance. A repository may use `cg intent verify --evidence <trusted-record>` in owner-controlled CI with independently protected evidence. The framework does not install remote protection. A local writable approval file alone cannot prove that an authorized human supplied it.

Installed lifecycle admission checks intent readiness. Direct delivery start, resume, handoff and close also check it. Read-only inspection and drafting remain available; uninstalled standalone APIs retain compatibility and do not establish adoption readiness. Ordinary graph verification keeps its existing exit semantics and does not execute every declared application check.

## Sprint representation and routing

A new roadmap opts in with `Delivery: sprint`. Its existing six-column Phase map represents sprints and retains Current, Blocked, Complete and Future row states. Programme Status remains Proposed, Active or Complete. Proposed plans route to planning; active sprint iteration reports the origin-neutral `delivery-review` state and routes to produce; a non-closed sprint receipt denies prototype dispatch; malformed headers block delivery and admit planning repair. Explicit programme selection isolates unrelated malformed sprint plans.

Features, Bugs and Tasks have stable IDs and outcome criteria in the master roadmap. Just-in-time preparation for a working review stays with those items. Sign-off finishes tests/docs and verification; produce prepares implementation repairs in the smallest necessary internal queue. Version 0.7.0 retires the former standalone preparation and auto-run skills. Planning establishes technical readiness; produce owns incremental preparation and implementation repairs. Existing queues remain a useful internal execution representation, not a parallel legacy workflow.

Both development loops use `cg delivery` and one delivery-record engine. New records live at `.agents/cg/deliveries/<programme>.json`; prior `.agents/cg/prototypes/` records remain readable and are updated in place, without creating another approval store. Duplicate records for one programme fail closed. During an epic, the current acceptance scope names its sprint and items; advancing to another sprint preserves prior evidence as history and requires fresh acceptance. A delivery state describes the record's lifecycle, not proof that every sprint is complete.

Plan agreement, execution authority, working-result acceptance and verified completion are distinct. A completion request records actual words and scope. It can authorize continued preparation, implementation, repairs and sign-off without repeated user invocation. Host dispatch remembers the selected programme, and recovery reuses its recorded request. The CLI does not interpret free-text scope as authenticated authorization; the executing skill must preserve the actual request and its exclusions.

## Review cadence, continuation and test timing

Produce obtains and records the owner’s batch or per-item review choice before execution. Batch mode leaves input-dependent steps and their consumers pending while implementing independent items. Per-item mode pauses after each developed item. Current progress and pending questions are recovered from the existing plan, decisions and receipts. Reports show every requested item with Code/Test/Docs status and a concrete next action, or None when the requested work and its required acceptance and verification are complete. These are agent interaction instructions, not proof that the CLI can interpret prose choices or owner intent.

Working-result review can defer unstable application tests and final documentation into explicit finishing obligations. It cannot defer truthful contracts, binding protections or verification needed for safe execution. Stable non-UI changes may need focused early tests. Finishing preserves the existing Step gates and final checks; acceptance of a preview cannot close an incomplete queue.

This timing avoids repeatedly formalizing an unsettled interpretation. It does not mean old tests are disposable. A changed expectation must be justified against the accepted requirement, and a valid failing expectation calls for implementation repair. A relevant unrelated consumer or negative case helps detect accidental specialization of a reusable promise, without imposing genericity on an intentionally domain-specific product.

Re-init refreshes skills and hooks while preserving repository-owned workflow and phase policy. Deliberate retained restrictions need reconciliation; a new skill name or roadmap marker does not authorize overwriting them. Existing installation/build identity checks remain in force. See [upgrade](../upgrade.md).

## Limits and maintenance

The runtime checks record shape, content freshness, routing and execution evidence. It cannot establish that intent prose is meaningful, infer missing owner authority, prove arbitrary product satisfaction or guarantee that an average model will interpret every instruction correctly. Graph verification also does not prove complete correspondence to implementation dependencies or safe parallel writes.

Ongoing testing, user feedback and evolution are ordinary maintenance. Additional approval hierarchies, semantic freshness, richer intent schemas or new execution machinery need a demonstrated problem and their own scoped change; they are not unfinished obligations of this design.

## Implementation references

- [Intent engine](../../src/scripts/intent.js), [admission routing](../../src/scripts/next.js), [status](../../src/scripts/status.js) and [host hook](../../src/install/hooks/cg-gate.mjs).
- [Warmup](../../src/skills/cg-warmup/SKILL.md), [planning](../../src/skills/cg-plan/SKILL.md), [sprint production](../../src/skills/cg-produce/references/sprint-production.md) and [delivery completion](../../src/skills/cg-sign-off/references/delivery-completion.md).
- [Intent tests](../../test/intent.test.js) and [prototype/sprint lifecycle tests](../../test/prototype.test.js) cover missing/stale approval, preservation, routing, recovery, failed final checks and cross-programme continuation boundaries. They establish those runtime behaviors, not empirical gains in user satisfaction or delivery speed.

Production skill admission and Step execution readiness are separate. A blocked technical queue, or a completed queue with an Active completion request, may admit cg-produce with entry `execution-preparation` and `executionAllowed: false` so it can prepare an in-scope correction. This does not select an executable Step or resolve any owner/external blocker. After preparation, cg next must identify an eligible Step before implementation. Host completion authority and delivery acceptance/suspension remain separate gates. Sprint item review cadence and report formatting remain agent procedures; queue routing does not machine-interpret those item records.

## One accepted handoff and one sign-off

Plan/produce and prototype retain their distinct development loops until acceptance and `cg delivery handoff`. That command validates the shared roadmap structure, checks review freshness and records accepted scope, review/source snapshots and links to remaining obligations and the completion gate. Acceptance can explicitly include deferred work; it does not certify production readiness. The plan keeps the full criteria and obligations; the JSON references them rather than duplicating the backlog.

Every Handed off record routes to cg-sign-off and the same `delivery-completion` entry. A handoff without a queue finishes from the roadmap; it does not require creating a preparation document. Queue state remains available for eligible implementation repairs. Before handoff, sign-off may inspect and recover a request, but `handoffReady: false` leaves development/review with its current loop. No sign-off procedure branches on workflow origin. A phase or sprint is a scope boundary, not another sign-off type. Sign-off owns deferred tests/docs, verification and closure; produce owns implementation, contract and detector repairs under the same authority. Required affected review, owner decisions, suspension and scope limits remain binding.

`cg delivery status --json` exposes the complete record; `cg status` and `cg next` expose its summary as `receipt`. The old `cg prototype` command remains an alias to this same engine for existing callers, not a separate workflow. Old metadata is never silently moved or deleted. Init backs up and removes the three superseded framework sign-off references when their prior manifest establishes ownership, preserving custom references and repository policy. No new schema version or duplicate state owner is introduced.

## Optional coordinator and bounded specialists

Produce and prototype share an execution strategy: one coordinator retains the outcome and owner conversation while bounded specialists investigate or implement coherent assignments. Direct execution remains valid when delegation is unavailable, restricted or adds little value. This changes agent procedure, not the contract graph schema, delivery state machine or number of lifecycle skills. No scheduler, automatic agent disposal or enforced write confinement is added. The optional repository-owned expert index and supplied domain skills are described in [expert skills](../experts.md).

The coordinator owns dependency order, review cadence, integration, reporting and recovery. Existing roadmap notes retain assignment scope, actor identity, state, evidence pointers and next action. Delivery JSON retains actual acceptance, completion authority, session declarations and evidence history. Technical queues keep their existing Step state. A fresh coordinator recovers those records and checks live workers and disk before assigning work again. This limits the need to retain implementation transcripts; it does not prove a context or reliability improvement.

A specialist receives a bounded outcome, contract routes, authority and exclusions, exact starting checkout, allowed writes/resources, prerequisite evidence, stage-specific checks and return conditions. It owns its session declarations and implementation evidence. Programme acceptance, lifecycle changes and shared queue/roadmap updates stay with the coordinator. After inspecting the diff and relevant integration evidence, the coordinator retains the specialist for immediate repairs or releases its writes and retires it using supported host controls. Evidence and source remain. Silence never proves a worker stopped.

Technical queues still execute one Step at a time. Independent contributions may share the current Step; the integrated Step must satisfy its gate before dependencies advance. Without a technical queue, batch production may assign independent items concurrently after checking actual dependencies, file ownership and shared resources. Per-item review remains limited to the current item. Declarations and separate worktrees cannot by themselves prove independence. Shared interfaces, contracts, lockfiles, builds and preview resources require explicit ownership; uncertain work stays sequential.

Prototype benefits from the same continuity, especially across feedback rounds and multiple implementation surfaces. Its coordinator owns the running preview and accepted choices. Specialists work on the current bounded experiment without generating speculative production Steps or application test suites. Superseding feedback stops affected writers before reassignment; the coordinator integrates one coherent preview before review. This preserves exploration instead of importing production overhead into it. Both loops still converge at the accepted delivery handoff and one sign-off procedure.

API, mobile, web and UI design expertise ships as small domain skills; desktop and other expertise can be added by a repository. These are skills for assigned workers, not running agents or new structural layers. Assignment follows responsible contract boundaries. A UX proposal cannot substitute for an owner decision. Future specialist definitions can use this same assignment/handoff protocol without changing completion authority. See the shared [coordinator procedure](../../src/skills/cg-produce/references/coordination.md) and [specialist protocol](../../src/skills/cg-produce/references/specialist-assignment.md).

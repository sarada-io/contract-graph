# Workflow

How a programme of work is split, run, and left behind so the **next** session can start from the
repository rather than from yesterday's chat.

The [lifecycle](lifecycle.md) lists the stages. This page is the shape of the work: what you
agree at each layer, what gets written, and what is still true after the plan is removed.

## Agree intent, then deliver a sprint

After init, run warmup for either a new or existing project. Warmup drafts `project-intent.md` from available vision, specifications and decisions, then asks the owner to confirm the interpretation. Code that violates accepted intent is a finding to correct; it does not redefine the intended product. `cg intent verify` checks whether the reviewed page and its declared binding sources still match attributed approval. It does not prove the implementation conforms or authenticate who approved it.

For new work, `/cg-plan` agrees a goal, objectives and expected outcomes in one Sprint Plan, or an Epic Plan containing several sprints. A sprint is a bounded, reviewable increment containing whatever features, bugs and tasks serve its goal. Contract impact, dependencies, uncertainty, compatibility risk and review burden guide grouping; there is no fixed contract-count threshold. The plan starts with a short executive summary and retains complete agent detail below it.

`/cg-produce` implements the selected sprint, preparing small changes internally and collecting related corrections into the agreed review batch. Contracts, binding detectors and required safety checks stay current. Unstable application tests and final documentation may wait until the working result is accepted. `/cg-sign-off` then finishes those obligations and repairs failures on the same implementation. Acceptance of a preview is not verified completion.

A request to complete a sprint or epic authorizes this continuation without repeated skill invocations. Human acceptance and material product choices still require actual answers. A request merely to agree a plan does not authorize implementation; completion does not itself authorize merging or publication. `/cg-unblock` records decisions against stable sprint and item IDs.

New roadmaps declare `Delivery: sprint`. Their existing Phase map rows represent sprints, prepared queues hold finishing work, and delivery records retain review and completion evidence. Version 0.7.0 retires the separate preparation and auto-run skills. There is no parallel legacy delivery workflow. Repository-owned workflow policy survives upgrades; reconcile deliberate restrictions rather than silently replacing them.

## Organising a Sprint or Epic Plan

A sprint is a bounded, reviewable increment toward an agreed goal. It can contain several features, bugs and supporting tasks; a calendar timebox is optional and its expiry never means completion. An epic contains several dependent sprints in one master plan. Group work by a coherent outcome, dependencies, contract impact, compatibility risk, uncertainty and review burden. The number of contracts is an impact signal, not a fixed threshold, and ticket type is not a useful sprint boundary.

| Term | Meaning |
|---|---|
| Goal | The useful result the owner wants. |
| Objective | An observable aspect of that result. |
| Feature | A new or improved capability. |
| Bug | Behavior that violates an accepted promise. |
| Task | Necessary supporting work, including tests, documentation, migration or investigation. |
| Acceptance criteria | Concrete behavior and relevant UX or non-UI conditions the result must satisfy. |
| Complete | Accepted outcome, finished deferred obligations, truthful contracts and passing required checks. |

The master plan opens with a short Executive Summary: Problem/Opportunity, Solution Overview and Plan Overview. Complete agent detail follows below, using the same stable sprint and Feature/Bug/Task IDs. Keep useful context instead of making the owner read every technical task to agree the outcome. The summary explains both what each sprint achieves and how it will achieve it.

For example, a reliable export sprint can contain a filtered CSV feature, an empty-state bug fix, regression coverage and documentation. Implement the feature and fix for one review batch, then complete the deferred coverage and docs against accepted behavior. Eight related corrections can stay in one batch. A separate background-export sprint is justified if it has a distinct infrastructure dependency and useful intermediate outcome, not merely because it is another feature.

A full sprint-completion request authorizes implementation, review coordination and finishing within that scope. An epic request can continue successive ready sprints; one-sprint authority stops at its boundary. Neither approves unseen UX nor grants merge or release permission. Routine in-scope corrections update the same plan; a materially changed goal needs the affected decision, not automatic regeneration of every artifact. Record consequential decisions once, scoped to the sprint name/ID and affected item IDs.

During working-result review, unstable application tests and final documentation can be deferred with named obligations. Contract truth, binding detectors, launch/build and risk-critical checks remain immediate. Stable non-UI logic may need early tests. Prepared finishing queues retain their assigned gates, and a failed gate remains unfinished work to investigate and repair. A changed test expectation must follow the accepted promise rather than conceal an implementation defect.

The [design record](design/intent-and-delivery.md) describes which artifacts own state and how sprint mode reuses existing machinery. Internal execution queues support finishing and repairs; they are not another owner-facing planning stage.

## Prototype before detailed delivery

When the desired experience needs hands-on exploration, start with `/cg-prototype`. It launches
the application, makes small changes, and iterates through your manual feedback while deferring
application test automation. Relevant contracts still guide placement and remain truthful; an
iteration that edits contract YAML runs `cg verify` immediately.

Explicit prototype acceptance leads to an Active roadmap describing the actual provisional code and remaining obligations, without another plan invocation. The programme’s top-level `Status:` is `Proposed`, `Active`,
or `Complete`; phase-table statuses are `Current`, `Blocked`, `Complete`, or `Future`.
Both loops end at `cg delivery handoff`; the same sign-off completes tests/docs and verification, using produce for implementation repairs. Prototype
acceptance never marks the initiative delivered. See [Prototype](prototype.md) for recovery,
review evidence, and optional merge protection.

## Planning readiness and production review

Planning establishes enough context for a bounded implementation: current behavior and known failures, responsible contracts and consumers, likely approach, prerequisites, risks, immediate checks and deferred obligations. Unknown product decisions block dependent work. Exact implementation actions are refined in production rather than through a second preparation stage.

Before starting production, the agent asks whether to implement all remaining items and review them together, or review after each developed item. It remembers the choice for that run. In batch mode it explains that input-dependent steps will wait while independent items proceed. Those skipped steps remain visible and incomplete; their dependents wait too. Per-item mode pauses for each item's review before implementing the next.

Every production run ends with a compact table: **Item (Feature/Task/Bug summary, status and plan link), Code, Test, Docs**. The work columns use Yes, No, Partial or Blocked. The agent briefly explains exceptions, missing inputs and deferred obligations, then recommends the next action from actual remaining work. When the requested work and its required acceptance and verification are complete, it reports None; it does not invent another sign-off stage. A completed implementation can still await review, tests or documentation.

The agent checkpoints progress in the existing plan and evidence records, recovers pending questions and recorded answers, and resumes eligible work within the original request. Automatic continuation does not require a separate mode or Manager/Engineer hierarchy. A full-completion request carries work through review, finishing and in-scope repairs; required human acceptance and real blockers remain stopping conditions.

## How a prepared queue is executed

**Plan** writes a roadmap under your docs tree (default `docs/plans/<programme>/roadmap.md`).
Each phase has one observable outcome and one acceptance gate. Phases do not own files. The
roadmap is the sequence you agreed. It is not current product behaviour. Current behaviour stays
in `contract.yaml`.

**Production’s internal preparation** turns the selected finishing or repair work into a queue when needed:
`<docs>/plans/<programme>/<phase>_detailed_preparation.md`. Each step names what it may change,
what it depends on, what blocks it, and the command that proves it. Priority is only a tie-break
among ready work. Real constraints are explicit dependencies, so a blocked step does not freeze
an independent later step.

**Produce** runs the earliest ready step from the last verified state, or the explicitly measured
prototype baseline admitted for its first corrective Step. During finishing, required implementation repairs, tests and contract changes close together. Initial working-result review may defer unstable tests/docs as recorded obligations. When the step's gate and `cg verify` pass, that
handoff **is** the starting point for the next ready step. Produce continues through ready work
until the queue is drained or nothing is ready.

**Sign-off** runs when every step in the phase is complete. If the phase gate passes, transient
plan files for that phase are removed once their evidence and active consumers are accounted for. Knowledge that must survive goes into contracts, product
rules, or durable docs — not into a plan you are about to delete. A defect that is still this
phase's behaviour returns to produce. A finding that was never this phase returns to plan.

## Verification without duplicate work

Preparation assigns checks for the changed promises, applicable detectors, and affected consumers.
Produce executes that assignment. Sign-off uses one final evidence inventory for Step obligations,
composition, and the full repository gate. Checks run again when relevant inputs change or their
applicability is uncertain; a stage transition alone does not invalidate a recorded result.

Coverage follows changed behavior and invariants, rather than requiring a new test file for every
class. Existing sufficient coverage can be retained. Internal edits with unchanged contract facts
need an impact assessment but no artificial YAML change. Repository-required gates remain binding;
Contract Graph does not yet calculate safe implementation impact automatically.

## Keeping documentation small

Each fact has one home: contracts for structural truth, the roadmap for programme outcomes, the
phase queue for Step state and inline handoffs, and one phase acceptance record for final evidence.
Later stages link those records. They do not require another report that repeats them. Shared phase
context appears once above the Step sections; current notes are updated rather than appended forever.

A guide or decision is created only for an unmet reader need. Closing a phase can require no durable
documentation change. Existing evidence remains available, but its preservation does not require
copying the same narrative into every handoff.

Successful completion includes cleanup of the finished scope’s temporary files. Update existing product/operator documentation, approved intent, contracts and applicable rules before deleting their planning sources. Preserve actual owner approval when intent changes. Keep shared plans and evidence still needed by active work, and honor explicit repository retention policy; do not create an archive by default. The delivery JSON retains acceptance and final verification, including the sign-off text. Remove its temporary sign-off input after successful close, then verify links and graph truth. A closed receipt does not waive unfinished cleanup.

## What the next session is supposed to trust

A permanent contract that cites a plan path or ticket id as the source of a rule cannot survive plan removal. State the current promise in full in its owning contract and keep scheduling evidence in the plan.

A later session should not need the previous chat. It should be able to route through the
**contract graph**, see remaining work on the **roadmap and queue**, and take accepted **resolved
decisions** as settled until they are promoted or dropped.

| Lasting | Temporary |
|---|---|
| `contract.yaml` nodes, edges, routes, invariants | Completed roadmaps, step queues and process/progress notes (delete after harvesting durable knowledge and required evidence) |
| Architecture bindings (`A`) and product rules (`P`) | Leftover pre-0.7.0 auto-run ledgers (reconcile recovery evidence before deletion; no new ledgers are created) |
| Durable records under `docs/decisions/` and `docs/guides/` | Warmup findings once adoption has finished; a reseed delta after the owner has read it |
| The decision log *file* (entries drain; the ledger remains) | A decision *id* as the source of a contract rule |

If deleting `docs/plans/` would lose a rule, the rule was stored in the wrong place.

After a green step, the baseline is the pair **code that exists** and **graph that describes it**.
The next step, and the next person or agent, starts from that pair.

## Seeing where you are

These commands inspect the same disk state the stages use. They do not require the last chat.

| Command | What it tells you |
|---|---|
| `cg next` | Which stage owns the next move, from delivery records, roadmaps and queues |
| `cg status --programme <slug>` | Current Steps, blockers, recovery action, and residue owners, read from disk |
| `cg residue [--programme <slug>]` | Unreferenced plan files; scoped checks include shared/unassigned files and list other owners |
| `cg verify` | Whether the authored graph is closed — not yet whether every import matches it |
| `cg graph show` | A projection of the contract graph |
| `cg contract route --task "…"` | Which contracts a request should load first |

`cg init --docs` can place plans somewhere other than `docs/`. `cg residue` prints the plans
directory that is actually in use.

## Related

- [Vision](vision.md) — why the graph exists.
- [Contracts](contracts.md) — node shape and what verification proves today.
- [Lifecycle](lifecycle.md) — the stages and the structural walk they share.
- [Upgrade](upgrade.md) — Update through `cg init`, preserving repository choices.

## Coordinating specialist work

Produce can use one coordinator with bounded specialists when the host and repository permit delegation. The coordinator preserves the agreed scope, review choice, dependencies and pending decisions, verifies returned work, integrates it and reports to the owner. Specialists remain through coherent work and immediate repairs, then release their writes and retire after verified handoff. Existing plans and receipts carry recovery context; a long-running conversation is not the only copy.

Single-agent execution remains supported. Technical queues keep one Step in progress. Parallel contributions inside that Step, or independent batch items without a queue, require inspected dependencies and resolved file/resource ownership. Per-item review still waits before developing the next item. Internal handoff verification never supplies human acceptance or final sign-off. Web, API, mobile, desktop or UX expertise can fill assignments without adding lifecycle stages. See the [coordination design](design/intent-and-delivery.md#optional-coordinator-and-bounded-specialists), including its prototype application and current limits.

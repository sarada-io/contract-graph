# Repository Agent Workflow

This repository-owned workflow supplies delivery policy for Contract Graph Dev Kit, a framework for agentic software development built around the repository-native contract graph. Contract Graph’s structural authority remains `.agents/cg/principles/architecture.yaml`; changing the delivery sequence cannot remove graph obligations. Init preserves local workflow and phase policy. When retained policy names retired stages, reconcile it explicitly with the 0.7.0 loop before executing dependent work.

## Intent, planning and execution

Both new and existing repositories start with cg-warmup after init. Maintain `.agents/cg/project-context.md` beside the root contract as a concise copy of project intent from repository documentation, with source links and current approved direction. Establish owner-confirmed project intent from existing sources and verify its freshness with `cg intent verify`. Existing code is evidence of conformance, not authority to replace an accepted requirement. Modules refine parent purpose through their contracts.

Use cg-plan to agree a goal, mixed Features/Bugs/Tasks and observable acceptance in one Sprint or Epic Plan. The human summary and agent details reference the same stable IDs. Planning examines the baseline, relevant contracts and consumers, probable approach, prerequisites, risks and checks before handing ready work to produce. Do not demand speculative implementation details for every future sprint. Scope questions block affected work, not independent items.

Use cg-produce to implement the selected sprint with internal, incremental preparation. It must ask whether the owner wants all remaining items followed by combined review, or review after each developed item, unless that explicit choice is already recorded for this run. Use a permitted structured question tool with selectable options when available, preferring asynchronous interaction; otherwise show numbered options in chat. Collect missing scope and cadence together as separate questions, and ask only what existing answers leave unresolved. Persist the answer and scope in the master plan. Batch mode explains that input-dependent steps will wait while independent items proceed. Preserve blocked items and their dependencies; never silently omit or complete them. Per-item mode pauses for the selected item's review before implementing the next.

Use cg-sign-off after acceptance to finish required tests and useful documentation, verify combined outcomes and close the sprint. In-scope implementation defects return to produce, which prepares and repairs them under the same plan. Ordinary repairs do not need another plan or stage permission. Required human review still applies when the accepted experience changes.

An actual request to complete a sprint or epic supplies scoped continuation through finishing and repair. Plan agreement alone does not start execution; preview permission does not authorise completion; neither grants unseen UX acceptance or merge/release permission. Record the actual completion request in the applicable receipt. One-sprint authority stops at that boundary. Epic authority may continue settled ready sprints, with fresh acceptance for each result. Pause/cancellation, missing owner decisions and external prerequisites remain real stopping conditions.

Both plan/produce and exploratory cg-prototype work end at the same accepted `cg delivery handoff`. Sign-off consumes that handoff without selecting a workflow-specific procedure. Before handoff, the originating loop still owns development and review. For exploratory outcomes use cg-prototype, then the common sign-off procedure. Keep accepted code and the same roadmap. Do not reconstruct exploratory edits as imaginary historical Steps or invent a second planning programme.

## Route and preserve promises

1. Read the repository contract and resolve the selected work through contract-owned routes. Follow parent/child context to the smallest responsible boundary.
2. Load `.agents/cg/phases.json` families for the active skill and resolve applicable product rules. A is globally binding, scoped P is binding, E is advisory. An E disagreement alone is not a blocker or owner decision.
3. Apply `.agents/cg/principles/architecture.yaml` `graph`: stay, add-child, elsewhere. Read implementation only after this placement is known. Keep new self-sufficient units and reciprocal edges truthful in the same change.
4. Compare changed purpose, surfaces and invariants with accepted promises and caller expectations. A valid test failure calls for implementation repair; changing an expectation needs evidence of an incorrect test or an authorised requirement change.
5. Keep binding detectors and checks needed to safely build/run the change during iteration. Unstable application tests and final docs can be deferred explicitly; they remain completion obligations. Use `.agents/skills/cg-produce/references/verification.md` for scoped gates and evidence reuse.

## State, questions and recovery

Contracts own current structural truth. The master roadmap owns sprint/item outcomes, review cadence, deferred obligations and the current production checkpoint. Internal Step queues own technical execution state where needed. Delivery records own working-result acceptance, completion scope and final source evidence. One final acceptance record owns verification evidence. Link these records rather than duplicate their contents in another ledger.

Before handoffs checkpoint the selected sprint/item, pending decision IDs and next action. On recovery measure current disk state using cg status and cg next with the selected programme, reconcile stale notes, and read recorded answers before asking again. Preserve unrelated changes and use the intended checkout. Keep technical queues sequential by dependency readiness. Produce and prototype may use one coordinator with bounded specialists under `.agents/skills/cg-produce/references/coordination.md`; direct execution remains supported. Select domain expertise from the repository-owned `.agents/cg/experts.md` index and load only relevant skills. The coordinator owns the user conversation, assignment notes, integration and recovery; specialists return scoped implementation evidence. Permit concurrent writes only after checking actual dependencies and shared resources, and retain the selected review cadence. Prototype delegation preserves its early-preview loop and deferred application tests. Worker completion is not owner acceptance. Honour explicitly requested execution/model constraints without inventing effective settings.

Use cg-unblock for consequential choices. Check existing intent, plan and decisions first. Record the full pending question, options, tradeoffs, recommendation and affected sprint/item IDs in one DU entry before asking. Record the actual answer before unblocking, and clear only the resolved prerequisite. Silence, elapsed time, preselected choices and passing tests are not approval. Batch work can continue independently while a decision waits. When an approved decision changes project direction or enduring constraints, reconcile project-context.md and its canonical sources immediately through the existing intent approval flow; routine choices remain outside that context.

## Mandatory Next-Action Response

Keep responses concise. At each production run stop or review, show every item in the selected run scope in a table with columns **Item — type, summary, status and plan pointer | Code | Test | Docs**. The work columns use **Yes / No / Partial / Blocked**; explain non-required categories and legitimate deferrals briefly. Code completion is not acceptance or sprint completion. Test Yes requires applicable passing evidence.

For pending owner decisions, use cg-unblock D-6/D-7: lead with the concrete review question, linked content, choices and what happens after the answer. Keep hashes, commands and dependency IDs in supporting evidence. Accept a conversational reply; do not require a ledger edit or skill invocation. Omit lists of artifacts that were not created. This owner-facing decision block replaces the skill-routing footer below while an answer is pending.

Otherwise end with **Next recommended: `<action or None>` — `<exact scope and reason>`**. Name pending review explicitly before its dependent next step. Use cg-produce for remaining implementation or repairs, cg-sign-off for accepted-result finishing, cg-unblock for an unresolved decision with no independent work, and cg-plan for changed outcomes. Continue automatically under an existing applicable completion request; do not require the owner to repeat a stage invocation. When the requested work and its applicable acceptance and verification are complete, report None. Do not invent finishing work or repeat valid verification merely to name another skill.

## Contract Update Triggers

Apply `.agents/cg/principles/architecture.yaml` `graph` first: recurse, selfSufficient, surface, adapters, stay, add-child, or elsewhere.

Update this node's `<boundary>/.agents/cg/contract.yaml` when the decision is `stay` and any of
these change:

- dependency direction or allowed/forbidden imports
- public entry points used by other modules
- security/workflow/schema invariants
- operational assumptions relied on by future agents

When the decision is `add-child`, create the child's `contract.yaml` and reciprocal parent/child
edges in the same change. Do not grow this node instead.

## Contract Self-Sufficiency Rule

Contracts must survive plan deletion. When writing or updating a contract:

- State every rule in full inside the contract. A plan/ticket ID or a
  `docs/plans/` path is never the definition of behavior.
- Do not cite `docs/plans/` paths or plan ticket IDs (e.g. `CS-4.2`) from
  `.agents/cg/` files or `docs/guides/`. Citing permanent `docs/decisions/`
  records (ADRs, accepted contracts, threat model) is allowed.
- Do not write scheduling language ("remains scheduled for `X-1.2`",
  "deferred to `X-3.5`") into contracts; describe the current state and update
  the contract when the state changes.

## Plan Harvest Step (before deleting a completed plan)

At every sign-off, reconcile the selected scope’s resolved decision-log entries and relevant `<docs>/decisions/` records under closure checks §7.0, even when no decision-harvest cohort was declared. Preserve approved direction in project-context.md and other durable meaning in its owning contract or appropriate YAML catalog; retain detailed design records only for a continuing reader, dependency or retention need. Account for each entry in the existing acceptance evidence before draining it. Pending and unrelated decisions remain.

Before removing a completed scope’s temporary plan, process and progress files, follow `.agents/skills/cg-sign-off/SKILL.md`. In short:

1. If the roadmap declares a decision harvest, classify one declared producer-phase cohort. The
   harvest must not default to every resolved decision. Require that classification IDs exactly
   equal the eligible decision IDs. Other resolved decisions and every pending decision remain in
   the log for their own cohort or answer. Validate the transient manifest before any later gate:
   `cg harvest <decision-harvest.json>
   --decision-log <docs>/plans/decision-log.md`.
2. For a non-empty cohort, obtain one batch acceptance and route it through `cg-produce`. The
   first prepared harvest Step carries the accepted classification digest, and its drain IDs
   exactly equal the eligible decision IDs. It remains blocked on source-phase completion while
   every later destination Step remains Waiting. Before closing the source, run the detector with
   `--stage close --preparation <destination-preparation.md>`. An empty cohort needs neither
   acceptance nor a route.
3. Confirm every normative rule the plan introduced is stated in full in the
   impacted `<boundary>/.agents/cg/contract.yaml` files.
4. Consolidate approved project direction in `.agents/cg/project-context.md` and structural or policy decisions in their owning contracts/catalogs. Keep a `docs/decisions/` record only when it supplies needed detail beyond those owners; otherwise retire the consumed record after preserving authority and checking consumers.
5. Verify no permanent document depends on the plan:
   `grep -rn "<plan-filename>\|<ticket-id>" .agents/cg */.agents/cg docs/decisions docs/guides`
   must return nothing before the plan is deleted.

Successful completion includes this cleanup, not an accumulating archive. Delete only obsolete files owned by the completed scope after preserving their durable knowledge and required evidence. Retain shared inputs needed by unfinished work and explicit repository retention requirements. Keep the compact delivery receipt; remove its temporary sign-off input only after close stores that evidence. A Closed receipt with unfinished cleanup is not a finished task.

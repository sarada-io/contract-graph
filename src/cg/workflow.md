# Repository Agent Workflow

This is the default delivery workflow installed by Contract Graph. It is repository-owned and
preserved by later `cg init` runs, so an adopting repository may keep or amend it. While retained,
its sequence governs repository code tasks. The separate
`.agents/cg/principles/architecture.yaml` remains the machine-enforced source for Contract Graph
structural integrity.

## Development Principles

1. **Specs are the behavioral source of truth; contracts are the structural source of truth.**
   Generated code is disposable; neither product intent nor the graph describing its ownership is.
   Fold behavioral clarification into the specification and structural change into the affected
   YAML contracts.
2. **Requirement and rule IDs are stable.** Redefine in place or append — never renumber.
3. **Small vertical slices**, small enough that skimming the diff is genuinely feasible. Skim
   every one — not for correctness (tests cover that) but for whether the agent solved the
   problem you meant.
4. **Walking skeleton before features.** The first deployed slice goes end to end and is read
   line by line. Everything after is pattern-matched to it.
5. **Match claims to evidence.** Use executable checks for machine-verifiable promises and
   attributed human observations for prototype acceptance. State failures and checks not run.
6. **Resolve from authority; ask when a user decision remains.** Follow
   `.agents/skills/cg-unblock/SKILL.md` for assumptions, protected choices, and decision records.
   An Auto-Run Engineer asks its Manager first; the Manager checks the Plan and accepted decisions
   before asking the user directly in chat or interaction mode. Resolve `<docs>` from
   `.agents/cg/profile.json` `docs` (default `docs`). Record the context, viable options, and
   recommendation in `<docs>/plans/decision-log.md`, present the question with a free-text answer
   path, and record the user's selected option or typed solution against the same `DU-NN` entry.
   Save the full request before asking, so a new session can recover and present unanswered
   questions under the same IDs without needing the previous chat. Save answers before unblocking.
   Ask while independent work continues when the host permits it. A pending recommendation,
   preselected option, silence, or elapsed time is not approval. Recalculate readiness immediately
   after recording an answer; resume only work whose dependencies and blockers are satisfied.

After structural bindings, scoped product rules, the repository constitution, contracts, accepted
decisions, durable requirements, and existing green patterns have been applied, load only the
guidance relevant to the remaining fork from `.agents/cg/guidelines/`. Cite any preference used, its
reason, and its stated cost into the assumption or decision. `E` practices are
decision inputs, never inherited ambient rules and never compliance findings. The recursive
mapping and node decision — kinds, self-sufficiency, stay, add a child, or route elsewhere —
live in `.agents/cg/principles/architecture.yaml` `hierarchy` and `graph`, not in
this workflow, so editing the delivery sequence cannot drop them.
During harvest, use `cg-unblock` D-5a: route a recurring decision once to a contract invariant, an
`E` guideline, an A promotion candidate, a scoped P binding, or drop.

## Required Sequence

1. Read `.agents/cg/contract.yaml` directly or with `cg contract show`.
2. Read `.agents/cg/principles/architecture.yaml`; its `hierarchy.kinds` and `graph` sections are the
   recursive mapping and node decision, and its A rules bind every governed boundary.
3. Read the repository's specification or constitution and resolve applicable P IDs from the
   selected contracts. Consult `E` only when it is relevant to a decision.
4. Identify impacted boundaries with `cg contract route --task "<request>"` and contract-owned routes.
5. Load those module contracts, then traverse their child-contract links until the smallest
   responsible boundary is clear. Before reading or editing implementation, apply
   `.agents/cg/principles/architecture.yaml` `graph`: stay on this node, add a child node, or route
   elsewhere. Recurse until `graph.selfSufficient` and `graph.stop` say this node is the leaf.
   If placement is wrong, re-route or prepare that graph change — do not add the
   behavior to the boundary already opened. Read implementation only after this placement is known.
6. Use `cg-plan` for a sufficiently understood outcome. When the intended experience needs
   exploration, use `cg-prototype`: launch, iterate through manual feedback, record explicit
   acceptance, and finalise the same roadmap before preparation. Prototype iterations defer
   application test automation and prepared Steps, while contract truth and binding detectors remain.
7. Use `cg-prepare` to turn one selected phase into one prioritized, dependency-ordered Step queue
   in a single execution branch or worktree.
8. Use `cg-produce` to run the earliest `Ready` Step, one at a time. After each verified handoff,
   recalculate the queue and continue through ready work until every Step is `Complete` or no
   `Ready` Step remains. Never execute Steps concurrently.
9. Delivery Steps need adequate test coverage for changed observable behavior and invariants.
   Extend tests when existing coverage is insufficient; record the evidence rather than requiring
   a new test file merely because a class changed. A passing build alone does not prove coverage.
10. If behavior, boundaries, invariants, entry points, or operational assumptions changed, the
   executing Step updates impacted contract(s) and detectors in the same change.
11. Use `cg-sign-off` to verify the accumulated Step sequence, drive defects through corrective
    Steps and re-verification, and close the selected phase only when its acceptance gate passes.

Every task assesses contract impact. Update contracts when their facts change; internal changes
with unchanged promises can leave YAML untouched. Delivery is incomplete when changed behavior
lacks adequate coverage. Preparation, production, and sign-off share the evidence rules in
`.agents/skills/cg-prepare/references/verification.md`; do not repeat unchanged checks just because
a new stage asks the same question. Retained repository gates and binding detectors still apply.

Prototype progress is recorded under `.agents/cg/prototypes/` and the programme roadmap. Human
approval is distinct from delivery completion. Preparation admits the measured provisional code
and assigns deferred obligations. Final sign-off closes the durable prototype receipt only after
the delivery gate passes. Optional repository merge protection uses `cg delivery verify --base`
as a required check alongside ordinary CI; prototype status itself is not permission to merge.

Concurrent prototype and delivery sessions keep separate programme ledgers and declare each
writer's scope with `cg prototype checkpoint --programme <slug> --session <id> --evidence <json>`.
Follow the cg-prototype concurrent-work reference for observed changes, overlaps, shared resources,
and stable final checks. Session declarations do not prove independent writes. One programme's
closure does not approve another programme or make their combined branch mergeable.

Contract correctness is an execution responsibility. `cg-prepare` assigns each required contract
change to the Step that changes the behavior; `cg-produce` changes the contract and detector with
the implementation; `cg-sign-off` verifies the accumulated result. When completion finds a
current-phase defect, it owns the repair loop: completion-only composition work is fixed directly,
while behavior- or contract-affecting work is run through a corrective `cg-produce` Step.
`cg-prepare` is used first only when the remaining order or editable paths must change.
`cg-sign-off` never edits a contract outside an execution Step, and its documentation half never
repairs contract truth: a stale contract found while writing the durable record returns to
`cg-produce` as a corrective Step.

`cg-sign-off` may create a successor handover for `cg-plan` or `cg-prepare` only when the finding
is genuinely outside the selected phase or exposes a missing prerequisite or outcome error that
requires roadmap correction. The handover must contain evidence, current and required behavior,
affected scope, contract and decision impact, a proposed acceptance gate, dependencies, blocking
status, and the reason it cannot be fixed safely in the selected phase. Only truly out-of-scope
work may be carried forward while closing a green phase. A failing phase acceptance gate remains
Incomplete or Blocked and must not be archived as Complete.

## Completing a prototype with cg-sign-off

`cg-sign-off/SKILL.md` is the entry point: establish the target and sign-off type from the request
or unambiguous session context, then load either `references/prototype-completion.md` or
`references/phase-sign-off.md`. A bare invocation does not default to phase sign-off, and the only
queue ready for closure does not identify the user's intended programme. Ask for selection when
it remains ambiguous. Both procedures use `references/closure-checks.md` for evidence and archival;
the selected procedure retains continuation authority when those checks return a repair finding.

A direct request to finish a selected prototype enters cg-sign-off's prototype-completion path.
It records the user's completion request separately from UX acceptance, reconciles deferred work,
finalises the same roadmap, and coordinates prepare, sequential produce, repairs, documentation,
and ordinary phase sign-off until that prototype's completion requirements pass. It may assess
work before a delivery queue exists; assessment never authorizes premature closure.

This is a scoped stage-continuation exception for the selected prototype, with a durable request
and roadmap ledger. Prepare and produce return their handoffs to the sign-off coordinator rather
than requiring another user invocation. Existing normal phase sign-off and auto-run authority
remain unchanged. An auto-run phase worker cannot grant itself whole-prototype authority.
Use the same phase guards for actual closure, preserve concurrent ownership, and do not infer
UX approval from a sign-off command. Follow `.agents/skills/cg-sign-off/references/prototype-completion.md`.

## Sequential Execution Rule

Core Contract Graph execution uses one branch or worktree for the whole selected phase and exactly one Step
`In progress` at a time. Preparation gives every Step a stable priority number, explicit
dependencies, exact blockers, and one state: `Waiting`, `Ready`, `Blocked`, `In progress`, or
`Complete`.

The executor always selects the lowest-numbered `Ready` Step. A Step is `Ready` only when every
declared dependency is `Complete`, no unresolved decision or external prerequisite blocks it, and
the current verified phase state satisfies its brief. After each handoff or decision answer, queue
states are recalculated deterministically.

A blocked Step is deferred, never skipped or waived. A later independent Step may run only when
its declared dependencies are complete and it neither consumes nor overwrites the blocked Step's
paths or handoff. Every repeated path creates an explicit dependency. If no `Ready` Step remains,
execution yields one consolidated blocker/decision set; after answers are recorded, execution
resumes from the recalculated earliest `Ready` Step. Completion requires every prepared Step to be
`Complete`.

Do not create per-Step branches, merge or rebase Steps, or run prepared Steps concurrently.

For recovery, run `cg status --programme <slug>`. The current preparation and prototype receipt
supply the state; historical repair notes and ledgers must be reconciled against them. Report the
exact Step path, current blocker, owner, and next action. Repair selected queue syntax through
`cg-prepare`; retain completed evidence and the phase's agreed final gate. Routine status and
consumer-link corrections within assigned paths use existing authority. Changed acceptance,
disputed ownership, and unavailable external prerequisites require their proper decision owner.

Separate Step prerequisites from final closure checks. Inspect programme-local residue with
`cg residue --programme <slug>`: other programmes remain visible with owners, and shared/unassigned
findings remain in scope. Useful evidence needs a real consumer link, not automatic disposal.
Keep any required repository-wide `cg residue` at final closure and coordinate foreign findings
with their owner; a scoped clean result does not waive the global gate. Preparation corrects a
misplaced final gate without weakening its obligation.

Independently enforced module roots may become a future
low-context parallel execution extension, but that extension is not part of core Contract Graph yet. It
requires automated root-confined write detection, no worker Git operations, no shared root build,
contract, generated, or cross-root seam writes, and coordinator-owned serialization of verification
and commits. Until those controls exist, `cg-prepare` emits sequential Steps only.

## Mandatory Next-Action Response

Under `cg-auto-run`, the Manager coordinates one Engineer per phase. Those roles exist only
under that skill: standalone `cg-plan` and `cg-produce` are user-invoked stages, not Manager
or Engineer jobs. The Engineer reads the Plan directly, retains phase context through
preparation, production, corrective work and sign-off, and returns evidence and forward
implications. The Manager maintains programme continuity, handles user questions, and
validates a closed disk checklist before selecting another Engineer. Load the role
instructions linked from `.agents/skills/cg-auto-run/SKILL.md`; the Engineer reads protocol.md
then engineer.md, not manager.md. Skills still own lifecycle work. The discrete agent is one
fresh Engineer per phase, not one agent per stage. Fresh context and model selection depend
on host capabilities and must not be claimed when unavailable; without workers, stop unless
the invocation names `mixed-context`. Auto-run ledgers are deleted only after acceptance and cleanup reconciliation,
not merely because a run stops. Keep Suspended recovery state on cancellation,
missing authority or host failure until ownership and queued user answers are safe.
Use an explicit `**Status:** Closed` field only when a ledger is safe to delete;
never archive working ledgers. The Plan, contracts, decision records, queues and sign-off artifacts
allow either role to recover without previous chat history.

Every completed Contract Graph skill invocation, including a blocked or corrective result, ends its
user-facing response with exactly one `Next action` block:

```markdown
## Next action — <measured lifecycle status>
- **User action:** <one concrete action>
- **Next input:** <$cg-skill | None — terminal reason> — <exact artifact, brief, decision, or evidence>
- **Blocked by:** <condition preventing the named next action>   <!-- omit unless the status is non-advancing -->
```

Two body lines on an advancing status, three when something stops. The measured lifecycle status is
carried by the heading so a blocked or failed result is distinguishable at a glance, and the route
skill leads `Next input` as a `$cg-` token so the next hop stays mechanically extractable rather
than buried in prose.

**`Blocked by` appears if and only if the status does not advance.** On a green route it is omitted
entirely: a precondition that is already satisfied is not information, and a mandatory field with
nothing to say gets padded with restated status or completed-work evidence. Its presence is also the
single stop signal for dependent lifecycle work — a block carrying `Blocked by` is never followed
automatically into that work, at any authority level. The Auto-Run Manager may invoke `cg-unblock`
to clarify or ask the user. After the answer is recorded and queue readiness is recalculated,
dispatch from fresh measured state; do not follow or erase the old blocking block.

Advancing describes the **next action**, not whether the current implementation passes. A failed
test, rendering defect, or incomplete evidence is corrective work when an authorized agent can
investigate or fix it. Use `Re-preparation required` or `Corrective Step ready` and omit `Blocked by`
when `cg-prepare` or `cg-produce` can proceed. Put failure evidence in the finding and phase report;
the phase remains incomplete until repaired and verified. `Blocked by` names what prevents the
named next action itself: an unanswered user decision, unavailable external prerequisite, missing
authority, or a failure for which no authorized corrective route can proceed.

Under auto-run, `User action` is `None — auto-run continues with the corrective route` when the
Engineer can perform that work. Do not ask the user to add a Step or restart an already-authorized
repair. During prototype completion, use `None — prototype completion continues` for authorized
prepare/produce handoffs. Outside either continuation scope, name the next skill for the user
to invoke as usual. Evidence work that depends on a repair stays `Waiting` on the corrective Step;
it becomes `Ready` only after the
repair's verified handoff and all other prerequisites pass.

Select the immediate route from measured state. Do not list several possible skills, say only
"continue", or make the user infer which phase, Step, repair, or decision comes next. A prepared
phase names exactly one earliest `Ready` Step under `Next input`. When no Step is `Ready`, name the
consolidated blocker or decision set. When no lifecycle work remains, say `None` and why.

## Lazy-Loading Rule

Do not read all contracts by default.

- Start with module contracts selected by the root contract's task routes.
- Descend through explicitly named child contracts to locate the responsible sub-module.
- Add neighbor module contracts only after cross-module impact is confirmed.
- Stop loading contracts once constraints are clear, then inspect source inside that boundary.

The contracts are the reusable context map. Source code proves and implements their claims; it is
not the first mechanism for rediscovering the map on every session.

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

## Plan Harvest Step (before archiving a plan)

Before a completed plan moves to `<docs>/plans/archive/` (and eventually gets
deleted), follow `.agents/skills/cg-sign-off/SKILL.md`. In short:

1. If the roadmap declares a decision harvest, classify one declared producer-phase cohort. The
   harvest must not default to every resolved decision. Require that classification IDs exactly
   equal the eligible decision IDs. Other resolved decisions and every pending decision remain in
   the log for their own cohort or answer. Validate the transient manifest before any later gate:
   `cg harvest <decision-harvest.json>
   --decision-log <docs>/plans/decision-log.md`.
2. For a non-empty cohort, obtain one batch acceptance and route it through `cg-prepare`. The
   first prepared harvest Step carries the accepted classification digest, and its drain IDs
   exactly equal the eligible decision IDs. It remains blocked on source-phase completion while
   every later destination Step remains Waiting. Before closing the source, run the detector with
   `--stage close --preparation <destination-preparation.md>`. An empty cohort needs neither
   acceptance nor a route.
3. Confirm every normative rule the plan introduced is stated in full in the
   impacted `<boundary>/.agents/cg/contract.yaml` files.
4. If the plan contains accepted design rationale worth keeping, promote that
   content to a `docs/decisions/` document; otherwise let it go with the plan.
5. Verify no permanent document depends on the plan:
   `grep -rn "<plan-filename>\|<ticket-id>" .agents/cg */.agents/cg docs/decisions docs/guides`
   must return nothing before the plan is archived.

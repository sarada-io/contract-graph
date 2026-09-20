# Coordinate bounded specialists

Use this shared procedure in cg-produce or cg-prototype when delegation is available, permitted and useful. The invoking agent is the coordinator; it may implement directly or assign bounded work to specialists. This is an execution strategy inside the current skill, not another lifecycle stage or a mandatory hierarchy. A single agent follows the same ownership and review rules. Respect host capabilities, user delegation/model constraints and repository policy; do not invent agents, model settings or background persistence.

## Keep continuity small and recoverable

The coordinator owns the selected outcome, dependency order, owner conversation, review cadence, integration and progress report. Preserve authority and acceptance in the existing delivery receipt, item outcomes and pending questions in the master roadmap, and technical Step state in the existing queue. Under the roadmap's current run note, keep a compact assignment list: item or iteration, specialist session ID, scope, state, evidence pointer and next action. Link existing records rather than copying them into a manager ledger. Keep implementation transcripts out of the coordinator's context unless needed to resolve a finding.

One coordinator writes shared roadmap/queue status and performs programme review, approve, resume, handoff and completion-request actions. Specialists return proposed status updates and evidence; they do not grant acceptance, change programme authority or operate another delivery loop. Session-specific checkpoint commands remain available to each actual writer. An assignment inherits only its stated subset of existing authority. Do not ask the owner to approve routine delegation when it is already permitted.

Before replacing the coordinator or recovering after interruption, persist assignments, actual pending questions and answers, baseline/worktree, completed evidence and next eligible action. Inspect live worker state and disk before resuming or reassigning; a missing response is not proof that a worker stopped. The next coordinator resumes the same records without recreating workers already doing the work. A long-lived coordinator is useful, but correctness must not depend on an indefinitely retained conversation.

## Dispatch a coherent assignment

Give each specialist the [bounded assignment protocol](specialist-assignment.md), the current skill's relevant procedure and a concrete brief containing:

- Selected programme and item/iteration, intended outcome, acceptance conditions, actual authority and exclusions.
- Responsible contracts, relevant decisions and bounded source pointers; exact checkout and starting state, including required uncommitted changes.
- Allowed writes and shared resources, consumed dependencies, required immediate checks and deliberately deferred tests/docs.
- Expected return evidence, integration owner, and stop conditions for missing input, scope expansion or changed shared interfaces.

Read the repository-owned `.agents/cg/experts.md` index when selecting expertise. Check that a candidate path exists, its frontmatter name matches the index and its description fits the assignment; load only selected skills and apply the recorded project constraints. Missing entries are not a requirement to install anything: use direct execution or an available suitable expert. If the index is absent, inspect available skill descriptions and propose recording reusable selections there; do not make delegation depend on a guessed catalog. A conflicting constraint must be reconciled before dependent work. Record selected skill paths in the assignment.

Assign expertise to a real boundary or question. Web, API, mobile, desktop and UX are possible capabilities, not mandatory roles or new horizontal architecture layers. Use available specialists whose capabilities match the work; otherwise implement directly. A UX specialist proposes evidence and alternatives; only actual owner decisions settle consequential product choices. Resolve shared interface or UX questions before dependent implementation.

Keep a specialist through a coherent implementation and its immediate repairs. Do not rotate workers for each small edit or require a fresh worker per Step. When its handoff is verified, release its declared writes and stop or dispose of that worker through supported host controls. Preserve its evidence and identity; disposing of a worker does not delete its code, worktree or history. Stop actual writes before declaring a session released. Interrupted ownership remains unresolved until its writer is confirmed stopped.

## Bound concurrency and integrate

Default to sequential implementation. Delegate read-only investigation freely within authorized scope. Before concurrent writes, inspect actual dependencies, files and mutable resources using [session declarations](../../cg-prototype/references/concurrent-work.md). Disjoint contract names or paths alone do not prove independence. Resolve shared contracts, lockfiles, generated output, builds and preview ownership explicitly. If ownership or independence is uncertain, serialize the work. Checkpoints are evidence, not locks.

Keep the existing technical queue sequential: one Step In progress, with eligible dependencies and its gate intact. Specialists may divide independent work inside that Step; the coordinator alone advances the Step after the integrated result passes its gate. Do not use delegation to start later Waiting Steps or bypass cg next selection. Without a technical queue, batch production may delegate independent items within the agreed batch; per-item review permits implementation only within the current item until its required review. Workers never create new queues merely to obtain parallelism.

Use the intended shared checkout for disjoint writes when appropriate. If isolation is needed and authorized, ensure it contains the required starting changes and define who transfers and verifies the result. No branch/worktree per Step is required. Do not reset another worker's changes or assume a clean checkout contains uncommitted work. Keep shared metadata updates serialized and retry a busy receipt command; never bypass its lock.

Inspect each returned diff and evidence against its brief, scope, contracts and actual current source. A worker's success message or passing isolated test is insufficient. Reuse valid checks and run the necessary integration checks after combining changes. Return defects to the same worker while useful; replace it only with a recovered brief and confirmed ownership transfer. Mark the assignment verified only after this inspection. That internal check is not owner acceptance or programme closure.

## Apply the active loop's rules

**Produce:** the coordinator owns incremental preparation, dependency-safe skipping, the batch/per-item choice and Item/Code/Test/Docs reporting. Keep blocked work and its consumers pending while independent authorized work continues. Sign-off's implementation repairs use this same production strategy under the existing request.

**Prototype:** the coordinator retains the feedback conversation, cumulative accepted choices and preview ownership. Reach a usable preview before decomposing speculative future work. Delegate a bounded experiment, component or investigation when that helps the current feedback loop; do not split every adjustment or introduce technical Steps. Workers follow prototype test timing: build/serve and required graph checks, with application automation deferred. Integrate the current iteration into one preview and stop its relevant writers before capturing review. Superseding feedback requires stopping affected work, preserving useful edits and reconciling scope before reassignment; unrelated work may continue only if still authorized. Specialist completion is never prototype acceptance.

Both loops end at the same accepted cg delivery handoff. Release specialist writes and pass accepted implementation, evidence and remaining obligations to the single sign-off procedure. The coordinator may retain context across that transition, but its responsibilities follow the current skill: sign-off owns deferred tests/docs and verification; produce owns implementation repairs. No role grants a gate bypass, owner approval, broader scope or merge/release authority.

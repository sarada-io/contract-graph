# Prototype review fixes

Date: 2026-09-12

I changed the runtime, agent procedures, and documentation. The changes remain uncommitted.

| What I fixed | How | Why |
|---|---|---|
| **Handoff accepted starter roadmaps** | Added validation for a top-level `Status: Active`, a populated phase table, a non-placeholder completion gate, and a populated deferred-tests/known-gaps section. [Code](../../src/scripts/prototype.js) | Changing one status word should not make an unfinished roadmap eligible for delivery. |
| **Prepare contradicted prototype admission** | Moved prototype admission into §1. A `Handed off` prototype with an Active roadmap and explicit acceptance can enter preparation directly. [Procedure](../../src/skills/cg-prepare/SKILL.md) | Prevent accepted prototypes from being unnecessarily sent back through `cg-plan`. |
| **Closed receipts selected prototype completion** | Excluded `Closed` records from the special sign-off admission branch. Removed the unreachable sign-off denial later in that function. [Code](../../src/scripts/next.js) | Historical prototype metadata should not override ordinary programme routing. |
| **Unrelated edits invalidated prototype review** | Review, approval, and handoff now fingerprint declared programme writes, including earlier and released writers’ declarations. Scope expansion or changed reviewed files invalidates acceptance. Older unscoped receipts retain whole-repository checks. [Code](../../src/scripts/prototype.js) | Allow unrelated work to continue without repeatedly invalidating the reviewed prototype. Final closure and delivery verification still fingerprint the whole repository. |
| **Graph verification happened too late** | Updated the prototype procedure to run `cg verify` in an iteration that changes contract YAML. Unchanged YAML does not trigger another check each feedback turn. [Procedure](../../src/skills/cg-prototype/SKILL.md) | Catch graph defects during the change that introduces them, while keeping application tests deferred. This is a procedural requirement, not a new automatic detector. |
| **Completion intent could be confused with UX acceptance** | Explicitly stated that “sign this off” does not supply missing whole-prototype acceptance. Also prohibited speculative completion requests at prototype start. [Procedure](../../src/skills/cg-sign-off/references/prototype-completion.md) | Preserve actual user acceptance and prevent unused Active requests from capturing later sign-off conversations. |
| **Feedback turns carried repeated setup work** | Separated session setup into a reference, limited concurrency instructions to relevant situations, and removed checkpoint requirements for ordinary adjustments. Made roadmap finalisation self-contained. [Prototype skill](../../src/skills/cg-prototype/SKILL.md) | Keep repeated work focused on changing the application, showing it, and recording a short note. |
| **Prototype invocation implicitly authorized policy amendments** | Required the agent to prepare and name preserved-policy amendments, then obtain explicit adoption approval unless already granted. [Setup reference](../../src/skills/cg-prototype/references/session-setup.md) | Asking to prototype a dashboard should not silently rewrite repository-owned workflow policy. |
| **Documentation obscured the two entry paths** | Added the prototype path and completion coordinator to the lifecycle diagram. Distinguished programme statuses from phase statuses throughout the relevant instructions. [Lifecycle](../lifecycle.md) | Make both valid delivery paths visible and prevent agents from putting `Active` in phase-status fields. |

I added six regression tests. **All 337 tests passed**, along with the build and build verification. The existing completion-request recovery behavior was preserved.

Two limits remain: roadmap validation checks structure, not whether the plan is sufficient; its exact six-column requirement is stricter than the review’s minimum suggestion. Also, no dashboard timing trial has established a speed improvement yet.

## Small follow-up pass

The subsequent review identified two remaining changes, now applied:

- **Corrected the plan skill's stale reference.** The shared element is the six-column phase table. Prototype §3 owns prototype roadmap finalisation, including the required `Deferred tests and known gaps` section; ordinary planning does not require that section.
- **Made undeclared dirty files visible at review.** The receipt and its review-history event now carry `reviewUnscopedDirty`, listing dirty source paths outside declared writes. It includes staged, unstaged, untracked, deleted, and renamed paths, with the same metadata exclusions as snapshots. The skill tells the agent to expand scope and refresh review for related changes or explain briefly in the existing roadmap why they are unrelated. This is informational evidence at review time, not an automatic approval blocker or proof of authorship.

The optional restriction of `entry: "prototype-completion"` to Active completion requests was left out. The dispatch hook currently uses that hint to select the programme before the request is recorded. Restricting it alone would break the initial sign-off → record request → prepare continuation. Existing request and handoff checks still govern continuation.

One additional regression test covers the review-time list, metadata exclusions, successful approval and handoff despite outside dirt, and retention of the observation after a later review. **All 338 tests passed**, along with the build and build verification. No new lifecycle states or stricter table requirements were added.

A further routing correction adds an explicit `Exploration needed` response to cg-plan §9, with `$cg-prototype` and the known scope under `Next input`. The intro directs exploratory requests to that response, and the roadmap checklist does not force speculative phases first. `User action` always asks the human to invoke `/cg-prototype`. Auto-run's shared protocol and Manager report preserve that handoff without dispatching the token, substituting `None — auto-run continues`, or inventing UX acceptance.

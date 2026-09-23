---
name: cg-produce
description: Implement an agreed sprint with internal preparation, dependency-aware automatic continuation, batch or per-item review, and resumable progress. Also prepares and implements in-scope repairs returned by sign-off. Reports each item's code, tests and documentation separately; finishing remains with cg-sign-off.
---

# CG Produce

Read the selected master plan, root contract, `.agents/cg/profile.json`, `.agents/cg/workflow.md` and the principle families selected for `produce` in `.agents/cg/phases.json`. Run `cg intent verify` and `cg status --programme <slug>`. A and applicable P bind; E is advisory. Resolve the actual requested sprint and execution scope before writing. Use cg-plan when outcomes or material scope remain unsettled; do not substitute technical readiness for owner agreement.

## Ask how the owner wants to review

Before starting a run, recover the owner's actual scope and review preference from the conversation and master roadmap. Ask only for missing choices. Use the host's available structured question tool with selectable options when permitted in the current mode; follow its tool restrictions rather than assuming a named tool is available. Prefer asynchronous questions so independent inspection and preparation can continue. If no permitted structured tool is available, present the same numbered options in chat and explain that the host requires a reply to resume.

For missing review cadence, ask **“How should I review the selected work?”** with **“All remaining items together”** and **“After each item”**, explaining that the former implements eligible work before combined review and the latter pauses after each developed item. Recommend combined review for an unattended implementation request unless the scope's risk calls for incremental review. Retain free-text input. All remaining means the authorised run scope, not an automatic expansion to the entire epic.

If scope is also genuinely ambiguous, ask it in the same interaction as a separate selectable question, using the actual sprint/epic labels from the plan. Do not combine scope and cadence into one free-text question or ask for them over successive turns when both are already known to be missing. An explicit request such as “deliver all S1–S4” settles scope; “implement all remaining items and review them together” settles batch review. Save the actual choice, scope and response under `## Production run` in the same master roadmap; recover it after interruption rather than ask again. No answer means the choice is pending, not permission to pick a mode. Independent inspection may continue while waiting; implementation requiring that choice waits.

A Proposed roadmap is a checkpoint to reconcile, not a reason to demand another invocation. If the actual request agrees the documented outcomes and authorises their implementation, record that authority and reconcile the roadmap to Active before rerunning readiness checks. If outcomes remain unsettled, ask only the unresolved question through cg-plan or cg-unblock. Never treat execution authority as acceptance of an unseen result. After answers arrive, persist them and continue eligible work under the original request without another “shall I start?” or skill invocation.

For **all remaining items**, explain: **“I’ll implement everything that can proceed, then present it together for review. I’ll skip steps that need your input, record what is needed, and continue with the next independent item.”** Mark input-dependent items Blocked in the master plan and retain their decision under the original item ID; record which dependent items are waiting. For a technical queue, set Blocked by and recalculate Step states before continuing. Dependent work waits too. Do not mark a skipped step complete or implement a guessed product choice. Present pending questions together at the end where possible; if an answer arrives meanwhile, record it before recalculating readiness and resuming eligible work.

For **review after each item**, develop one ready item, show its result and the report below, then wait for that item's review before developing the next. Feedback stays in this plan. Item acceptance does not certify combined sprint behavior or finish deferred tests/docs. If the chosen item is blocked, report the condition; do not silently switch review modes.

Review cadence is distinct from execution scope. A preview request stops at review. A request to complete the sprint also authorises in-scope finishing and repairs after required acceptance. Neither mode approves unseen work or authorises merging, publishing or the next sprint.

## Execute and recover

For sprint implementation, read [sprint production](references/sprint-production.md). Route through responsible contracts before bounded source reading. Inspect the planning baseline and next change, prepare incrementally and coordinate execution. For useful, permitted delegation, read [coordinator and specialists](references/coordination.md); otherwise implement directly. Keep one coordinator responsible for review, integration and recovery, with bounded specialists retained through immediate repairs and released after verified handoff. Technical queues remain sequential; delegation does not waive Step readiness or review cadence. No separate auto-run mode or mandatory team is required. Honour explicit delegation/model constraints; never invent settings or measured efficiency gains.

Use the same checkout and preserve unrelated changes. Measure progress from disk, the plan and applicable receipts, not stale chat summaries. Before a handoff checkpoint the selected sprint, review choice, current item, pending decision IDs and next action in the master plan. The plan owns item outcomes; internal queues own technical Step state; receipts own working-result acceptance and scoped completion authority. Link evidence instead of maintaining a duplicate ledger. Recover recorded answers before re-asking; apply each decision only within its recorded scope.

Select dependency-ready work in agreed priority order. After each change, answer or blocker, recompute readiness. Keep unfinished code/tests/docs distinguishable. Batch mode continues independent ready work until none remains or the batch is implemented. A genuine external prerequisite, missing owner decision, required acceptance or cancellation pauses affected work; a repairable defect normally triggers repair. Never assume an unanswered question is resolved by a passing test.

For technical queues, sign-off repairs or a malformed queue, read [internal preparation](references/execution-preparation.md), then [queue execution](references/queue-execution.md). Repair scope/order/syntax internally under the same request; preserve IDs, completed evidence and required gates. A cg next permission with entry `execution-preparation` and `executionAllowed: false` admits preparation only, including a blocked or completed queue returned by sign-off. Preserve actual blockers and completed evidence, add the bounded corrective Step, then re-run cg next. Execute only a Ready or eligible In progress Step under existing authority. Admission to repair a queue does not allow executing a blocked Step. Do not create a new plan for an in-scope defect. Use [verification](references/verification.md) for evidence reuse and gate placement. Sign-off owns finishing tests/docs and final verification; produce handles any implementation repairs it returns.

Keep contracts truthful and binding detectors intact during implementation. Defer unstable application test backfilling and final docs when appropriate, recording each obligation in the plan. Run immediate checks needed to build, exercise and safely change the relevant boundary. Do not delete or weaken a valid test to hide an implementation defect.

## Report and next action

At every run-ending review, blocked stop or handoff, show the sprint and a concise table covering all items in the requested run scope, including skipped and not-started items. The Item cell includes stable ID, Feature/Task/Bug, summary, outcome status and an actual link to its master-plan entry.

| Item — type, summary, status and plan pointer | Code | Test | Docs |
|---|---|---|---|
| F1 — Feature: filtered export; Awaiting review; <plan link> | Yes | Partial | No |
| B1 — Bug: empty-state wording; Blocked; <plan link> | Blocked | Blocked | No |

Use exactly **Yes / No / Partial / Blocked** for the three work columns. Yes means applicable work is complete with evidence; Test Yes requires the applicable checks to have passed on the relevant state. No means no completed work; Partial means unfinished work exists; Blocked means a prerequisite prevents proceeding. A legitimate deferral is No or Partial, not automatically Blocked. Use No for a category requiring no work and identify that exception briefly. Code Yes does not mean owner acceptance or item completion. Report failing checks honestly and keep the affected obligation incomplete.

Keep narrative short: only material blockers, deferrals, exceptions or risks need notes. End with **Next recommended: `<action or None>` — `<specific scope and reason>`**. Select from actual remaining obligations:

- Remaining implementation or feedback: cg-produce for the affected items, including after an accepted per-item review when more implementation remains.
- Required human review: request that review; do not dispatch its dependent work. Name a following skill only when a concrete obligation remains after acceptance.
- Accepted work with required tests, docs or combined verification outstanding: cg-sign-off for those obligations.
- An unresolved consequential decision with no independent work left: cg-unblock; a material outcome/scope revision: cg-plan.
- The requested work and its required acceptance and verification are complete: **None — requested work complete**. Do not recommend sign-off merely to name a skill or repeat valid evidence.

Under an existing completion request, continue to the next authorised action after acceptance instead of asking the owner to invoke another skill. An implementation-only request stops at its requested boundary. Report any wider sprint obligations accurately without inventing another stage for the completed request. Code/Test/Docs Yes alone never waives required human acceptance or combined verification. Never call the sprint complete while a required item or finishing obligation remains.

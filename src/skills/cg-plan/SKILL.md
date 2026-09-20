---
name: cg-plan
description: Agree a goal and observable outcomes in one Sprint or Epic Plan with a short human summary and complete agent detail. Group mixed features, bugs and tasks by dependencies, contract impact, risk and review burden. New sprint plans hand execution to cg-produce with internal preparation and finishing through cg-sign-off.
---

# CG Plan

Agree what success means before implementation. Run `cg intent verify`; if intent is incomplete or stale, use cg-warmup to draft and confirm it while continuing independent discovery. Planning may explore an unanswered question but must not label its dependent outcome agreed. Read the root contract, `.agents/cg/workflow.md`, profile and the families selected for `plan` in `.agents/cg/phases.json`. Route with `cg contract route --task "<outcome>"` before bounded source reading. A and applicable P are binding; E remains advisory.

New delivery uses the sprint loop. Version 0.7.0 retires the former standalone preparation and auto-run stages; do not route an unmarked old programme through a hidden legacy workflow. Reconcile the requested outcome into this master-plan format before new execution. No branch, commit, issue or implementation is created merely by agreement on a plan.

## Vocabulary and relationships

- **Goal:** the useful result the owner wants, such as reliable data export. It is not a list of files or tickets.
- **Objective:** an observable aspect of that goal, such as a clear empty-state message.
- **Sprint:** one bounded, reviewable increment toward a goal. It can contain several features, bugs and tasks. A calendar timebox is optional; its expiry never means completion.
- **Epic:** a larger goal requiring several dependent sprints, held in this same master plan.
- **Feature:** a new or improved capability; **Bug:** behavior that violates an accepted promise; **Task:** necessary supporting work such as a migration, test, documentation or investigation.
- **Acceptance criteria:** concrete behavior and relevant UX conditions the result must satisfy. For non-UI work use outputs, error behavior, compatibility and performance limits where required.
- **Done:** accepted outcome plus completed deferred obligations, passing required checks and truthful contracts. A working preview is not Done.
- **Dependency:** a result or decision needed before another item can proceed. An unresolved dependency blocks its consumers, not independent items.

Assign stable sprint IDs/names and stable item IDs with an explicit Feature/Bug/Task type. The human map and agent details refer to the same IDs. An internal implementation Step is a technical action, not another product ticket or a new sprint.

## Establish and agree the outcome

Read project intent and its binding sources, relevant contracts, existing decisions, specifications and the measured baseline. Separate existing failures from requested changes. State goal, objectives, included outcomes, exclusions, UX/review conditions and final completion evidence. Where current code violates accepted intent, record a discrepancy; do not redefine the intent or weaken a test to match the code.

Ask only for unresolved product choices. Reuse explicit instructions and prior agreement. Record the owner's actual answer and its scope under Agreement; do not manufacture approval from silence, plan existence or a green test. Plan agreement, execution authority and acceptance of the implemented experience are separate facts. A request to complete a sprint/epic supplies execution and finishing authority for that scope, but does not pre-approve unseen UX or authorize publication.

## Recommend one sprint or several

Explain the recommendation using cohesion of the goal, affected responsibilities/contracts, dependency order, migrations/compatibility, uncertainty, reversibility, external prerequisites and human review burden. Count probable contract changes as an impact signal, not a threshold. Mixed work belongs together when it produces one coherent increment. Do not group by ticket type or split a feature, its bug fixes and required tests into unrelated sprints.

Keep atomic changes together. Split only at a useful intermediate outcome with a truthful acceptance gate. A risky migration touching one contract can need staged compatibility; eight small corrections across six stable boundaries can fit one review batch. An uncertain UX can start with a discovery increment whose outcome is validated direction, without claiming a shipped capability.

Recommend batch or incremental review based on risk and owner preference. Reassess affected scope when evidence changes; routine technical refinement or an in-scope defect does not need another master plan.

Name the components, libraries, sub-modules, or modules a phase introduces. Apply `.agents/cg/principles/architecture.yaml` `graph`: stay, add-child, elsewhere. Each new self-sufficient unit owes its own contract and reciprocal graph edges when implemented; a folder alone is not a new responsibility. Preserve that obligation in the item's preparation.

## Establish technical readiness

Before handing the selected batch to production, inspect enough bounded source and tests to establish current behavior, known failures, responsible contracts and consumers, probable change surface and implementation approach, prerequisites, risk/reversibility, immediate checks, deferred finishing obligations and review conditions. State evidence separately from assumptions. Count contract impact as a signal, not a fixed sprint-size threshold.

An item is ready when produce can take a bounded next action without inventing a product decision or bypassing a prerequisite. Resolve material product/UX choices with the owner; investigate unknown feasibility or ownership before dependent implementation. Independent ready items can proceed while another waits. Later technical details may remain open if produce can settle them safely within the agreed outcome. Do not generate a speculative file-by-file queue for the entire epic. Record this analysis under the existing item IDs, so production refines it rather than repeats a separate preparation phase.

Plan review cadence as a recommendation, then record the owner's explicit batch/per-item choice when supplied. Produce must obtain that choice before starting the run if still missing. Technical discovery is the agent's responsibility; the human summary highlights meaningful decisions and outcomes without requiring approval of every internal Step.

## One master document, two reading layers

Write `<docs>/plans/<programme>/roadmap.md`, resolving docs from the profile. Write prose paragraphs on one source line. Keep evidence and technical detail beneath the summary; do not shorten away context when improving readability. Use this format:

```markdown
# <Sprint or Epic name>
Status: Proposed
Delivery: sprint

## Executive Summary
### 1. Problem/Opportunity
<one or two plain-language paragraphs>
### 2. Solution Overview
<one or two paragraphs including how the result will be achieved>
### 3. Plan Overview
<organisation and short sprint bullets: outcome and how>

## Details (Agent Version)
### Goal and objectives
<observable result, exclusions, UX and non-UI expectations>
### Agreement
<actual owner response and scope; execution request separately, or explicitly pending>
### Measured baseline
<facts, failures, affected contracts and uncertainties>

## Phase map
| Phase | Observable outcome | Prerequisites | Scope | Acceptance gate | Status |
|---|---|---|---|---|---|
| S1 — <sprint name> | <result> | None | <contracts> | <objective evidence> | Current |

## Items
| ID | Sprint | Type | Intended outcome and acceptance criteria | Depends on | Stage | State |
|---|---|---|---|---|---|---|
| F1 | S1 | Feature | <behavior and UX> | None | Implementation | Planned |
| T1 | S1 | Task | <necessary regression evidence> | F1 | Finishing | Planned |

## Item details
### F1
<readiness evidence, baseline, likely approach, scope/contracts/consumers, prerequisites, risk, immediate checks, deferred work and remaining uncertainties>

## Production run
<execution scope/request, explicit batch or per-item review choice or Pending, current item, pending decision IDs and next action; link receipts/queues rather than duplicate their state>

## Assumptions and decisions
<bounded assumptions and links to canonical DU entries>

## Deferred tests and known gaps
<each necessary obligation once, referencing its item ID, reason and finishing owner; or None with rationale>

## Dependencies and risks
<external prerequisites and what can proceed independently>

## Programme completion gate
<commands and objective evidence covering the entire agreed result>
```

`Phase map` is the existing machine-compatible table; in sprint mode each row represents a sprint. Row states remain `Current`, `Blocked`, `Complete`, `Future`. Programme Status is `Proposed`, `Active`, `Complete`. Keep only one Current row. Set Active once the plan is agreed; record missing execution authority explicitly. Stable item IDs own acceptance obligations in the roadmap. Prepared Step records later own technical execution status; link them instead of copying their state. Item states describe outcome progress: Planned, Implementing, Awaiting review, Accepted, Complete or Blocked. Accepted still has finishing work outstanding.

## Example: reliable export

Goal: an operator can export the filtered result and understand empty and failed outcomes. S1 includes F1 filtered CSV export, B1 incorrect empty-result message and T1 regression coverage/documentation. F1 and B1 can be implemented together for one review; T1 finishes against accepted behavior. Acceptance includes correct rows/columns, understandable empty/error states and an agreed download interaction. A separate S2 is justified only if a scheduled background export introduces independent infrastructure and review needs. Do not create sprints called Features, Bugs and Tests.

If the preview has the wrong columns, repair F1 under this plan. If a test expects an accepted column that the code omits, fix the code; change the test only with evidence that its expectation was wrong or the requirement was explicitly amended. A new request for a different permissions model needs a scoped decision and impact assessment.

## Handoff and continuation

Supply cg-produce the agreed roadmap, selected sprint, item IDs, contracts, baseline, review cadence and execution scope. Produce prepares small changes internally and brings the result to review; sign-off completes deferred work on that implementation. Use cg-prototype only when the desired experience itself needs open exploration, preserving the same known scope.

When the user has already requested execution or full sprint/epic completion, continue under that request without asking for another stage invocation. Otherwise return the agreed plan for execution. A new objective requires affected agreement; routine repairs do not. Use cg-unblock for consequential missing decisions and continue independent work.

End with one Next action block naming `$cg-produce`, `$cg-prototype`, `$cg-unblock`, or None and the exact scope. Include `Blocked by` only when a prerequisite prevents that next action. Plan approval alone does not authorize implementation.

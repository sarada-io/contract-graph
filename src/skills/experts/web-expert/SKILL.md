---
name: web-expert
description: Use for a bounded web UI implementation or review assignment involving components, browser interaction, state and responsive behavior. Does not decide product scope or final UX acceptance.
---

# Web Expert

## 1. Establish the assignment

Read the request or brief, relevant project constraints in `.agents/cg/experts.md` if present, then the owning contracts before implementation. Identify: requested result, review/design versus implementation, allowed changes, active stage and required evidence. Recover known answers from context before asking.

Before proposing or editing paths, run `cg contract route --task "<assignment outcome>"` and follow the matched contracts to the smallest responsible boundary. Read `.agents/cg/principles/architecture.yaml` and apply `hierarchy.kinds` and the `graph` walk: **stay** within that responsibility, **add-child** only for a distinct self-sufficient responsibility required by the graph, or **elsewhere** when another boundary owns the work. Do not create an API, web, mobile or UI technical-layer module merely to house this assignment; expertise does not define ownership. If placement exceeds the assigned scope, return the boundary decision before dependent edits.

For coordinator work, follow `.agents/skills/cg-produce/references/specialist-assignment.md`, including checkout and write declarations. For direct work, follow the user’s scope and repository policy; this skill does not start a lifecycle. Review-only means no edits. If authority or a necessary product choice is missing, inspect safely and ask the coordinator, or the user for direct work, before dependent edits.

## 2. Inspect, change and check the web interaction

1. Locate the affected component, its data source and existing design-system examples. Trace where displayed values and user actions go. Reuse the framework, components and state conventions; do not move server policy into the UI to make one screen work.
2. Identify the states touched by the change: normal content, loading, empty results, failure and retry, or disabled controls. Implement the relevant agreed states. If a missing state requires a product decision, pause that part and return the specific question rather than inventing behavior.
3. Check semantic controls, accessible names, keyboard operation and focus after actions. Check the affected layout at relevant sizes. A visual change must not hide functionality at a supported size. Preserve the project’s accessibility and motion requirements; do not claim a full accessibility audit from one check.
4. Inspect the running interaction in available target browsers when permitted, then apply section 3 for tests. If preview access is unavailable, report that limit. Measure rendering/loading or asset costs when changed or required; add optimization only when evidence justifies it. PWA features, editor integration and deployment pipelines are not automatic parts of a UI change.

Example: for a filter change, inspect matching results, no matches, clearing the filter and keyboard use. In prototype, review those manually; do not introduce a browser regression suite merely because this checklist names them.

## 3. Verify according to the active stage

- **Review/design only:** inspect and return findings with evidence pointers; do not implement without authority.
- **Prototype:** build/serve and inspect the preview where possible. Run `cg verify` when contract YAML changes. Defer application tests and automated browser regression suites.
- **Produce/authorized implementation:** run applicable assignment, contract and repository checks. Add focused coverage when needed, not a test per file. Maintain truthful contracts and required detectors with the change.
- **Stage unspecified:** recover the actual request and repository policy. Ask only if the ambiguity changes allowed work; never guess a prototype exemption.

Investigate failed checks. Fix in-scope defects and recheck affected behavior. Do not weaken a valid test; changing its expectation needs evidence of an incorrect test or an authorized requirement change. Unavailable and deferred checks are not passes.

## 4. Return a short handoff

- **Result:** Done, Partial or Blocked for this assignment. Done requires its requested work and required checks; it is not owner acceptance or programme completion.
- **Changes/findings:** paths and material contract/consumer effects, distinguishing pre-existing work.
- **Evidence:** actual commands/observations and results. Label failed, deferred and not-run checks; explain when no execution check was needed.
- **Remaining:** unfinished work, accepted deferrals, exact blocker and next action, or None.

Pause only affected work for missing decisions, prerequisites, ownership conflicts or scope expansion; continue independent authorized work. The coordinator owns shared status, acceptance and lifecycle transitions. This skill grants no agent-creation, publishing, deployment or wider-scope authority. Domain advice creates no new A/P binding.

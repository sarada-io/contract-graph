---
name: api-expert
description: Use for a bounded API design, implementation or review assignment covering request/response contracts, validation, errors and compatibility. Does not own programme acceptance or deployment.
---

# API Expert

## 1. Establish the assignment

Read the request or brief, relevant project constraints in `.agents/cg/experts.md` if present, then the owning contracts before implementation. Identify: requested result, review/design versus implementation, allowed changes, active stage and required evidence. Recover known answers from context before asking.

Before proposing or editing paths, run `cg contract route --task "<assignment outcome>"` and follow the matched contracts to the smallest responsible boundary. Read `.agents/cg/principles/architecture.yaml` and apply `hierarchy.kinds` and the `graph` walk: **stay** within that responsibility, **add-child** only for a distinct self-sufficient responsibility required by the graph, or **elsewhere** when another boundary owns the work. Do not create an API, web, mobile or UI technical-layer module merely to house this assignment; expertise does not define ownership. If placement exceeds the assigned scope, return the boundary decision before dependent edits.

For coordinator work, follow `.agents/skills/cg-produce/references/specialist-assignment.md`, including checkout and write declarations. For direct work, follow the user’s scope and repository policy; this skill does not start a lifecycle. Review-only means no edits. If authority or a necessary product choice is missing, inspect safely and ask the coordinator, or the user for direct work, before dependent edits.

## 2. Inspect, change and check the interface

1. Read the affected operation, its existing interface specification if any, and a relevant caller. Note its input, output, error behavior, authorization and side effects. Use these facts as the baseline; do not introduce a new protocol or gateway for a local fix.
2. Compare the requested result with that baseline. List affected callers. If a field type, required input, default, enum or error meaning changes, check whether existing clients still work. Even adding a field may break a strict client. An unauthorized break pauses the affected change; propose a compatible option or return the migration decision to the coordinator.
3. Implement only the agreed change. Reuse naming and error conventions. For writes that callers may retry, inspect duplicate-effect handling; for lists, inspect existing pagination; for restricted operations, inspect authorization. Improve those mechanisms only when required by this assignment. Do not expose secrets in diagnostic errors.
4. Account for affected client code, specs and usage documentation. Update what this stage owns and record legitimate deferrals. Select relevant evidence for successful input, invalid input and failure behavior; include retry or permission cases when those behaviors changed. Follow section 3 for whether to execute application tests now.

Example: renaming a response field is not a harmless cleanup if an existing caller reads its old name. Preserve compatibility or obtain the missing change authority before altering it.

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

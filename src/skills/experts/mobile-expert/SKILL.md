---
name: mobile-expert
description: Use for a bounded mobile application implementation or review assignment involving platform interaction, navigation, lifecycle and device constraints. Does not own store release or product decisions.
---

# Mobile Expert

## 1. Establish the assignment

Read the request or brief, relevant project constraints in `.agents/cg/experts.md` if present, then the owning contracts before implementation. Identify: requested result, review/design versus implementation, allowed changes, active stage and required evidence. Recover known answers from context before asking.

Before proposing or editing paths, run `cg contract route --task "<assignment outcome>"` and follow the matched contracts to the smallest responsible boundary. Read `.agents/cg/principles/architecture.yaml` and apply `hierarchy.kinds` and the `graph` walk: **stay** within that responsibility, **add-child** only for a distinct self-sufficient responsibility required by the graph, or **elsewhere** when another boundary owns the work. Do not create an API, web, mobile or UI technical-layer module merely to house this assignment; expertise does not define ownership. If placement exceeds the assigned scope, return the boundary decision before dependent edits.

For coordinator work, follow `.agents/skills/cg-produce/references/specialist-assignment.md`, including checkout and write declarations. For direct work, follow the user’s scope and repository policy; this skill does not start a lifecycle. Review-only means no edits. If authority or a necessary product choice is missing, inspect safely and ask the coordinator, or the user for direct work, before dependent edits.

## 2. Inspect, change and check the mobile flow

1. Identify the selected stack, supported platforms and affected screen or device feature. Read its navigation, state and platform boundary. Reuse them; this skill does not choose a framework or require a new native/shared-code architecture.
2. Trace the user's action through the affected states. For network work, inspect loading, failure and retry. For work that can be interrupted, inspect background/foreground and return navigation. For device capabilities, inspect permission granted, denied and unavailable. Evaluate only relevant cases; do not add offline synchronization or permissions to unrelated work.
3. Implement the smallest authorized change using the project's components and storage policies. Keep touch, keyboard, focus and accessible labels usable. If supported platforms need different behavior, preserve their conventions and report the difference rather than silently dropping a platform.
4. Exercise the assigned behavior on available targets according to section 3. Record OS and device/emulator conditions. If hardware is unavailable, use available checks and label device behavior unverified; do not invent results. Investigate startup, memory, battery or rendering cost only when affected or required, using measurements and project budgets rather than arbitrary targets.

Example: if only an emulator was available, report emulator evidence and the missing physical-device check. Do not describe the feature as verified on a physical device. App-store delivery is outside the assignment unless explicitly included.

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

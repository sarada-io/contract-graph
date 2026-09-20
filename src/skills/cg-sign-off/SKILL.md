---
name: cg-sign-off
description: Finish and verify an accepted delivery handoff within the requested scope. Complete deferred tests and documentation, route implementation repairs to cg-produce, preserve acceptance and completion authority, and close with evidence. The same procedure serves planned production and exploratory work.
---

# CG Sign Off

Use one completion procedure for every accepted delivery. The way the implementation was developed does not select a sign-off mode. Read [delivery completion](references/delivery-completion.md), the selected master plan, delivery record, root contract, `.agents/cg/profile.json`, `.agents/cg/workflow.md` and the families selected for sign-off in `.agents/cg/phases.json`. A and applicable P bind; E is advisory. Route through contracts before bounded source reading. Run `cg intent verify` and `cg status --programme <slug>`.

## Select the requested outcome

Apply the user's explicit scope first. Otherwise recover the applicable completion request through `cg status --json` and `cg next --for cg-sign-off --json`. Use the conversation and linked plan to resolve the intended outcome; never select another programme merely because its queue is ready or older. Ask one plain-language question only when the target or authority remains ambiguous. A narrower item, phase or sprint request cannot grant whole-programme authority.

A request to finish authorizes necessary in-scope finishing and repairs. An assessment-only request permits inspection and reporting, not edits, acceptance or closure. Reuse actual recorded authority without asking for another stage invocation. Do not create a completion request merely because a plan or delivery record exists.

## Require the shared handoff

Both development loops end at `cg delivery handoff`. Its accepted scope, review snapshot, actual implementation, linked roadmap criteria and remaining obligations are the input to sign-off. A Handed off record is accepted for finishing; it is not proof of production readiness.

Before that handoff, the originating loop still owns development and review. An early sign-off request may be recorded with `cg delivery request-sign-off` for recovery, but cannot supply missing acceptance. Inspect independently and report the remaining prerequisite or return to the loop owner reported by cg next. Do not start a second completion sub-flow, fake historical Steps, rebuild accepted code or rewrite approval fingerprints. Suspended or abandoned work requires an actual request to resume.

Once the handoff is ready, follow the common completion procedure. Implementation repairs go to cg-produce within the same scope. Only affected acceptance is renewed when the accepted experience changes. A repairable failure does not cancel completion authority.

Before final closure, inspect affected contract units against the resulting source under [fresh implementation evidence](references/closure-checks.md#61-refresh-implementation-evidence). Recheck after relevant finishing changes or returned repairs; source inspection complements the required behavioral and graph checks.

## Report within scope

Report the selected outcome, finishing work, verification and genuine remaining obligations concisely. Continue authorized repairs automatically. At terminal completion say **Next recommended: None — requested delivery complete**; do not invent another stage. A request solely for a durable document uses shared closure checks §8 and §11, without closing a delivery or changing contracts. This is a scope restriction, not a separate sign-off workflow.

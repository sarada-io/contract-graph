# Complete the selected delivery

This procedure consumes the same accepted handoff regardless of the development workflow. Scope and remaining obligations determine the work. Do not branch on a roadmap's delivery marker, historical origin or whether the result was called a prototype, sprint or phase.

## Recover and admit

1. Resolve the selected outcome and actual request from the conversation, master roadmap and `cg status --programme <slug>`. Verify intent and installed build identity. Use the intended checkout and preserve unrelated changes.
2. Read `cg delivery status --programme <slug> --json`. The record owns acceptance, completion authority, history and source evidence; the roadmap owns outcome criteria and deferred obligations; technical queues own Step state. Link these facts rather than creating another ledger.
3. Record an actual completion request, if not already active, with `cg delivery request-sign-off --programme <slug> --session <actual-session-id> --evidence <request.json>`. The JSON contains the owner's actual `by`, `response` and `scope`. An early request can be saved before acceptance for recovery, but finishing waits for Handed off. Assessment-only creates no execution authority.
4. Require the accepted handoff: selected scope and criteria, current implementation and review evidence, explicit remaining tests/docs/implementation gaps, and the required final gate. Missing acceptance stays with the originating development/review loop. A handoff may honestly include mocks, failures and incomplete behavior as finishing obligations; do not call that baseline green.
5. For an already Closed record, inspect scope and subsequent changes. Reuse valid evidence. Check for unfinished transient-file cleanup under the shared closure checks. If nothing remains, report completion with no next skill. Do not reopen settled acceptance or run another stage merely to relabel completed work.

On a hook-equipped host, enter cg-sign-off for the selected programme and use a stable session ID and `CG_PROGRAMME`. An active completion request permits scoped continuation; it does not waive Step readiness, acceptance, suspension or programme selection. Do not use a blanket gate bypass. Recovery reads pending questions and actual recorded answers before asking again. Pausing or resuming preserves previous evidence in history; restore a still-applicable request from its actual words and scope, never an inferred grant.

## Finish and repair

1. Compare the accepted criteria and promised behavior with the actual implementation. Account for incomplete behavior, mocks, shortcuts, error cases, contract drift, tests, documentation and integration gaps. Preserve accepted requirements when implementation disagrees.
2. Keep the smallest useful finishing list in the existing plan, linking any technical queue. Sign-off completes deferred tests, useful documentation, integration verification and close records. Do not require a test per file, a new plan or an empty documentation task. Keep all existing Step gates and contract co-delivery obligations.
3. Send implementation, contract and detector repairs to cg-produce, including their internal preparation. A completed or blocked queue may admit preparation only; produce must establish an eligible corrective Step before executing. Keep dependent evidence waiting and preserve genuine owner/external blockers. Return repair evidence to this same completion request.
4. Preserve valid test expectations. A failing test calls for investigation and implementation repair unless evidence establishes an incorrect expectation or an authorized requirement change. Reuse verification only while its inputs and scope remain applicable.
5. If a repair materially changes the accepted experience, obtain affected review before closure. Use the same record's resume/review/approve/handoff operations, retaining previous acceptance and restoring the still-applicable completion request from history. Internal repairs do not reopen unrelated choices. Never infer acceptance from a green check or a completion request.
6. Apply [shared closure checks](closure-checks.md) to the selected scope. Apply Step-history and queue requirements where a technical queue exists; do not fabricate queues or historical handoffs for exploratory implementation. A failed check keeps work incomplete and returns to this repair loop. New paths or ordering require internal preparation, not routine replanning or another permission request.

Continue independent authorized work while a decision or external prerequisite blocks another obligation. Respect explicit pause/cancellation and repository-owned policy. Unknown product meaning or material scope expansion goes to cg-unblock or cg-plan; ordinary in-scope defects remain in this loop. Finish sequentially and coordinate any other actual writer through existing session declarations; no new task or Manager role is required.

## Close the requested scope

Before declaring completion, ensure every included outcome is accepted, deferred obligations are finished, applicable gates pass on the resulting state, contracts and useful docs match reality, and no scope-blocking decision remains. Passing a command alone cannot establish these facts.

Record verification once in the existing acceptance record. Close completed technical phase records and remove obsolete transient files through shared closure checks; preserve inputs still required for the final delivery close. Completing one item, phase or sprint does not close a wider programme: retain its remaining-work note and delivery record. Only continue another defined, ready increment when the existing request covers it. Return that increment to its development/review loop for its own acceptance; never reuse the prior increment's approval.

Only when every programme obligation is complete, release session writes, arrange stable source inputs and run:

```bash
cg delivery close --programme <slug> --session <id> --evidence <sign-off.md> --gate "<repository delivery gate>"
```

The command executes the supplied gate and records its result against stable source. Use that execution as the final evidence rather than running the same gate twice. A failed gate or changed source returns to repair and verification. Mark the programme Complete only after closure succeeds. After closure succeeds, remove the completed programme’s remaining temporary plan, process, progress and sign-off input files under the shared closure checks. Verify durable docs, approved intent and YAML remain current and their live links resolve. A Closed receipt alone does not mean cleanup is finished. Keep the delivery JSON tracked after plan cleanup; it already contains the final sign-off text, acceptance and verification evidence. Records attribute authority and preserve evidence; they do not authenticate the owner or replace required CI and adopted branch protection. Closure grants no merge, publication or chat-archival authority.

Report the result, relevant verification and remaining limitations. During repairs state that completion continues under the existing request. At a real blocker identify its affected scope and required input. When requested completion is achieved, name no next skill.

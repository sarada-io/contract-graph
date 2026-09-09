# Complete a selected prototype

Use this entry when the user asks cg-sign-off to finish a prototype. Coordinate its remaining
delivery through the existing skills, then apply ordinary sign-off to each phase. Admission here
is not an early declaration that the prototype is production-ready.

## Select, recover, and establish authority

Read the root contract, workflow, selected prototype record, roadmap, feedback, queues, and session
checkpoints. Route through contracts before inspecting code. Select the programme from the user's
request or unambiguous current context; with multiple candidates, obtain the selection rather than
choosing by recency. Use `cg next --programme <slug>`. Its `--for cg-sign-off` permission admits
assessment, not phase closure or production writes.

A user request to finish the selected prototype authorizes its necessary preparation, sequential
production, repairs, documentation, and final checks. Record the exact words and scope. A narrower
request such as "review readiness only" or "close phase 1" does not grant whole-prototype delivery.
Preserve explicit exclusions and repository restrictions. An auto-run phase worker follows its
assigned phase authority and ordinary sign-off; it never promotes itself to this coordinator. A
new direct user request to finish the whole prototype can grant wider scope.

Manual UX acceptance is separate. Use existing attributed acceptance when it still covers the
implementation. If the current request approves the experience and asks for completion, record
the same actual answer for both purposes. Invoking sign-off alone does not invent UX acceptance.
Gather missing acceptance while independent readiness assessment continues. Suspended or abandoned
exploration requires an actual request to resume, not an automatic restart.

Follow cg-prototype §3 to record acceptance and finalise the existing roadmap. Preserve code and
history; use `review`, `approve`, and `handoff` as appropriate. Do not fake historical Steps for
prototype iterations. Changed review fingerprints require inspecting differences and affected
review as required; never rewrite the old approval fingerprint. Acceptance permits planning from
provisional code, not claiming a green baseline.

Once Handed off, save the request under the selected plan:

```json
{"by":"the requesting user","response":"their actual request","scope":"the named prototype and accepted outcome, including explicit exclusions"}
```

Run `cg prototype request-sign-off --programme <slug> --session <actual-session-id> --evidence <file>`.
This records completion intent, not approval or closure. Reuse an active request after a context
break; do not replace or expand it. Pause, resume, or abandonment cancels this active request while
preserving its history; re-establish authority from the actual conversation.

## Complete the remaining delivery

Keep a compact completion ledger in the same roadmap: request and acceptance evidence, actual
worktree, retained prototype changes, remaining obligations, current phase/queue, last handoff,
checks and stale evidence, pending decisions, and exact next action. Update it at stage handoffs
so a fresh session can continue. Apply the concurrent-work reference: declare the actual writer,
resolve overlaps, preserve other programmes, and arrange stable final inputs.

1. Reconcile feedback and promised outcomes with implementation. Account for unfinished behavior,
   mocks, shortcuts, error states, contract drift, documentation, tests, and integration gaps.
   Limit obligations to accepted scope and retained repository requirements.
2. Reuse existing delivery phases and queues. Finalise missing delivery planning using cg-plan's
   shared planning requirements, then use cg-prepare for the smallest necessary remaining phases.
   Never rebuild accepted code by default, invent a test per file, or add empty delivery phases.
3. Apply cg-produce to Ready Steps in order, including code, necessary tests, affected contracts
   and detectors. Unchanged contract facts need no artificial YAML edit. Preserve the accepted UX;
   obtain affected human review for consequential visible changes.
4. Apply ordinary cg-sign-off §§1–11 only after the exact selected phase admits closure. Run the
   repository's selected-phase guard when present. Write durable documentation, reconcile
   decisions and residue, repair findings through prepare/produce, and verify the final state.
   Reuse applicable evidence under the shared verification rules; avoid duplicate full gates.
5. Continue remaining phases only within the recorded scope. Keep failures incomplete and repair
   them. Stop dependent work for unanswered decisions, missing prerequisites, scope conflicts, or
   cancellation; continue independent authorized work.

This is a scoped exception to the stage-yield rule: prepare and produce return to this coordinator,
which follows the next authorized route. They retain normal responsibilities and readiness checks.
Run sequentially in this session; fresh agents are not required. If an existing authorized auto-run
owns delivery, coordinate its handoffs instead of starting another writer. Do not create a Manager
or another task merely to cross a stage boundary. On the optional host hook, use `CG_PROGRAMME`;
admit cg-sign-off in this session, record the request, and retain queue checks. Do not use a blanket
chain bypass. This coordinator also handles authorized corrective handoffs without a user re-invocation.

## Close with evidence

Close only after every remaining delivery phase and programme obligation is satisfied, required
documentation and contracts match the implementation, tests and the final gate pass, and affected
UX is accepted. Use `cg prototype close` with the real delivery command and sign-off document;
its execution provides the final gate receipt. The CLI cannot infer full requirements from a
successful command, so the coordinator must still check the recorded completion obligations.

For an already Closed prototype, inspect its receipt and subsequent changes before declaring
completion. Refresh changed integration evidence without discarding valid historical acceptance;
new UX exploration requires resume and review. Closing this prototype never closes another
prototype, authorizes merge/release, or ends or archives the user's chat.

Report completed work, verification, and unresolved obligations. During authorized continuation,
`User action` is `None — prototype completion continues`. At terminal completion use
`Next action — Prototype closed` and `Next input: None — selected prototype delivery is complete`.
Never report Closed while a required check, decision, or delivery obligation remains unresolved.

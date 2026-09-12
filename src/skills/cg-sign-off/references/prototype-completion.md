# Complete a selected prototype

Use this procedure after the entry point selects a prototype. Coordinate its remaining delivery
through the existing skills, then apply shared closure checks to each delivery phase. Keep this
procedure in control throughout; do not load the phase-sign-off procedure or adopt its yield rule.
Admission here is not an early declaration that the prototype is production-ready.

## Select, recover, and establish authority

Read the root contract, workflow, selected prototype record, roadmap, feedback, queues, and session
checkpoints. Route through contracts before inspecting code. Keep the programme selected by the
entry point; do not substitute an older prepared phase when this prototype has no queue.
If a previous attempt routed to another programme, recover the user's corrected prototype scope
in the existing roadmap. Preserve that other programme's work and ledger as separate history;
do not adopt its phase assignment, reclassify its queue, or fabricate a prior completion request.
Missing acceptance or completion evidence is an admission gap within this procedure, not a reason
to fall back to ordinary phase sign-off.
Start with `cg status --programme <slug>` to locate the current queue, blockers, completion
request, and residue owners. Use `cg next --programme <slug>`. Its `--for cg-sign-off` permission admits
assessment, not phase closure or production writes.

A user request to finish the selected prototype authorizes its necessary preparation, sequential
production, repairs, documentation, and final checks. Record the exact words and scope. A narrower
request such as "review readiness only" or "close phase 1" does not grant whole-prototype delivery.
Preserve explicit exclusions and repository restrictions. An auto-run phase worker follows its
assigned phase authority and ordinary sign-off; it never promotes itself to this coordinator. A
new direct user request to finish the whole prototype can grant wider scope.

For readiness assessment only, inspect and report the selected prototype's gaps and immediate
next route. Do not record a completion request, approve or hand off the prototype, start delivery,
or close it. Missing UX acceptance does not prevent independent assessment.

Manual UX acceptance is separate. Use existing attributed acceptance when it still covers the
implementation. If the current request approves the experience and asks for completion, record
the same actual answer for both purposes. Invoking sign-off alone does not invent UX acceptance.
Gather missing acceptance while independent readiness assessment continues. Suspended or abandoned
exploration requires an actual request to resume, not an automatic restart.

Follow [cg-prototype §3](../../cg-prototype/SKILL.md#3-record-acceptance-and-finalise-the-roadmap)
to record acceptance and finalise the existing roadmap. Preserve code and
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
checks and stale evidence, pending decisions, and exact next action. Record that prototype
completion owns continuation so a prepare/produce handoff cannot reset the session to ordinary
phase sign-off. Update it at stage handoffs so a fresh session can continue. Apply
[concurrent work](../../cg-prototype/references/concurrent-work.md): declare the actual writer,
resolve overlaps, preserve other programmes, and arrange stable final inputs.

1. Reconcile feedback and promised outcomes with implementation. Account for unfinished behavior,
   mocks, shortcuts, error states, contract drift, documentation, tests, and integration gaps.
   Limit obligations to accepted scope and retained repository requirements.
2. Reuse existing delivery phases and queues. Finalise missing delivery planning using cg-plan's
   shared planning requirements, then use cg-prepare for the smallest necessary remaining phases.
   Never rebuild accepted code by default, invent a test per file, or add empty delivery phases.
   Existing phases from other programmes become prerequisites only when their relevance to this
   prototype is established; their age or readiness alone is not a dependency or authority to run them.
3. Apply cg-produce to Ready Steps in order, including code, necessary tests, affected contracts
   and detectors. Unchanged contract facts need no artificial YAML edit. Preserve the accepted UX;
   obtain affected human review for consequential visible changes.
4. Apply [shared closure checks](closure-checks.md) §§1–11 to the selected delivery phase.
   An admission failure returns a finding to this coordinator. Use cg-prepare when paths or order
   need reconciliation, then cg-produce for Ready corrections, and re-admit the same phase.
   Do not ask the user to invoke those stages again. Close only after the exact phase admits
   closure and its required gates pass. Reuse applicable verification evidence.
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
documentation and contracts match the implementation, and affected UX is accepted. Record the
session's released checkpoint and arrange stable inputs before final close. Run:

```bash
cg prototype close --programme <slug> --session <id> --evidence <programme-sign-off.md> --gate "<repository delivery gate>"
```

This command executes the full gate and records a source-bound receipt. Use that execution as the
final inventory result rather than running the gate twice. It rejects failed gates or gates that
change source inputs; return those findings to this coordinator's repair loop. Keep the phase or
prototype incomplete while its required gate fails. Keep `.agents/cg/prototypes/<slug>.json`
tracked after plan cleanup. A PR still needs ordinary required CI and adopted branch protection.
The CLI cannot infer full requirements from a successful command, so also check the recorded
completion obligations. Visible changes need affected human acceptance before closure.

For an already Closed prototype, inspect its receipt and subsequent changes before declaring
completion. Refresh changed integration evidence without discarding valid historical acceptance;
new UX exploration requires resume and review. Closing this prototype never closes another
prototype, authorizes merge/release, or ends or archives the user's chat.

Report completed work, verification, and unresolved obligations. During authorized continuation,
`User action` is `None — prototype completion continues`. At terminal completion use
`Next action — Prototype closed` and `Next input: None — selected prototype delivery is complete`.
Never report Closed while a required check, decision, or delivery obligation remains unresolved.

# Prototype

Use `/cg-prototype` when you need to use an application to discover the desired result. It starts
with the relevant contracts, launches the application, and makes small changes that you review
manually. You do not need a complete implementation plan before the first preview.

```text
/cg-prototype

Improve the dashboard layout and interactions. Launch the application
and iterate with me until the experience is right.
```

Give feedback normally. Within the agreed scope, the agent continues in the same working context.
It defers application test authoring, test suites, and browser regression testing. It still runs
what is needed to present the preview, keeps contracts truthful, and preserves binding detectors.
If an iteration changes contract YAML, the agent runs `cg verify` in that iteration; unchanged
YAML does not trigger another graph check for each feedback turn. Graph verification does not
prove that the application behaves correctly.

## What remains on disk

The programme roadmap records your objective, scope, launch instructions, cumulative changes,
feedback, reviewed conditions, and known gaps. A separate durable record under
`.agents/cg/deliveries/` records lifecycle state and source snapshots. It survives plan cleanup;
it is evidence about delivery, not the authority for a contract rule. A later session can recover
the work without the previous conversation.

The snapshot includes tracked and non-ignored untracked files, file modes, and symlink targets.
Transient plan Markdown/JSON and delivery records are excluded so evidence can be recorded
without invalidating itself. Do not put implementation in those excluded locations. Ignored
assets, environment configuration outside Git, and external services require separate verification.
Review and approval fingerprint the programme’s declared writes, including earlier declarations
and released writers. Unrelated edits outside that scope do not invalidate review. Scope expansion
or changes within it require affected review. Declarations must include relevant shared inputs;
the CLI does not discover dependency closure. Older receipts without declarations keep their
whole-repository review behavior. Final close and delivery verification always fingerprint the
whole repository, so unrelated edits can still invalidate final integration evidence. Submodules
are not supported by the snapshot command.

At review, `reviewUnscopedDirty` lists dirty source paths outside the declared writes, using the
same metadata exclusions. The agent expands scope for related edits or records why they are
unrelated. This is an observation at review time; it does not infer who edited a file or block
approval because unrelated work is dirty.

## Receipt storage in 0.7.0

New receipts use storage version 2: repeated large JSON values are stored once in a local evidence
table and referenced by SHA-256. Readers reconstruct the complete logical record and check every
reference, object hash, and reconstructed-record checksum before recovery, routing, residue, or
delivery verification. Current snapshots,
all historical checkpoints, acceptance, completion requests, failures, and sign-off remain intact.
This reduces duplicate storage; it does not cap unique history or replace audit evidence with hashes.

Use `cg delivery status --programme <slug> --json` to inspect the reconstructed record. Routine delivery commands return current-state summaries; `--json` returns full reconstructed evidence
when inspection needs it. Existing v1
receipts remain readable and stay v1 when updated. To explicitly migrate a Closed receipt:

```sh
cg delivery compact --programme <slug>
```

Compaction runs under the programme lock, verifies complete logical JSON equality, and replaces the
canonical receipt atomically after checking its read-back and unchanged original. It appends no
lifecycle event and reports sizes and a logical evidence digest. Small receipts may grow due to the versioned envelope. The canonical path stays tracked;
external attachments remain untouched. Active receipts cannot be explicitly compacted. New v2
receipts and migrated receipts continue using v2 on later updates, including resumption.

Upgrade all writers and CI readers to 0.7.0 or newer before creating or migrating v2 receipts;
older tooling cannot read them. Hashes detect damaged evidence, not deliberate forgery by someone
able to rewrite the whole receipt. No history pruning or age-based deletion is supported.

## Working side by side

You can explore the next prototype while an accepted programme goes through delivery. Keep a
separate programme record and roadmap for each, and a session checkpoint for each writer:

```bash
cg delivery checkpoint --programme instruction-colour --session instructions-session --evidence docs/plans/instruction-colour/sessions/instructions-session.json
```

The evidence JSON supplies `state` (`active` or `released`), `writes` (repository-relative files or
directories), optional `resources` (shared build/preview names), and a short `note`. The command
records actual checkout/branch/commit, dirty paths, scoped file fingerprints, changes observed
since that session's last checkpoint, declared overlaps, and programmes without registrations.
Pass `--session` to other lifecycle commands as well. Old records remain readable; their missing
session identity stays unknown. Checkpoints do not infer authorship from a shared working tree.

These declarations help coordinate work; they are not file locks or dependency proofs. Discovery
covers this worktree's records, so agents also link related worktrees and repositories explicitly.
Each programme's record is protected against concurrent CLI updates. Other programmes can still
record checkpoints while a long closing check runs. A closing attempt is recorded before the gate
starts and retains its outcome, including failure or changed source. An interrupted process may
leave a Running attempt and lock; confirm the owner has stopped before removing that lock.
All writers need the updated CLI; older processes and direct file edits do not honor these locks.
Upgrade shared tooling between active checks and record which version provided final evidence.

For uninterrupted prototyping during a long final check, use separate worktrees with the required
implementation present. In a shared checkout, the final check needs an agreed stable interval.
Even disjoint edits affect the whole-source fingerprint and can share build outputs or previews.
Closing one programme never approves another: unfinished prototypes still block merging the
combined branch, and subsequent source edits require refreshing final integration evidence.

## Acceptance and delivery

When you approve the whole prototype, the agent records your actual response, its scope, and the
reviewed source snapshot. This is attributed evidence; it does not authenticate your identity or
machine-prove satisfaction. Changed reviewed inputs before handoff require affected review.

The agent then finalises the roadmap for the remaining work. Handoff requires the programme’s
`Status: Active` before any sections, at least one concrete phase in the standard Phase map table,
a non-placeholder Programme completion gate, and a populated Deferred tests and known gaps
section (or an explicit account of why none remain). Phase table statuses are `Current`, `Blocked`,
`Complete`, or `Future`. These checks reject starter placeholders; preparation still judges the
plan’s coverage and substance. Both development workflows converge at the same accepted delivery handoff. Sign-off uses the actual implementation, recorded acceptance, roadmap criteria and explicit remaining gaps. It completes tests/docs and verification, routing implementation repairs to cg-produce. No second planning invocation or reconstruction of exploratory edits as historical Steps is required.

To finish the selected prototype, use the existing sign-off skill:

```text
/cg-sign-off
I approve <programme-slug>'s prototype UX. Complete that prototype's remaining production work and sign it off.
```

This example explicitly grants both UX acceptance and completion. A bare “sign this off” during
iteration grants completion intent only; the agent still asks for acceptance of the whole
prototype and waits for the actual answer before admitting delivery. An Active completion
request cannot substitute for that answer.

The prototype loop records acceptance and the completion request separately, reconciles feedback and deferred work, finalises the same roadmap and runs `cg delivery handoff`. Until acceptance and handoff are ready, that loop still owns development and review. An early completion request can be saved for recovery without starting finishing.

Sign-off then uses one delivery-completion procedure shared with plan/produce. It selects the requested outcome and scope, not a workflow type. It completes remaining tests and useful docs, routes implementation and contract repairs to produce, and verifies the final result. Existing code and applicable evidence are reused. Ambiguous target selection requires one question; an older ready queue never overrides the requested programme. Assessment-only remains inspection and reporting.

A worker assigned one phase retains that scope; it cannot grant itself permission to finish an entire prototype. An explicit completion request carries necessary production, finishing and repairs within its recorded scope. The separate cg-prepare and cg-auto-run skills are retired in 0.7.0. Visible changes to the accepted experience
return for affected human acceptance; tests and internal repairs that preserve it do not require
repeating the entire prototype review. Closing a prototype does not merge code or close your chat.

The completion coordinator records the actual request with
`cg delivery request-sign-off --programme <slug> --session <id> --evidence <request.json>` at
admission, including while UX review is pending. Its JSON has `by`, `response`, and `scope`. This records intent, not acceptance or a successful
gate. Session history retains the request; suspension, resumption, or abandonment cancels its active
state. A successful `close` completes it. On hosts using the optional dispatch hook, a sign-off
entry plus an active request allows the scoped production and repair loop only after accepted handoff,
while keeping queue checks. The agent handles these commands and evidence records. It records a completion request only
when you actually ask to finish the prototype, never at prototype start or as a precaution.

To recover, the user can say "continue sign-off". The skill reads the recorded request; the CLI's
`signOffRecovery` status identifies resumable completion work, and `cg next --for cg-sign-off`
selects a single active request without requiring a programme flag. A current explicit target
overrides recovery. If several outcomes are plausible, the skill asks which outcome the user
wants; it does not require internal identifiers or select an unrelated ready phase.

| State | Meaning |
|---|---|
| Iterating | The agent is implementing feedback. |
| Awaiting review | A source snapshot is ready for your feedback. |
| Approved | The reviewed experience is accepted; delivery is unfinished. |
| Handed off | The accepted roadmap and implementation have entered normal delivery. |
| Suspended / Abandoned | Work is retained; neither state grants merge eligibility. |
| Closed | Final sign-off recorded a successful delivery command for the resulting source. |

You can keep a prototype indefinitely. Silence does not approve it, and abandonment does not
delete code. Resuming exploration clears previous acceptance and closure evidence. Discarding
prototype code or reverting it is an explicit repository action, not automatic cleanup.

## Merge protection

Draft PRs and prototype labels make unfinished work visible. They do not enforce completion.
Repositories can adopt a required delivery-readiness check alongside their normal CI and reviews:

```bash
cg delivery verify --base origin/main --gate "npm test && cg verify"
```

The target ref and exact gate command must come from trusted repository configuration. Use the
repository's actual required gate. Fetch the target and full history; the command rejects shallow
clones. Run a trusted installed version of the checker, not a checker changed by the PR being
evaluated. Configure this command as a required status check through the hosting provider and
protect the checking workflow and bypass policy. The CLI does not configure hosting permissions.

The check rejects unfinished records, changed source after closure, closure with a different gate,
and record removal visible in the PR's fetched history or target diff. It does not execute a gate
loaded from a PR. Final closure runs the explicitly supplied gate locally; normal required CI must
independently verify the code again in the integration environment.

This protects against accidental premature completion, stale receipts, and simple marker removal.
Repository-authored records are not cryptographic attestations: an actor able to forge records,
rewrite away all prototype history before it reaches the target, or bypass branch protection can
evade them. Do not use this check as an adversarial security boundary or a substitute for CI and
required review. Removing never-committed metadata leaves no Git evidence to detect.

## Existing installations

Prototype commands retain paths to evidence files inside their programme's plans directory as
explicit receipt references. Residue traversal follows those references, including JSON approval
and session files. An older receipt can register an existing consumer with
`cg delivery evidence --programme <slug> --evidence <owned-plan-file>`. Registration preserves
approval and completion state; it neither accepts a prototype nor proves an evidence claim.
Markdown consumer links remain available for ordinary phase evidence and files outside that scope.

Use `cg status --programme <slug>` to locate a stopped run's current Step, blocker, completion
request, and residue owners before resuming. This is a read-only view of current records, not an
additional recovery document to maintain.

Updated skills install through `cg init`; repository workflow, root catalog, and phase policy stay
preserved. Older maps and catalogs can omit the optional prototype entry without breaking ordinary
verification. If adoption needs preserved policy changes, the agent prepares and names the exact
workflow, phase-map and catalog amendments and asks once for explicit approval before applying
them. A request to prototype a dashboard alone does not authorize those amendments. Existing
approval for the same edits remains valid. Unrelated choices stay preserved, and a separately
retained restriction requires its own resolution.

If several programmes are active, select one with `cg next --programme <slug>`. The optional host
dispatch hook accepts `CG_PROGRAMME` from its environment for the same selection. It does not
choose an arbitrary programme or allow one queue's completed Step to satisfy another queue's
dependency.

## A coordinator during exploration

A prototype coordinator can retain the feedback conversation and accepted choices while specialists handle bounded experiments, components or investigations. It owns preview integration and review, stops affected work when feedback supersedes an assignment, and checks each handoff against the current direction. Small adjustments can remain direct; a team is optional.

Delegated work retains prototype timing: reach a preview early, build and serve it, keep contracts truthful, and defer application test automation. It does not create production Steps or authorize specialists to accept the experience. The coordinator presents a coherent integrated preview, then passes actual acceptance and remaining obligations through the same delivery handoff as produce. See the [shared coordination design](experts.md#coordinators-and-workers).

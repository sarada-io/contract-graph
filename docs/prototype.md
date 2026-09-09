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
Graph verification does not prove that the application behaves correctly.

## What remains on disk

The programme roadmap records your objective, scope, launch instructions, cumulative changes,
feedback, reviewed conditions, and known gaps. A separate durable record under
`.agents/cg/prototypes/` records lifecycle state and source snapshots. It survives plan cleanup;
it is evidence about delivery, not the authority for a contract rule. A later session can recover
the work without the previous conversation.

The snapshot includes tracked and non-ignored untracked files, file modes, and symlink targets.
Transient plan Markdown/JSON and prototype receipts are excluded so evidence can be recorded
without invalidating itself. Do not put implementation in those excluded locations. Ignored
assets, environment configuration outside Git, and external services require separate verification.
Snapshots are conservative across the repository: unrelated source changes can require refreshing
review evidence. Submodules are not supported by the snapshot command.

## Working side by side

You can explore the next prototype while an accepted programme goes through delivery. Keep a
separate programme record and roadmap for each, and a session checkpoint for each writer:

```bash
cg prototype checkpoint --programme instruction-colour --session instructions-session --evidence docs/plans/instruction-colour/sessions/instructions-session.json
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
machine-prove satisfaction. Changed source before handoff requires affected review.

The agent then finalises the roadmap for the remaining work. Preparation uses the prototype code
that already exists, including relevant uncommitted files. It assigns incomplete behavior,
integration gaps, and deferred tests to ordinary delivery Steps. It does not assume the prototype
is green or rebuild it by default.

To finish the selected prototype, use the existing sign-off skill:

```text
/cg-sign-off
I approve this prototype's UX. Complete its remaining production work and sign it off.
```

The prototype entry records UX acceptance and the completion request separately. It reconciles
feedback and deferred work, finalises the same roadmap, drives necessary preparation and production,
updates affected contracts and documentation, completes tests and repairs, and performs ordinary
phase sign-off. You do not need to invoke each intervening skill. Existing code and applicable
verification evidence are reused; the final required gate must pass before the prototype closes.
A request for readiness assessment alone does not start production.

Normal phase sign-off keeps its existing behaviour. A worker assigned one phase under auto-run
retains that scope; it cannot grant itself permission to finish an entire prototype. Existing
explicit auto-run continuation remains supported. Visible changes to the accepted experience
return for affected human acceptance; tests and internal repairs that preserve it do not require
repeating the entire prototype review. Closing a prototype does not merge code or close your chat.

The completion coordinator records the actual request with
`cg prototype request-sign-off --programme <slug> --session <id> --evidence <request.json>` after
accepted handoff. Its JSON has `by`, `response`, and `scope`. This records intent, not a successful
gate. Session history retains the request; suspension, resumption, or abandonment cancels its active
state. A successful `close` completes it. On hosts using the optional dispatch hook, a sign-off
entry plus an active request allows the scoped prepare/produce chain while keeping queue checks.

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

Updated skills install through `cg init`; repository workflow, root catalog, and phase policy stay
preserved. Older maps and catalogs can omit the optional prototype entry without breaking ordinary
verification. On explicit use, the prototype skill adopts only its scoped workflow exception and
catalog/phase entries, preserving unrelated repository choices. A separately retained restriction
requires a scoped resolution rather than a silent waiver.

If several programmes are active, select one with `cg next --programme <slug>`. The optional host
dispatch hook accepts `CG_PROGRAMME` from its environment for the same selection. It does not
choose an arbitrary programme or allow one queue's completed Step to satisfy another queue's
dependency.

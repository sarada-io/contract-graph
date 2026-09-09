# Concurrent prototype and delivery sessions

Keep one programme roadmap, prototype record, and programme-qualified delivery ledger per initiative.
Different sessions are different actors, even when they share a programme. Read existing records
before writing. Use the host's actual task ID when available, otherwise choose a distinct stable
session label and record it in the roadmap. Never attribute older work to a newly assigned actor.
Pass `--session <id>` to prototype lifecycle commands, including `close`.

Before the first write, after changing scope, and at each review or delivery handoff, write a
session-specific JSON file under `<docs>/plans/<programme>/sessions/<session-slug>.json`:

```json
{
  "state": "active",
  "writes": ["app/screens/instructions", "app/screens/instructions/.agents/cg/contract.yaml"],
  "resources": ["preview:8790", "build:shared-app"],
  "note": "Instruction palette iteration. Landing delivery is a separate programme."
}
```

Use the actual repository-relative file or directory paths, with no globs. Include contracts,
tests, shared configuration, and generated tracked inputs when they may be edited. Expand the
scope as it becomes known; this is a brief declaration, not advance enumeration of every file.
Resource names identify shared previews, output directories, caches, ports, and other mutable
state. Agree consistent names in the roadmaps: matching is literal, not inferred.

Run `cg prototype checkpoint --programme <programme> --session <id> --evidence <file>`.
The checkpoint records the worktree, branch, commit, whole-source snapshot, dirty-path inventory,
declared file fingerprints, observed changes since this session's previous checkpoint, and peer
declarations in this worktree. History retains each checkpoint. Changes observed in a shared
checkout are not proof of authorship. A changed scope can also change this inventory. Keep the
roadmap's short account of actual edits and feedback; do not claim pre-existing dirty files.

Inspect `peers` for overlapping writes and shared resources, and `unregisteredProgrammes` for older
records without session declarations. Unknown ownership is unresolved, not permission to edit.
Before using a different worktree, inventory the related programmes there as well; local checkpoint
discovery does not scan sibling worktrees or other repositories. Link their exact paths and
programme records in each roadmap, with dependencies and any transfer of accepted source.

Stop your own overlapping writes until ownership is resolved. Do not interrupt, suspend, or alter
another session's queue without authority. File declarations are advisory coordination evidence:
they do not enforce file ownership, prove dependency independence, or protect unregistered tools.
Disjoint file edits can still interfere through a shared build, preview, or dependency.

For long final checks, use an isolated worktree containing the exact accepted implementation when
repository authority permits it. Record where that source came from and remeasure its baseline;
a clean checkout of an older commit is insufficient. If working in the same checkout, agree a
stable interval for the final gate and avoid shared build/preview writes. Continue independent
feedback or planning elsewhere. Never narrow the final fingerprint to make a concurrent edit pass.

Before relinquishing a session, checkpoint with `state: "released"`. Release is voluntary evidence,
not an expiring lease or approval. Do this before final close, which does not accept later
checkpoints without a resume. Each close records a Running attempt before executing the gate and
retains failed, changed-input, and successful outcomes. An interrupted process can leave Running
and a programme lock; inspect its recorded owner and confirm the process stopped before removing
that lock. Another programme's checkpoint can proceed while this gate runs. The same programme's
mutations must retry after the current action ends; never overwrite its JSON to bypass the lock.
All writers must use the updated CLI; older processes and direct file edits do not honor its locks.
Upgrade shared tooling at a stable checkpoint and record the version used by final verification.

Closing programme A never accepts programme B. Unfinished programmes still block the combined
delivery-readiness check. Edits after A closes invalidate its whole-source receipt, so a shared
branch requires final verification of the resulting composition before merge. Keep A's historical
receipt and B's pending obligations explicit; do not restart A's completed engineering work merely
to refresh an integration check.

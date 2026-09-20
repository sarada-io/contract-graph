# Set up the prototype session

Read this at entry or when execution context changes. Keep ordinary feedback in cg-prototype §2.

## Preserved installation policy

An older installation may preserve workflow, `.agents/cg/phases.json`, and the root contract's
skill catalog while installing this new skill. Inspect for conflicts with prototype test timing
or missing prototype entries. Prepare the exact scoped amendment and explain the named files and
policy change. Ask once for explicit adoption before applying it unless the user already approved
those amendments in this session. A request such as “prototype the dashboard” alone does not
authorize rewriting preserved policy. Continue independent routing and launch work where permitted.

Once approved, amend only the required workflow exception, canonical cg-prototype skill entry,
and prototype A/P/E phase row. Preserve other choices and record the answer in the roadmap.
A separately retained restriction needs its own resolution through cg-unblock; do not waive it.

## Declare the writer and starting scope

Record the current worktree, launch command, selected boundaries, and a stable session ID in the
roadmap. Use the host task ID when available. Before editing, write one small session JSON file,
normally `<docs>/plans/<programme>/sessions/<session-slug>.json`:

```json
{"state":"active","writes":["app/dashboard"],"note":"Dashboard prototype and its contract."}
```

Use repository-relative files or directories without globs. Include affected contracts, shared
configuration and tracked generated inputs. A directory is sufficient; do not enumerate every
future file. Run `cg delivery checkpoint --programme <slug> --session <id> --evidence <file>`.
This declaration supplies review scope. Earlier and released declarations remain included, so
narrowing a later declaration cannot remove prototype code from review.

Update the declaration when scope changes, before editing the new paths. Resolve overlapping
writes and shared resources using [concurrent work](concurrent-work.md) if another writer is
present. Declarations are coordination evidence, not enforced ownership or dependency closure.
Do not generate checkpoints for each CSS change. Before relinquishing the session or final
closure, checkpoint with `state: "released"`; releasing writes does not approve the prototype.

# Contract Graph Dev Kit — agent entry point

<!-- BEGIN CG BOOTSTRAP — generated from the installed release · do not edit -->
## Lifecycle bootstrap

### Start with the requested action

Before following any linked task reading order, resolve the intended repository/worktree and apply the user's explicit scope first. After the selected skill and this bootstrap, run the selection check before opening the root contract, workflow, policy catalogs, roadmaps or other references, unless explicit repository policy requires an earlier check. For programme recovery run **one `cg status`**, adding `--programme <slug>` when the target is already known. Start with text output; full JSON is for a specific missing field, not the startup default. Reuse the returned installation, intent and state information while current; run additional admission/verification commands only where the selected action requires them. Warmup readiness and a new standalone task need not invent a programme.

**Selection gate:** if the result is `selection-required`, stale/unknown selection, or the requested target remains ambiguous, stop discovery and ask which listed outcome the user means. Do not resolve ambiguity by requesting all-programme status/receipts, checking every candidate, reading other roadmaps or searching Git history. Target selection is a short scope question, not a material decision needing cg-unblock, a decision record or the owner-communication reference. Name the actual candidates, ask which to open and wait for the answer. Do not persist a guessed `--select`. Sign-off may recover a single actual completion request under its existing rules; multiple requests still require selection. A bare invocation requests only the skill's next applicable action within existing authority.

Once selected, read that programme's current checkpoint, criteria and next action, not its entire receipt history. Do not follow a status call with unscoped `cg delivery status` or `cg status --summary --json`. Use `cg status --summary --compact --json` only for an explicitly needed cross-programme overview, and retrieve omitted detail only when needed for the selected obligation. Missing or deleted plan evidence is a concrete prerequisite, not permission to reconstruct it from commits unless that recovery was requested. Batch independent read-only checks; after a successful result, proceed without repeated status/log polling unless new evidence requires it.

### Read task context after selection

After selection, load context for the selected action. Apply the root-to-boundary task reading order before planning, implementation or dependent delivery; preview-only recovery follows the selected skill's launch procedure. Selection/clarification is read-only entry work. If command execution is blocked, use the platform-specific launcher recovery below. Read shared instructions once per session and reuse unchanged context. For the active delivery phase, inspect installed policy in `phases.json`: load its always families and relevant conditional families; A binds globally, P binds only its declared scope, and E is advisory. Select conditional E entries for a concrete decision with `cg guidelines show --id <E-ID>` or `--category`; do not substitute the first page of a catalog for applicable rules. Retained repository workflow and loading choices remain authoritative; reconcile incompatible routes before dependent execution. Context reuse does not waive fresh intent, admission, source or verification checks when required.

For a concrete task, run `cg contract route --task "<request>"`. If no exact match, retry with `--suggest`; suggestions are lexical candidates, not ownership proof. If absent or ambiguous, inspect `cg contract show`, follow `cg contract children --id <id>` one boundary at a time, then select `cg contract context --id <id>`. Do not add synonyms merely to force a match. Use `--hydrate --compact --json` for shared context with explicit retrieval for omissions. A bare skill name is not a task description: recover its current outcome first.

| Skill | First useful action |
| --- | --- |
| cg-warmup | Check intent/readiness and select intent, adoption or reseed; survey only when the selected mode requires it. |
| cg-plan | Recover the named goal and existing agreement; investigate the next unresolved outcome or readiness question. |
| cg-produce | Recover the selected item, review preference and admission; prepare and execute the next eligible change. |
| cg-prototype | Recover the intended preview and launch instructions, then open or reuse it for feedback. |
| cg-sign-off | Recover the requested completion scope and handoff before loading its applicable finishing checks. |
| cg-unblock | Recover the named question and its recorded answers; resolve only the remaining choice. |

Before opening implementation, establish the owning contract, relevant entry points and the question that reading will answer. Keep this in the existing task context/checkpoint; no new reading log is required. A roadmap records work state, not ownership. Follow relevant children and affected dependency/sibling links; do not stop at a root contract with narrower owners or read unrelated implementations to obtain a complete overview. Expand reading when evidence exposes an affected caller, shared resource, failure or responsibility comparison; explain that dependency in the existing work evidence.

Read only the selected skill's applicable references. Canonical source documents need reopening when intent is unclear, changed or requires review, not merely because they are linked. Revisit context when scope, policy or source evidence changes. Experts reuse the assigned scope, current stage and supplied contract context, checking changed or missing evidence without restarting the whole lifecycle. Relative links do not authorize switching checkouts or following unrelated parent directories.

| Evidence | What it permits |
| --- | --- |
| Concrete authorised request | Work within its scope, including routine verification and repairs |
| Programme selection | Addresses that programme; grants no execution or acceptance authority |
| Agreed plan | Defines outcomes; execution still needs an actual request |
| Passing tests | Evidence for tested behaviour; never substitutes for required human review |
| Actual scoped acceptance | Finishing within existing authority while evidence stays current |
| Verified completion | Reporting completion only after all applicable obligations are satisfied |

For a concrete bounded change, use cg-produce's bounded-change procedure. Existing programme gates and recovery records still apply. Do not create a plan, queue or receipt solely to perform a small correction. Missing consequential authority pauses dependent work while independent authorised work continues. No step grants publication authority.

## Run the installed CLI

Examples use `cg` as the command name, including Windows PowerShell after a global npm install with lifecycle scripts enabled. The package install hook removes only the verified package-owned `cg.ps1` so bare `cg` reaches npm's batch launcher. Local installs, development links, script-disabled installs and unfamiliar wrappers retain npm's normal launchers; use `cg.cmd` as the fallback if PowerShell blocks `cg.ps1`.

If bare `cg` reports that `cg.ps1` cannot be loaded because scripts are disabled or unsigned, resolve the installed launcher with `Get-Command cg.cmd -CommandType Application` and verify it with `cg.cmd --version --json`. Reuse the working launcher for the rest of the session, preserving all arguments, working directory and exit codes. For a resolved absolute path containing spaces, invoke it with PowerShell's call operator: `& 'C:\path with spaces\cg.cmd' --version --json`; substitute the actual installed path.

A launcher failure does not waive required framework checks. Do not replace verification with improvised file edits, change execution policy, elevate privileges, install another CLI or download a package merely to recover command execution. If the installed launcher is absent or also blocked, report the actual installation/PATH or policy prerequisite and continue only independent work. A command that reaches the CLI and returns a validation or application error is not a launcher failure: address that result rather than retrying a state-changing command through another launcher.

## Communicate with the owner

Address functional leaders in plain language. Explain outcomes, choices, costs and risks; use technical terms only when necessary and explain them. Before presenting a decision or result, read [owner communication](../skills/cg-unblock/references/owner-communication.md). It defines the four-field decision review and separates it from internal evidence.
<!-- END CG BOOTSTRAP -->

Contract Graph Dev Kit gives coding agents the structure and workflow to plan, execute and verify changes while keeping the codebase understandable. Repository-native contracts form the graph at its core; lifecycle skills carry agreed work through implementation, review and completion.

**For selected work, start here: [`.agents/cg/contract.yaml`](contract.yaml)** — the root of the project's context
graph. It explains the system, sets the reading order, and routes work into module and sub-module
contracts before implementation code is read.

`.agents/cg/` is a dot-directory. If your tool's indexer skips hidden paths, open these files by
exact path rather than relying on search.

<!-- BEGIN PRINCIPLES INDEX — generated from architecture and product rules · do not edit -->
<!-- END PRINCIPLES INDEX -->

## Required reading order

Read these once for the selected task, reusing unchanged session context under Lifecycle bootstrap below:

1. Resolve the intended checkout, requested outcome and applicable current checkpoint; a bare skill invocation uses its recovery entry.
2. [`.agents/cg/contract.yaml`](contract.yaml), [project intent](project-context.md) and [repository workflow](workflow.md) — ownership, approved direction and retained execution policy.
3. [`.agents/cg/principles/architecture.yaml`](principles/architecture.yaml) — global architecture bindings, `hierarchy.kinds` and `graph`.
4. Route the concrete task, descend through relevant child contracts and select boundary context before implementation reading.
5. Read `phases.json`; load required families, resolve applicable P and select conditional E for actual decisions. Follow omitted context explicitly; an arbitrary catalog excerpt is not complete binding context.

The principle index in this file is generated. Keep repository-specific instructions in the root
entry files or other repository-owned context. Regenerate with `cg sync`.

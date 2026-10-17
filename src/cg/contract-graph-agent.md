# Contract Graph Dev Kit — agent entry point

Contract Graph Dev Kit gives coding agents the structure and workflow to plan, execute and verify changes while keeping the codebase understandable. Repository-native contracts form the graph at its core; lifecycle skills carry agreed work through implementation, review and completion.

**Start here: [`.agents/cg/contract.yaml`](contract.yaml)** — the root of the project's context
graph. It explains the system, sets the reading order, and routes work into module and sub-module
contracts before implementation code is read.

`.agents/cg/` is a dot-directory. If your tool's indexer skips hidden paths, open these files by
exact path rather than relying on search.

<!-- BEGIN PRINCIPLES INDEX — generated from architecture and product rules · do not edit -->
<!-- END PRINCIPLES INDEX -->

## Required reading order

1. [`.agents/cg/contract.yaml`](contract.yaml) — repository contract and graph root.
2. [`.agents/cg/project-context.md`](project-context.md) — current project intent copied from repository documentation and maintained through approved decisions.
3. [`.agents/cg/principles/architecture.yaml`](principles/architecture.yaml) — architecture
   principles: `hierarchy.kinds` and `graph` (recurse, selfSufficient, stay / add-child / elsewhere),
   then A detectors.
4. Read `phases.json`; resolve applicable P and load E according to the retained phase policy. Use `cg guidelines show --id <E-ID>` for selected advisory entries; do not automatically read the whole guidelines directory.
5. [`.agents/cg/workflow.md`](workflow.md) — the repository-owned agent workflow.
6. Run `cg contract route --task "<request>"` — resolve the first task-to-contract edge from routes
   owned by contracts.
7. `<module>/.agents/cg/contract.yaml`, then its relevant child contracts — traverse until the
   responsible boundary is clear; only then read implementation. Use `cg contract context` to
   resolve the rules that bind the selected boundary.

The principle index in this file is generated. Keep repository-specific instructions in the root
entry files or other repository-owned context. Regenerate with `cg sync`.

<!-- BEGIN CG BOOTSTRAP — generated from the installed release · do not edit -->
## Run the installed CLI

Examples use `cg` as the command name, including Windows PowerShell after a global npm install with lifecycle scripts enabled. The package install hook removes only the verified package-owned `cg.ps1` so bare `cg` reaches npm's batch launcher. Local installs, development links, script-disabled installs and unfamiliar wrappers retain npm's normal launchers; use `cg.cmd` as the fallback if PowerShell blocks `cg.ps1`.

If bare `cg` reports that `cg.ps1` cannot be loaded because scripts are disabled or unsigned, resolve the installed launcher with `Get-Command cg.cmd -CommandType Application` and verify it with `cg.cmd --version --json`. Reuse the working launcher for the rest of the session, preserving all arguments, working directory and exit codes. For a resolved absolute path containing spaces, invoke it with PowerShell's call operator: `& 'C:\path with spaces\cg.cmd' --version --json`; substitute the actual installed path.

A launcher failure does not waive required framework checks. Do not replace verification with improvised file edits, change execution policy, elevate privileges, install another CLI or download a package merely to recover command execution. If the installed launcher is absent or also blocked, report the actual installation/PATH or policy prerequisite and continue only independent work. A command that reaches the CLI and returns a validation or application error is not a launcher failure: address that result rather than retrying a state-changing command through another launcher.

## Communicate with the owner

Address functional leaders in plain language. Explain outcomes, choices, costs and risks; use technical terms only when necessary and explain them. Before presenting a decision or result, read [owner communication](../skills/cg-unblock/references/owner-communication.md). It defines the four-field decision review and separates it from internal evidence.

## Lifecycle bootstrap

Use the launcher guidance above and the root-to-boundary reading order. Reuse unchanged context within the session. Inspect installed policy in `phases.json`: load its always families and relevant conditional families; A binds globally, P binds only its declared scope, and E is advisory. Do not recursively load every skill or reference. Read the selected skill, then only the mode and obligations needed for the request. Retained repository workflow and loading choices remain authoritative; reconcile incompatible routes before dependent execution.

| Evidence | What it permits |
| --- | --- |
| Concrete authorised request | Work within its scope, including routine verification and repairs |
| Programme selection | Addresses that programme; grants no execution or acceptance authority |
| Agreed plan | Defines outcomes; execution still needs an actual request |
| Passing tests | Evidence for tested behaviour; never substitutes for required human review |
| Actual scoped acceptance | Finishing within existing authority while evidence stays current |
| Verified completion | Reporting completion only after all applicable obligations are satisfied |

For a concrete bounded change, use cg-produce's bounded-change procedure. Existing programme gates and recovery records still apply. Do not create a plan, queue or receipt solely to perform a small correction. Missing consequential authority pauses dependent work while independent authorised work continues. No step grants publication authority.
<!-- END CG BOOTSTRAP -->

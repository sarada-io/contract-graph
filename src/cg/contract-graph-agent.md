# Contract Graph — agent entry point

**Start here: [`.agents/cg/contract.yaml`](contract.yaml)** — the root of the project's context
graph. It explains the system, sets the reading order, and routes work into module and sub-module
contracts before implementation code is read.

`.agents/cg/` is a dot-directory. If your tool's indexer skips hidden paths, open these files by
exact path rather than relying on search.

<!-- BEGIN PRINCIPLES INDEX — generated from architecture and product rules · do not edit -->
<!-- END PRINCIPLES INDEX -->

## Required reading order

1. [`.agents/cg/contract.yaml`](contract.yaml) — repository contract and graph root.
2. [`.agents/cg/principles/architecture.yaml`](principles/architecture.yaml) — architecture
   principles: `hierarchy.kinds` and `graph` (recurse, selfSufficient, stay / add-child / elsewhere),
   then A detectors.
3. [`.agents/cg/guidelines/`](guidelines/) — non-binding engineering guidelines and
   repository-owned product guidelines.
4. [`.agents/cg/workflow.md`](workflow.md) — the repository-owned agent workflow.
5. Run `cg contract route --task "<request>"` — resolve the first task-to-contract edge from routes
   owned by contracts.
6. `<module>/.agents/cg/contract.yaml`, then its relevant child contracts — traverse until the
   responsible boundary is clear; only then read implementation. Use `cg contract context` to
   resolve the rules that bind the selected boundary.

The principle index in this file is generated. Keep repository-specific instructions in the root
entry files or other repository-owned context. Regenerate with `cg sync`.

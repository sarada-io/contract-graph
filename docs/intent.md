# Project intent and approval

Contract Graph needs to know what a repository is for before its boundaries can guide delivery. A structurally consistent graph can still describe the wrong product. After `cg init`, run `/cg-warmup` for both a new project and an existing codebase. Init creates `<docs>/project-intent.md` and preserves it on subsequent runs; the docs root comes from the saved profile.

Warmup uses existing vision, overview, specifications and decisions to draft a concise interpretation for owner review. It records purpose and audience, boundaries, permitted variation, an acceptance example, open questions and binding sources. A canonical vision can remain authoritative: name its repository-relative path in Binding sources. Modules usually refine project intent through their contract responsibilities, without another mandatory intent page.

Confirmed intent is separate from conformance. If existing code violates an accepted requirement, preserve that requirement and record corrective work and the enforcement gap. Do not rewrite intent, contracts or valid test expectations merely to make the implementation appear consistent.

## Project and module intent

The repository page is a concise entry point to existing accepted meaning. It should answer who the product serves, what it owns, what stays outside it, which variations are allowed and what a successful example looks like. Do not turn it into a long questionnaire or replace a useful canonical vision. Distinguish an inferred interpretation from an accepted requirement and surface material conflicts for review.

A module normally expresses its narrower intent in its contract's purpose, responsibility and surface. Add separate module context only when it helps readers; the current approval mechanism is repository-wide, not a hierarchy of independent module approvals. For Contract Graph itself, [Vision](vision.md#product-intent-and-successful-outcomes) remains the canonical product-intent statement. This guide explains adoption of intent in repositories; it is not a competing statement of the framework's mission or evidence of self-adoption approval.

In a greenfield repository, warmup confirms intent and establishes root context without inventing modules. In brownfield and reseed, it compares existing code with accepted meaning and records discrepancies. An empty product-rule catalog or a green graph check alone establishes neither missing intent nor completed adoption.

## Review and record

The agent handles these commands and the temporary JSON; the owner reviews the meaning and answers in ordinary language.

1. Complete the page from evidence and resolve material questions. Use `None` under Open questions when settled. Binding sources is `None` or a list such as ``- `docs/vision.md` ``; paths must remain within the repository.
2. Run `cg intent review --json`. Present the exact page and binding sources covered by the returned snapshot.
3. After actual approval, prepare JSON containing `by`, `response`, `scope: "repository"`, and that `snapshot`. Run `cg intent approve --evidence <file>` and remove the temporary evidence file. The retained record is `.agents/cg/intent.json`.
4. Run `cg intent verify`. It exits nonzero for missing, incomplete, unapproved or changed intent. `cg intent status --json` explains the state without making approval.

The snapshot covers the full page and explicitly listed sources. Any byte change in those inputs requires renewed review; unlisted linked documents are not transitively included. This first version uses repository-wide approval, not independent per-module approvals. A meaningful interpretation still needs human judgment; structural validation cannot decide whether a paragraph adequately expresses a product's purpose.

Installed repositories gate plan, prototype, produce and sign-off admission through `cg next --for <skill>` and the supported host hook. The retired cg-prepare and cg-auto-run entrypoints are rejected. Direct delivery start, resume, handoff and close also check readiness. Skills require the check even where a host has no dispatch hook. Inspection, drafting and clarification remain available while approval is pending. Uninstalled standalone graph/prototype APIs retain their compatibility behavior; they do not establish adoption readiness.

## What the evidence means

The local record attributes a response and detects changed content. It does not authenticate an owner, prove product satisfaction or independently prevent an agent from editing approval data. For owner-controlled CI, `cg intent verify --evidence <trusted-record>` reads a complete approval record from a caller-selected path, which can be outside the proposed checkout. Protect that evidence and CI configuration outside the proposed change if independent approval assurance is required. The framework does not install remote branch protection.

`cg verify` keeps its existing graph-check exit semantics. It checks the authored graph and registered structural rules; declared product checks are not automatically executed. A passing graph check, fresh intent approval and passing behavioral tests answer different questions. Delivery still needs relevant behavioral evidence and actual acceptance of the agreed result.

Full-file freshness is deliberately conservative: even editorial changes need review because a semantic comparison cannot reliably decide whether product meaning changed. See [record ownership](workflow.md#delivery-records-and-routing) for how intent relates to delivery.

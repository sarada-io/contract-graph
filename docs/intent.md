# Project intent and approval

Contract Graph Dev Kit establishes what a repository is for before its boundaries and workflow can guide delivery. A structurally consistent graph can still describe the wrong product. After `cg init`, run `/cg-warmup` for both a new project and an existing codebase. Init creates `.agents/cg/project-context.md` beside the root `contract.yaml` and preserves it on subsequent runs. Its location does not depend on the configured docs root. The existing `cg intent` commands and `.agents/cg/intent.json` continue to own review and approval freshness.

Warmup copies the intent expressed in existing vision, overview and specifications into concise project context for owner review, with links to its sources. It incorporates approved decisions that materially shape the project. It records purpose and audience, boundaries, permitted variation, an acceptance example, open questions and binding sources. A canonical vision can remain authoritative: name its repository-relative path in Binding sources. Modules usually refine project intent through their contract responsibilities, without another mandatory intent page.

Confirmed intent is separate from conformance. If existing code violates an accepted requirement, preserve that requirement and record corrective work and the enforcement gap. Do not rewrite intent, contracts or valid test expectations merely to make the implementation appear consistent.

## Project and module intent

Project context is a self-contained copy of current accepted meaning, not just an index of other documents. It should answer who the product serves, what it owns, what stays outside it, which variations are allowed and what a successful example looks like. Do not turn it into a long questionnaire or replace a useful canonical vision. Distinguish an inferred interpretation from an accepted requirement and surface material conflicts for review.

A module normally expresses its narrower intent in its contract's purpose, responsibility and surface. Add separate module context only when it helps readers; the current approval mechanism is repository-wide, not a hierarchy of independent module approvals. For Contract Graph itself, [Vision](vision.md#product-intent-and-successful-outcomes) remains the canonical product-intent statement. This guide explains adoption of intent in repositories; it is not a competing statement of the framework's mission or evidence of self-adoption approval.

In a greenfield repository, warmup confirms intent and establishes root context without inventing modules. In brownfield and reseed, it compares existing code with accepted meaning and records discrepancies. An empty product-rule catalog or a green graph check alone establishes neither missing intent nor completed adoption.

## Keep context current

As development and owner decisions change the project, update project context and the affected canonical documentation together. Capture changes to purpose, audience, boundaries, supported variation, enduring constraints and significant tradeoffs with their rationale. One direction-setting decision can warrant an update. Routine implementation choices, task sequencing and superseded alternatives do not need entries. Keep current meaning concise rather than accumulating a decision history.

At every sign-off, account for resolved decisions within the completed scope and relevant design records. Consolidate lasting direction in project context, structural promises in the owning contract, and qualifying policy in the appropriate YAML catalog. Context prose does not create a machine-enforced rule. Preserve actual approval evidence in the existing completion record before clearing consumed decision-log entries or obsolete scope-owned design records. Pending questions and decisions needed by unfinished work remain, with their owner and dependency explicit. Detailed design records remain only where they serve a continuing reader or retention need. See [decision consolidation](workflow.md#decision-consolidation-at-sign-off).

A changed context or binding source still requires fresh approval of the exact resulting content. An already-recorded answer can supply that authority only when it covers that content; approval of one decision does not approve an expanded rewrite.

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

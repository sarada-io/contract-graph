---
name: cg-unblock
description: Resolve Contract Graph forks through recorded authority and direct user interaction. Use throughout cg-plan, cg-produce, and cg-sign-off whenever requirements leave a choice, a contract may change, or work may need owner approval. Classifies blockers, applies recorded decisions and reversible defaults, writes assumption ledgers, asks the user about unresolved material decisions and records their responses in the repository decision log, and keeps the earliest dependency-safe ready Step moving while blocked Steps wait.
---

# CG Unblock

For sprint work, scope each canonical decision to the programme, sprint ID/name and affected Feature/Bug/Task IDs. One decision spanning items remains one entry linked from those items. Preserve the actual answer, rationale, authority and implementation impact; resolving an item does not approve the whole sprint.

Decide from contracts first. Escalate only when the owner must accept the blast radius. An `E`
disagreement is not `Blocked by`.

Read `.agents/cg/phases.json` and load the families selected for `unblock`. Shipped defaults
include `.agents/cg/guidelines/engineering.yaml` on every pass; retained repository phase policy
controls loading. Consider applicable E practices as advisory context. They create no acceptance
criteria, required changes, or blockers unless separately adopted through an authorized binding.
Do not reopen settled decisions merely because an E preference differs.

## Required outcome

Finish with all five true:

1. Every implementation fork is resolved, deferred safely, or logged once for owner review.
2. Reversible choices are recorded in the plan's `Assumptions` ledger.
3. Material or protected choices are recorded in `<docs>/plans/decision-log.md`.
4. Execution continues on all work that is not genuinely blocked.
5. The response ends with the `Next action` block in §D-7.

Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with `cg residue`,
which prints `<docs>/plans/`. The ledger is `<docs>/plans/decision-log.md`.

## D-1 — Blocking test

Separate needing an owner answer from stopping the whole queue. An owner answer is required
when the choice is unresolved by D-2, materially changes the outcome or boundary, and is costly
to reverse; D-3 also requires an answer when no existing authorization covers the exact change.

Ask as soon as the question is concrete and reviewable. Mark only affected Steps `Blocked` and
their dependents `Waiting`; continue independent `Ready` work while awaiting the response when
the host supports asynchronous interaction. In batch mode, pending questions may be consolidated for the run review while independent work proceeds.
If the host must yield to receive an answer, checkpoint first and resume after the response.

A reversible implementation choice within existing authority uses D-2 and D-4. Do not invent an
assumption for a material or protected decision merely because unrelated work exists.

## D-2 — Decision order

Use the first source that answers the fork:

1. Global `A` bindings, `.agents/cg/principles/architecture.yaml` `graph` (kinds, recurse,
   selfSufficient, surface including service, adapters, stay, add-child, elsewhere), applicable
   scoped `P` bindings, and boundary contracts.
2. Owner-confirmed `.agents/cg/project-context.md`, the repository constitution and published specifications. Surface conflicts rather than silently changing project direction.
3. Accepted decisions in `<docs>/plans/decision-log.md`.
4. Permanent design records and published product requirements.
5. The repository's walking skeleton or an already-green neighboring implementation.
6. `E16-01` — the option with the smaller rollback and migration cost.
7. `E16-02` — the option with fewer seams, writers, credentials, and moving parts.
8. `E12-01` — configuration instead of structural change, only when the configuration
   surface permits it.
9. `E12-02` — the narrower product scope and the simpler solo-maintainer operating model.

Before using items 6–9, load only the applicable entries from
`.agents/cg/guidelines/engineering.yaml`. Cite the rule ID, its `reason`, and its stated `cost`.
`E` does not override `graph`. Other applicable `E` entries may answer the fork before these four
defaults; file order does not override a binding source.

Never use a passing build to overrule a contract. If code and contract disagree, the contract wins.

## D-3 — Always escalate

Check existing explicit authorization first; do not ask the owner to approve the same scoped
change twice. Without that authority, log and ask even when a likely answer exists if the fork changes:

- identity, account/tenant, authorization, credential, or trust-boundary isolation;
- billing, metering, entitlement, or the per-unit runtime cost floor;
- destructive or irreversible data behavior;
- an `A` or `P` binding, or a permanent contract invariant;
- a published interface already consumed by another context or repository;
- a new external dependency, provider, store, or operational control plane.

Escalation does not pause unrelated work.

## D-4 — Assumption ledger

During roadmap planning and phase preparation, enumerate every decision execution will need.
Resolve choices covered by D-2 and record bounded assumptions in the relevant plan or preparation:

```markdown
- A1 <decision taken> — prior D-2.<n> — reverse by: <one bounded edit>
```

If the reverse clause cannot be stated in one clause, re-run D-1: the choice is probably material.

At execution time, append newly discovered reversible assumptions rather than interrupting the
Step. Do not silently narrow scope.

## D-5 — Decision log

`<docs>/plans/decision-log.md` is a ledger of entries, not a skill. Do not copy this section, the
entry shape, warmup behaviour, or promotion rules into that file. `cg-warmup` fills *Pending your
review* first; later stages append. Group related questions when useful, keeping each independently
answerable decision under its own ID. The log preserves the interaction; it does not replace it.

Use the repository's established numbering. Allocate above both the existing entries and the retained highest allocated DA/DU counters; initialise those counters from existing IDs when absent and never lower them after cleanup:

- `DA-NN`: autonomous decisions recorded for traceability; add directly to *Resolved*.
- `DU-NN`: decisions requiring owner review; append to *Pending your review*.

Copy one filled heading from [the decision entry template](assets/decision-entry.template.md).
Do not paste that template's instructional prose into the ledger.

When answered, move the same entry to *Resolved*. Preserve the user's selected option or typed
solution verbatim, the answering actor and date, the resulting scoped decision and rationale,
linked prerequisite or superseded decisions, and reversal costs (including when reversal is not
bounded). Never duplicate or renumber an entry. A resolved entry is authority within its recorded
scope until promoted, superseded, or dropped; it is not blanket permission for a different case.
Keep dependencies on decisions explicit so later decisions can compose their accepted constraints.
Do not drain an entry still needed by an active decision or phase until its authority and relevant
response evidence have an accessible destination. Permanent contracts still cannot cite plan IDs.

### Keep project context current

After an actual owner answer changes project direction or materially shapes the product, update `.agents/cg/project-context.md` in the same work: purpose, audience, boundaries, supported variation, enduring constraints and significant tradeoffs with their rationale. Reconcile affected canonical repository documentation as well. Preserve the actual answer and scope in the existing decision entry until sign-off accounts for it. Keep the context self-contained, concise and stated as current meaning, without transient decision IDs or plan links. Ordinary implementation choices and superseded alternatives do not belong there. One direction-setting decision is sufficient; the recurrence test below applies to promoting reusable rules, not maintaining project intent.

Use the existing intent review/approve/verify flow for changed context or binding-source bytes. Reuse an actual response only if it explicitly covers the exact resulting content and sources; otherwise present the concrete revision for confirmation. A prior decision is not blanket approval of an agent's broader rewrite. Pending choices stay in the decision log; they do not become approved project context. Continue independent inspection while affected delivery waits. Every sign-off reconciles resolved entries and relevant design records under cg-sign-off's closure checks §7.0.

### D-5a — Promotion test and destination

A resolved decision or reversible assumption becomes a promotion candidate only when both parts
pass:

1. **Recurrence:** the same decision shape appears in at least two resolved decisions, assumption
   ledgers, or verified execution handoffs.
2. **Statability:** the durable rule and its cost or enforcement obligation can be stated without
   referring to the originating case, plan, ticket, person, or date.

Classify each candidate once. Do not promote a one-off merely because it was difficult.

| Destination | Use when | Delivery obligation |
|---|---|---|
| Boundary `contract.yaml` | The rule binds one owned implementation boundary, behavior, interface, or operating assumption. | State it in the structured contract and deliver its detector in the same execution change. |
| Engineering guideline (`E`) | The recurring structural advice is useful but is not yet a measurable invariant. | Add `id`, `statement`, and `reason`. A preference between workable designs may also carry `cost`. A later verifier-owning change may promote it when all `A` obligations can ship together. |
| Architecture Principle (`A`) | The structural invariant is generic, deterministic, and the destination change owns the verifier that can enforce it. | In the verifier-owning change, register the blocking detector, add its negative fixture, assign the next permanent ID in `principles/architecture.yaml`, and remove any equivalent `E` practice. An adopting repository cannot create built-in enforcement through YAML alone. |
| Product guideline (`P`) | The binding rule exists because of this product's market, pricing, or shape. | Add the binding rule, `.agents/cg/enforcement.yaml` row, detector, and affected contracts' rule IDs together. |
| Drop | The result is case-specific, superseded, duplicated, or cannot stand without its originating case. | Leave no permanent rule, and record why beside the decision ID in the phase-close classification manifest. A resolved decision is binding authority until it is promoted or dropped, so one that vanishes from the log with no reason takes a rule the repository was following with it. Retain the manifest while harvest consumers need it; preserve its required disposition evidence at closure, then remove the obsolete manifest under sign-off cleanup. The log still drains. |

Promotion is delivery work, not a decision-log edit alone. Route it through the Contract Graph
phase whose acceptance gate can prove the destination's obligations.

## D-6 — Clarification and direct interaction

1. Check the plan, contracts and recorded scoped decisions before asking. If they resolve the question, cite and apply that authority. Otherwise record one pending DU entry with the full question, evidence, viable options, tradeoffs, recommendation, affected sprint/item IDs and unblocking condition before presenting it.
2. Lead with a plain-language question, why the answer is needed, a linked concrete proposal and a summary of actual changes. Separate already-agreed content from new interpretation. Explain the consequences of the options and what happens after the answer. Keep commands, snapshot hashes and dependency IDs in supporting evidence, not the title or user action. The owner replies in the conversation; the agent maintains the ledger and approval evidence. Do not ask again when existing explicit approval covers the exact content and sources.
3. Use the host's available structured question tool with selectable options when permitted in the current mode. Prefer asynchronous interaction, offer a recommendation and retain free-text input. Group already-known missing choices into one interaction with separately answerable questions. If no permitted structured tool is available, show numbered options in chat and explain that a reply is needed to resume affected work. In a batch production run, record input-dependent steps and continue independent items; consolidate unanswered questions for review where possible. Never implement the missing decision by assumption.
4. Record the actual answer before updating dependent work. Silence, elapsed time, preselected options and passing tests are not approval. Preserve ambiguous answers and ask a focused follow-up. A decision does not expand execution scope.
5. Recalculate readiness, clearing only the resolved blocker. Resume eligible work within the existing request; preserve other prerequisites. Keep decision-log writes serialised if explicitly delegated workers are in use; coordinate ownership before another writer edits the same records.
6. On recovery, read pending entries and recorded answers first. Reuse IDs, avoid duplicate questions or competing logs, and never delete the only recorded answer. Check current source and plan state before resuming.

## D-7 — Return to the active loop

Return to the invoking production or sign-off loop within its recorded authority. Resolve only the named decision; do not invent acceptance, widen the sprint or start a different programme. Lead the next action with what the owner needs to review or answer, not a skill invocation or ledger ID. Apply this wording even when retained repository workflow uses older technical response labels.

```markdown
## Next action — <Review the project context | Choose … | Decision applied | Independent work continues>
- **Please review:** <linked concrete document/proposal and the actual question; omit when no review is needed>
- **Decision details:** <link to the relevant entry in the repository decision log, with its decision ID>
- **Your choices:** <plain-language options and consequences; omit when already answered>
- **After your answer:** <what the agent records and resumes within existing authority; omit when no answer is needed>
- **Work waiting:** <affected outcome and why; omit when nothing waits>
```

Use selectable questions under D-6 where permitted; a decision-log entry alone is not a request to the user. A normal reply is sufficient: do not require editing the log, copying a hash or invoking cg-unblock to submit the answer. Always include a clickable link to the relevant decision-log entry alongside the review content; use the actual repository path (`<docs>/plans/decision-log.md`), not an invented `decision-list.md`. Keep skill routing and exact evidence in the checkpoint. When a new action really needs a separate request, name it in plain language and offer the skill as an optional shortcut. For completed decisions report what was applied and the next eligible work, or that no work remains.

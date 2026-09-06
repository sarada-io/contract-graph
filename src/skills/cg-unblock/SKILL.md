---
name: cg-unblock
description: Resolve Contract Graph forks through recorded authority and direct user interaction. Use throughout cg-plan, cg-prepare, cg-produce, and cg-sign-off whenever requirements leave a choice, a contract may change, or work may need owner approval. Classifies blockers, applies recorded decisions and reversible defaults, writes assumption ledgers, asks the user about unresolved material decisions and records their responses in the repository decision log, and keeps the earliest dependency-safe ready Step moving while blocked Steps wait.
---

# CG Unblock

Decide from contracts first. Escalate only when the owner must accept the blast radius. An `E`
disagreement is not `Blocked by`.

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
the host supports asynchronous interaction. Do not postpone asking until the queue is exhausted.
If the host must yield to receive an answer, checkpoint first and resume after the response.

A reversible implementation choice within existing authority uses D-2 and D-4. Do not invent an
assumption for a material or protected decision merely because unrelated work exists.

## D-2 — Decision order

Use the first source that answers the fork:

1. Global `A` bindings, `.agents/cg/principles/architecture.yaml` `graph` (kinds, recurse,
   selfSufficient, surface including service, adapters, stay, add-child, elsewhere), applicable
   scoped `P` bindings, and boundary contracts.
2. The repository constitution and published specifications.
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

Use the repository's established numbering:

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
| Engineering guideline (`E`) | The recurring structural advice is useful but is not yet a measurable invariant. | Add `id`, `rule`, and `reason`. A preference between workable designs may also carry `cost`. A later verifier-owning change may promote it when all `A` obligations can ship together. |
| Architecture Principle (`A`) | The structural invariant is generic, deterministic, and the destination change owns the verifier that can enforce it. | In the verifier-owning change, register the blocking detector, add its negative fixture, assign the next permanent ID in `principles/architecture.yaml`, and remove any equivalent `E` practice. An adopting repository cannot create built-in enforcement through YAML alone. |
| Product guideline (`P`) | The binding rule exists because of this product's market, pricing, or shape. | Add the binding rule, `.agents/cg/enforcement.yaml` row, detector, and affected contracts' rule IDs together. |
| Drop | The result is case-specific, superseded, duplicated, or cannot stand without its originating case. | Leave no permanent rule, and record why beside the decision ID in the phase-close classification manifest. A resolved decision is binding authority until it is promoted or dropped, so one that vanishes from the log with no reason takes a rule the repository was following with it. The manifest is archived with the phase; the log still drains. |

Promotion is delivery work, not a decision-log edit alone. Route it through the Contract Graph
phase whose acceptance gate can prove the destination's obligations.

## D-6 — Clarification and direct interaction

1. Under auto-run, the Engineer sends the Manager the exact ambiguity, Plan and contract evidence
   checked, viable options and tradeoffs, recommendation, affected Steps, and what an answer
   would unblock. The Manager checks the Plan and accepted decisions first. Without a Manager,
   the invoking agent performs that check itself.
2. Resolve from existing authority when possible and return the cited interpretation to the
   Engineer. If the user must decide, write a pending `DU-NN` entry before asking. The Manager
   must save the complete question, context, viable options, tradeoffs, recommendation, affected
   work and unblocking condition to disk first. If that write fails, do not present an unrecorded
   decision request. This ordering lets a new session resume even if the current one ends before
   the user sees or answers the question. Follow-up questions must also be recorded before asking.
   The Manager
   owns this entry and the user interaction; the Engineer references the ID rather than writing
   a competing copy. The Engineer owns queue updates, including blocking and independent progress;
   applying the answer is serialized after the Manager records it. During a prepared harvest
   drain the Manager may temporarily hand off exact-cohort log writes, pausing its own writes
   and queuing incoming answers until the Engineer returns ownership.
3. Ask directly in chat or the host's interaction tool. Include the decision ID, enough context
   to answer, all viable options with tradeoffs, and a clearly labelled recommendation. Offer
   selection or a typed solution; if the tool limits option count, present the complete options
   in the question text or chat. A link to the log is supplemental, not the whole question.
4. Keep unanswered entries pending. Silence, elapsed time, preselected options, Manager preference,
   and passing tests are not user approval. If a typed solution is ambiguous, preserve it and ask
   a focused follow-up before resolving the dependent choice.
5. Record the actual answer under D-5, update affected Plan or decision artifacts, then notify the
   same Engineer. Recalculate the queue immediately, clearing only the resolved blocker. Other
   blockers, unfinished dependencies, and changed-scope preparation requirements still apply.
6. Resume the earliest eligible work under the existing auto-run authority without requiring the
   user to repeat a start command. An answer does not widen that authority. On a host without live
   worker messaging, checkpoint and resume from the same artifacts when interaction returns.
7. At session start or recovery, read the relevant pending entries and reconcile any recorded
   responses before dispatching dependent work. If an entry is still unanswered, present that
   saved question using the same `DU-NN` ID in the new session. Do not invent a replacement entry,
   infer an answer from a previous request being shown, or require the old chat. Avoid repeating
   a question already awaiting an answer in the current session. Record the user's response
   before releasing the resolution, so a later session can distinguish pending from resolved.

Sign-off checks implementation against applicable resolved decisions and records remaining gaps.
A user response accepting a design does not also accept a later harvest classification unless it
explicitly covers that classification. Keep D-5a and the existing harvest acceptance gate.

## Stage boundary — yield here

Return to the invoking stage or Auto-Run Manager after the fork work. Outside auto-run, return to
the user. Do not invoke the next skill yourself. Under auto-run, `cg-unblock` may be invoked for
clarification and user interaction; it never grants permission to execute unresolved work.

## D-7 — Next-action response

Choose exactly one immediate route:

- decision resolved or a reversible assumption recorded: name the invoking skill with the updated
  decision or assumption artifact;
- owner answers required and no Step is ready: keep the direct question pending, keep
  `cg-unblock` as the next skill, and name every blocking decision-log entry;
- independent work remains: name `cg-produce` with the earliest `Ready` Step.

End the user-facing response with:

```markdown
## Next action — <Decision applied | Owner decision required | Independent work ready>
- **User action:** <one concrete action>
- **Next input:** <$cg-plan | $cg-prepare | $cg-produce | $cg-sign-off | $cg-unblock> — <updated assumption, decision set, plan, preparation, earliest Ready Step, or corrective brief>
- **Blocked by:** <condition preventing the named next action>   <!-- omit unless the status is non-advancing -->
```

Do not end with a decision survey alone. Name the caller to resume, or name `cg-unblock` when the
user's answer must first be recorded and applied.

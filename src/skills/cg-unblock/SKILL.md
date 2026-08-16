---
name: cg-unblock
description: Resolve forks across Contract Graph without serial chat interruptions. Use throughout cg-plan, cg-prepare, cg-produce, and cg-sign-off whenever requirements leave a choice, a contract may change, or work may need owner approval. Classifies blockers, applies recorded decisions and reversible defaults, writes assumption ledgers, routes genuinely material decisions through the repository decision log, and keeps the earliest dependency-safe ready Step moving while blocked Steps wait.
---

# CG Unblock

Decide from contracts first. Escalate only when the owner must accept the blast radius.

## Required outcome

Finish with all five true:

1. Every implementation fork is resolved, deferred safely, or logged once for owner review.
2. Reversible choices are recorded in the plan's `Assumptions` ledger.
3. Material or protected choices are recorded in `docs/plans/decision-log.md`.
4. Execution continues on all work that is not genuinely blocked.
5. The user-facing response names the next action, next skill, input artifact, and readiness
   condition.

## D-1 — Blocking test

Stop for an answer only when all four conditions hold:

1. **Unresolvable:** contracts, accepted design records, resolved decisions, and working code patterns
   do not answer it.
2. **Material:** the options produce different boundaries, schemas, public interfaces, security
   behavior, or durable operational commitments.
3. **Wide or costly to reverse:** the wrong choice cannot be undone with one bounded edit.
4. **Undeferrable:** no safe assumption permits the current Step to finish and no other
   dependency-safe `Ready` Step can continue.

If conditions 1–3 hold but condition 4 fails only because other work is `Ready`, append a `DU`
entry, mark only the affected Step `Blocked`, and continue the queue. Do not invent an assumption for a
material, costly decision merely because unrelated work exists. If one of conditions 1–3 fails,
apply D-2, record any required assumption, and continue. D-3 still overrides both routes.

## D-2 — Decision order

Use the first source that answers the fork:

1. Global `A` bindings, `.agents/cg/principles/architecture.yaml` `graph` (kinds, recurse, selfSufficient,
   surface including service, adapters, stay, add-child, elsewhere), applicable scoped `P` bindings, and boundary contracts.
2. The repository constitution and published specifications.
3. Accepted decisions in `docs/plans/decision-log.md`.
4. Permanent design records and published product requirements.
5. The repository's walking skeleton or an already-green neighboring implementation.
6. `E16-01` — the option with the smaller rollback and migration cost.
7. `E16-02` — the option with fewer seams, writers, credentials, and moving parts.
8. `E12-01` — configuration instead of structural change, only when the configuration
   surface permits it.
9. `E12-02` — the narrower product scope and the simpler solo-maintainer operating model.

Before using items 6–9, explicitly load only the applicable entries from the
architecture catalog under `.agents/cg/principles/`. An architecture preference
answers only after sources 1–5 do not, and the recorded assumption or decision must cite the rule
ID, its reason, and its stated cost. Other applicable rules in those files may answer the fork
before these four general defaults; file order does not override a binding source.

Never use a passing build to overrule a contract. If code and contract disagree, the contract wins.

## D-3 — Always escalate

Log an owner decision even when a likely answer exists if the fork changes:

- identity, account/tenant, authorization, credential, or trust-boundary isolation;
- billing, metering, entitlement, or the per-unit runtime cost floor;
- destructive or irreversible data behavior;
- a `A` or `P` binding, or a permanent contract invariant;
- a published interface already consumed by another context or repository;
- a new external dependency, provider, store, or operational control plane.

Escalation does not pause unrelated work.

## D-4 — Assumption ledger

During roadmap planning and phase preparation, enumerate every decision execution will need. Resolve
each D-1 failure and add one line to the relevant plan or preparation record:

```markdown
- A1 <decision taken> — prior D-2.<n> — reverse by: <one bounded edit>
```

If the reverse clause cannot be stated in one clause, re-run D-1: the choice is probably material.

At execution time, append newly discovered reversible assumptions rather than interrupting the
Step. Do not silently narrow scope.

## D-5 — Decision log

`docs/plans/decision-log.md` is a ledger of entries, not a skill. Do not copy this section, the
entry shape, warmup behaviour, or promotion rules into that file. An adopting `cg-warmup` run
fills *Pending your review* first: boundaries it could not settle from the code, and every
exception it proposes to a `A` or `P` binding. It answers what it can and logs the rest rather
than interviewing the owner, so the owner gets one consolidated list instead of a question per
module.

Use the repository's established numbering:

- `DA-NN`: autonomous decisions recorded for traceability; add directly to *Resolved*.
- `DU-NN`: decisions requiring owner review; append to *Pending your review*.

Copy one filled heading from [the decision entry template](assets/decision-entry.template.md).
Do not paste that template's instructional prose into the ledger.

When answered, move the entry to *Resolved*, record the answer, the date, and the one bounded
edit that reverses it. A resolved entry is binding authority until it is promoted or dropped —
ranked above the walking skeleton and neighbouring code. That is why the log drains at phase
close rather than growing. Never duplicate or renumber an entry.

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
| Architecture Principle (`A`) | The structural invariant is generic, deterministic, and the destination change owns the verifier that can enforce it. | In the verifier-owning change, register the blocking detector, add its negative fixture, assign the next permanent ID in `principles/architecture.yaml`, and remove any equivalent D practice. An adopting repository cannot create built-in enforcement through YAML alone. |
| Product Principle (`P`) | The binding rule exists because of this product's market, pricing, or shape. | Add the binding rule, `.agents/cg/enforcement.yaml` row, detector, and affected contracts' rule IDs together. |
| Drop | The result is case-specific, superseded, duplicated, or cannot stand without its originating case. | Leave no permanent rule, and record why beside the decision ID in the phase-close classification manifest. A resolved decision is binding authority until it is promoted or dropped, so one that vanishes from the log with no reason takes a rule the repository was following with it. The manifest is archived with the phase; the log still drains. |

Promotion is delivery work, not a decision-log edit alone. Route it through the Contract Graph phase whose
acceptance gate can prove the destination's obligations.

## D-6 — Communication

- Mark every affected Step `Blocked`, keep dependent Steps `Waiting`, and recalculate the queue.
- Mention pending decisions in chat only when no `Ready` Step remains.
- When several pending decisions remain, present one consolidated set so the owner can answer them
  together; keep each decision as its own stable `DU-NN` entry.
- Point to the logged entry instead of restating a long option survey.
- In the completion report, list assumptions taken and work deliberately left out.
- Never claim that an unanswered decision is resolved because an implementation happens to compile.

## D-7 — Next-action response

Choose exactly one immediate route:

- decision resolved or a reversible assumption recorded: recalculate queue state and return to the
  invoking Contract Graph skill with the updated decision or assumption artifact;
- owner answers required and no Step is ready: ask for the consolidated answers, keep `cg-unblock`
  as the next skill, and name every blocking decision-log entry;
- independent work remains: return to `cg-produce` with the earliest `Ready` Step.

End the user-facing response with:

```markdown
## Next action — <Decision applied | Owner decision required | Independent work ready>
- **User action:** <one concrete action>
- **Next input:** <$cg-plan | $cg-prepare | $cg-produce | $cg-sign-off | $cg-unblock> — <updated assumption, decision set, plan, preparation, earliest Ready Step, or corrective brief>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Do not end with a decision survey alone. Name the caller to resume, or name `cg-unblock` when the
user's answer must first be recorded and applied.

## Completion check

- All forks are represented in contracts, assumptions, or the decision log.
- No protected decision was smuggled into an implementation detail.
- Independent work continued.
- The final report states assumptions and unresolved decisions honestly.
- The response ends with one exact next action and skill.

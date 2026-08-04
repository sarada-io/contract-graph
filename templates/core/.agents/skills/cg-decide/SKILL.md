---
name: cg-decide
description: Resolve forks across Contract Graph without serial chat interruptions. Use throughout cg-plan, cg-prepare, cg-execute, and cg-complete whenever requirements leave a choice, a contract may change, or work may need owner approval. Classifies blockers, applies recorded decisions and reversible defaults, writes assumption ledgers, routes genuinely material decisions through the repository decision log, and keeps the earliest dependency-safe ready Step moving while blocked Steps wait.
---

# Contract Graph Decide

Decide from contracts first. Escalate only when the owner must accept the blast radius.

## Required outcome

Finish with all five true:

1. Every implementation fork is resolved, deferred safely, or logged once for owner review.
2. Reversible choices are recorded in the plan's `Assumptions` ledger.
3. Material or protected choices are recorded in `docs-plans/decision-log.md`.
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

If conditions 1–3 hold but condition 4 fails only because other work is `Ready`, append a `DL-02`,
mark only the affected Step `Blocked`, and continue the queue. Do not invent an assumption for a
material, costly decision merely because unrelated work exists. If one of conditions 1–3 fails,
apply D-2, record any required assumption, and continue. D-3 still overrides both routes.

## D-2 — Decision order

Use the first source that answers the fork:

1. Binding principles and folder/module contracts.
2. Accepted decisions in `docs-plans/decision-log.md`.
3. Permanent design records and published product requirements.
4. The repository's walking skeleton or an already-green neighboring implementation.
5. `DP-OPS-01-01` — the option with the smaller rollback and migration cost.
6. `DP-OPS-01-02` — the option with fewer seams, writers, credentials, and moving parts.
7. `DP-SAAS-01-01` — configuration instead of structural change, only when the configuration
   surface permits it.
8. `DP-SAAS-01-02` — the narrower product scope and the simpler solo-maintainer operating model.

Before using items 5–8, explicitly load only the applicable set or sets from
`.agents/cg/design/{saas,ux,ops}.md`. A design guide answers only after sources 1–4 do not, and the
recorded assumption or decision must cite the guide ID and acknowledge its stated cost. Other
applicable DP rules may answer the fork before these four general defaults; set order does not
override a binding source.

Never use a passing build to overrule a contract. If code and contract disagree, the contract wins.

## D-3 — Always escalate

Log an owner decision even when a likely answer exists if the fork changes:

- identity, account/tenant, authorization, credential, or trust-boundary isolation;
- billing, metering, entitlement, or the per-unit runtime cost floor;
- destructive or irreversible data behavior;
- a binding principle or permanent contract invariant;
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

Use the repository's established numbering:

- `DL-01`: autonomous decisions recorded for traceability; add directly to *Resolved*.
- `DL-02`: decisions requiring owner review; append to *Pending your review*.

Use this shape:

```markdown
### DL-02-<NN> — <short title>
**Raised:** <date> · <source>
**Blocks:** <the smallest exact unit that cannot proceed>
**Unblocks when:** <objective answer or prerequisite state>

**Context:** <why D-1 or D-3 applies>

**Options:**
- **A) <option>** <recommendation and trade-off>
- **B) <option>** <trade-off>
- **Other:** type your own.

**Your answer:** _(blank)_
```

When answered, move the entry to *Resolved* and record the answer. Never duplicate or renumber it.

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
| Module or folder `CONTRACT.md` | The rule binds one owned implementation boundary, behavior, interface, or operating assumption. | State it in full and deliver its detector in the same execution change. |
| Architecture Principle (`AP-`) | The structural invariant must hold for any product built in the repository. | Add the binding rule, enforcement-map row, detector, inheritance scope, and regenerated contracts together. |
| Product Principle (`PP-`) | The binding rule exists because of this product's market, pricing, or shape. | Add the binding rule, enforcement-map row, detector, inheritance scope, and regenerated contracts together. |
| Design Principle (`DP-`) | The recurring decision aid belongs to one explicit design set but should not become ambient contract inheritance. | Declare modality: an `invariant` gets a detector and enforcement-map row in the same change; a `guide` states its cost and gets no map row. |
| Drop | The result is case-specific, superseded, duplicated, or cannot stand without its originating case. | Leave no permanent rule; retain only history still required by the active plan. |

Promotion is delivery work, not a decision-log edit alone. Route it through the Contract Graph phase whose
acceptance gate can prove the destination's obligations.

## D-6 — Communication

- Mark every affected Step `Blocked`, keep dependent Steps `Waiting`, and recalculate the queue.
- Mention pending decisions in chat only when no `Ready` Step remains.
- When several pending decisions remain, present one consolidated set so the owner can answer them
  together; keep each decision as its own stable `DL-02` entry.
- Point to the logged entry instead of restating a long option survey.
- In the completion report, list assumptions taken and work deliberately left out.
- Never claim that an unanswered decision is resolved because an implementation happens to compile.

## D-7 — Next-action response

Choose exactly one immediate route:

- decision resolved or a reversible assumption recorded: recalculate queue state and return to the
  invoking Contract Graph skill with the updated decision or assumption artifact;
- owner answers required and no Step is ready: ask for the consolidated answers, keep `cg-decide`
  as the next skill, and name every blocking decision-log entry;
- independent work remains: return to `cg-execute` with the earliest `Ready` Step.

End the user-facing response with:

```markdown
## Next action — <Decision applied | Owner decision required | Independent work ready>
- **User action:** <one concrete action>
- **Next input:** <$cg-plan | $cg-prepare | $cg-execute | $cg-complete | $cg-decide> — <updated assumption, decision set, plan, preparation, earliest Ready Step, or corrective brief>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Do not end with a decision survey alone. Name the caller to resume, or name `cg-decide` when the
user's answer must first be recorded and applied.

## Completion check

- All forks are represented in contracts, assumptions, or the decision log.
- No protected decision was smuggled into an implementation detail.
- Independent work continued.
- The final report states assumptions and unresolved decisions honestly.
- The response ends with one exact next action and skill.

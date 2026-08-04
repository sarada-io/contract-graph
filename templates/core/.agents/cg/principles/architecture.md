# Architecture Principles

**Audience:** the maintainer, any future contributor, and every coding agent working in this
repository. Agents MUST read this file before planning any change.

**Precedence:** where generated code and this document disagree, **this document wins and the
code is wrong.** Where this document and a transient plan disagree, this document wins.

## How to read this

This file holds **Architecture Principles** only — structural rules that hold for any product built
in this repository, independent of what it sells.

| Family | ID form | What belongs here | Where it lives |
|---|---|---|---|
| **Architecture Principles** | `AP-<principle>-<rule>` | structural invariants, always loaded | this file |
| **Design Principles** | `DP-<SET>-<principle>-<rule>` | topic-scoped design truths, loaded at a fork | `principles/design/<set>.md` |
| **Product Principles** | `PP-<principle>-<rule>` | rules owed to *this* product's market and shape | `principles/product.md` |

**`product.md` ships with no rules and that is deliberate.** A fresh repository has architecture
and design guidance from the first commit and no product rules at all, because nobody has built the
product yet. Product principles accrue through the decision harvest at phase close — the decisions
your product forced, promoted once they recur. The file exists so the first one has a home to go
to, not a heading to invent.

- Cite the ID, never the position. `AP-01-01` is the first rule of Architecture Principle 01.
- **IDs are never renumbered.** A new rule under an existing principle is appended as the next free
  `-nn` within that principle; a retired rule is redefined in place, never reused.
- A rule stated here is stated in full. Contracts must survive plan deletion, so no rule's
  definition lives in a transient plan.

### Where the rest lives

| Content | File |
|---|---|
| Product principles | `.agents/cg/principles/product.md` |
| Design principle sets | `.agents/cg/principles/design/` |
| Rule → detector map | `.agents/cg/map/enforcement.md` |
| Task → contract routing | `.agents/cg/map/routing.md` |
| Rule → folder inheritance | `.agents/cg/map/inheritance.json` |
| Governance and amendment | `.agents/cg/contract.md` |
| Development workflow | `.agents/cg/workflow.md` |

---

# Architecture Principles

## AP-01. The architecture is executable, not reviewable

Where code is written largely by agents and reviewed by few people, rules that live only in prose
will be violated, and the violation will not be caught.

- **AP-01-01** — Every architectural rule in this document that can be expressed as a test **must
  be**, and that test must fail the build.
- **AP-01-02** — A rule and its enforcing test land in **the same commit**. A documentation change
  introducing a constraint without its detector is incomplete and must not merge.
- **AP-01-03** — CI order is: format → architecture tests → build → unit → integration. Green or it
  does not merge.

*Why this is first:* every other principle below is only as real as its detector. What you cannot
personally review, you make unbuildable.

## AP-02. Bounded contexts stay separable

- **AP-02-01** — No module dependency cycles.
- **AP-02-02** — Each context owns its domain, persistence, and boundary code. A bounded context
  **must not** reference another bounded context's internal types; cross-context access is through
  published contracts only.
- **AP-02-03** — Each bounded context owns its persistence **data**: exactly one context writes a
  given collection or table, and no context reads or writes another's except through a published
  port. **A data-access module may be shared; the data may not.** What remains forbidden is a
  **generic store abstraction**: every adapter is written against its own context's domain ports,
  never against a shared persistence port, and no adapter slice may depend on another slice's
  persistence model. Code shared inside a persistence module is confined to named isolation seams
  and is never exported through the domain layer.
- **AP-02-04** — Business tables have exactly one owning writer. Shared runtime records carry
  explicit ownership, and cross-owner mutation is forbidden.
- **AP-02-05** — Sharing a process is a **deployment choice, never a licence** to share types or
  write another context's tables. A plan that puts one context's code inside another's module is
  wrong regardless of how convenient the wiring is.

## AP-03. Deterministic governance, not model judgement

- **AP-03-01** — Input safety is a **code gate**, not a model call.
- **AP-03-02** — Tools and actions are **deny-by-default** behind a single enforcement chokepoint.
- **AP-03-03** — Authorization lives in the domain layer, never only in the UI or a prompt.
- **AP-03-04** — Any customer-visible action with side effects requires explicit confirmation.
- **AP-03-05** — Role and authorization rules are **never** runtime configuration.

## AP-04. Data discipline

- **AP-04-01** — Data is deletable completely, with a receipt, along **distinct paths that must not
  be collapsed**: erasure of one data subject's records, and removal of a whole account or
  workspace. The second is a **privileged action only** — authenticated, audited, with a recorded
  actor. No scheduled job and no customer-facing surface may perform it. Regulation and platform
  app stores mandate the first; build both before launch, not after.
- **AP-04-02** — Every record class with a lifecycle has an explicit retention policy, enforced by a
  scheduled job or a TTL, not by intention.
- **AP-04-03** — Secrets are references resolved at runtime, never values in configuration, source,
  or database records.
- **AP-04-04** — Customer content and PII are redacted at the telemetry boundary — logs, traces, and
  audit events — by policy, not convention.
- **AP-04-05** — Customer identity is a stable subject claim, erasable end to end.
- **AP-04-06** — Every persisted record carries an integer `schemaVersion`. Writers only ever write
  the current version; readers **upcast** older versions on read. A **bounded window** of supported
  versions is declared in code, and reading below the window is a typed error, never a silent
  default. Dropping a version out of the window requires a completed backfill. Without the version
  stamp and the window, schema-on-read degrades into unbounded, unknowable compatibility branches.

## AP-05. Small configuration surface

Code is the default home for behaviour. Something becomes runtime configuration only when it earns
it, by showing **all four**:

1. an operator has a real need to change it without a deploy;
2. it is policy, prompt, presentation, or **cost** — not logic;
3. it has a named owner, validation, an audit trail, and a revision;
4. an absent or invalid value fails safe to a built-in default.

- **AP-05-01** — **Never configuration, under any justification:** pipeline order and control flow,
  the input-safety gate, tool deny-by-default, confirmation requirements, and role or authorization
  rules (AP-03).

There is no fixed count of configuration surfaces; a new one is added by reasoned amendment, not
forbidden.

## AP-06. Simplicity first — the solo-maintainer test

Before adding any component: *can one person operate this at 3am, and can a new contributor
understand it in a week?*

- **AP-06-01** — The permitted persistence set is **declared, small, and closed**. Name the exact
  stores this repository is allowed to use and what each is for. Adding one — including any
  dedicated vector service, cache server, search cluster, or second database — requires an
  amendment, not a preference.
- **AP-06-02** — No message broker, no ESB, until a real need is demonstrated with evidence. Start
  with the database.
- **AP-06-03** — Do not split into additional deployables until a module demonstrates a genuinely
  different scaling or availability profile, **with evidence**. A small team cannot afford three
  deploy pipelines, three log streams, and distributed debugging.
- **AP-06-04** — Prefer boring, widely-known technology. The hiring pool is a design constraint.
- **AP-06-05** — Delete aggressively. A capability that cannot be maintained is a liability, however
  impressive.

---

## Adapting this file

Every rule above is a starting position, not scripture. Two honest ways to change one:

- **Amend it.** Follow the amendment procedure in `.agents/cg/contract.md`: state what changed, why,
  **what it costs**, and the detector — in the same commit as the detector itself (AP-01-02).
- **Delete it.** A rule you will not enforce is worse than no rule, because it teaches every agent
  that this file is decorative. Remove it and its enforcement-map row together.

`AP-06-01` in particular is written as a blank to fill: name your stores before your first
persistence commit, or the rule enforces nothing.

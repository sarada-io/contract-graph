---
name: cg-warmup
description: Adopt Contract Graph into a repository that already has code. Run once, after cg init, before the lifecycle skills are useful. Discovers the real module roots, writes one folder contract per module from the code that is actually there, fills the inheritance and routing maps, and assesses the existing repository against the binding principles — routing every finding to a detector, a recorded exception, or a corrective Step. Never reports a compliance score, never edits behaviour, and never marks a rule enforced that no detector proves.
---

# Contract Graph Warmup

A fresh `cg init` describes a repository that does not exist yet. Warmup replaces that
description with the one you actually have.

**Run this once.** After it, the lifecycle skills — `cg-plan`, `cg-prepare`, `cg-produce`,
`cg-sign-off` — have real contracts to work against, and you never need this skill again.

## Why it exists

`cg verify` on a freshly initialised brownfield repository reports **OK**. That is not a claim
that your repository is governed; it is a claim that the *scaffold* is well-formed. The
inheritance map ships with one example entry, so the verifier checks exactly that entry and
looks at nothing else. A forty-module repository can pass while thirty-nine modules are
invisible.

Warmup closes that gap, and the honest measure of it finishing is coverage: every module root
mapped, every mapped module carrying a contract, and every finding resolved to something
executable.

## Required outcome

Finish with all eight true:

1. Every real module root is discovered and either mapped or explicitly excluded with a reason.
2. Every mapped module has a `contract.md` describing the code that is there — not an aspiration.
3. `map/inheritance.json` names, for each module, the rules that actually bind it.
4. `map/routing.md` routes a task to the module contracts it touches.
5. Every principle assessment lands as a detector, a proposed exception, or a corrective Step.
6. Every open question is a decision-log entry or a recorded assumption — none was asked in chat.
7. The report states coverage and the limits of its own evidence.
8. The user-facing response names the next action, next skill, input artifact, and readiness
   condition.

## 1. Discover the module roots

Start with the tool, which reads build manifests rather than guessing from directory shape:

```bash
cg modules
```

It prints every detected root, whether the inheritance map already governs it, and exits **1**
while any is unmapped — so it is also the gate that tells you when this skill is finished.

```
UNMAPPED  .                 (go.mod)
UNMAPPED  services/billing  (go.mod)
governed  web               (package.json)

3 detected, 2 unmapped
```

Detection is a heuristic with a stated basis, not an oracle. Read the build yourself where the
answer looks wrong, and correct it — the manifest that produced each row is printed beside it.

| Ecosystem | The file that decides |
|---|---|
| Go | `go.mod` (and each nested one in a multi-module repo) |
| Node | `package.json`, plus `workspaces` / `pnpm-workspace.yaml` |
| JVM | `settings.gradle(.kts)` includes, or Maven `<modules>` |
| Python | `pyproject.toml`, `setup.cfg` |
| .NET | `*.sln` project references, `*.csproj` |
| Rust | `Cargo.toml` `[workspace] members` |

Where no build file draws the line — a Python package tree, a plain source directory — `cg modules`
will not see it. Fall back to the deployment or ownership boundary — what ships separately, what a
single person is on call for — and say in the report that you did.

A root reported as `.` is the repository itself. In a single-module repository that is the module.
In a monorepo it is usually the container: map what is inside it instead, and `cg modules` stops
reporting it once anything is mapped.

Exclude, with a stated reason rather than silently: vendored or generated trees, build output,
fixtures, and anything the repository already ignores.

Do **not** stop and ask the owner to confirm the list. Proceed on the roots a manifest identified,
recording that as an assumption, and raise only the genuinely ambiguous ones — §6.

## 2. Write one contract per module

Copy [the module contract template](assets/module-contract.template.md) for each module. It
already carries the two `BEGIN/END INHERITED` markers in the right place — leave them empty and
adjacent, because `cg sync` fills that block and `cg verify` rejects a hand-edited one.

For each module, read its code first, then state:

- **Module Identity** — what it is, in one sentence a newcomer would recognise.
- **Allowed Responsibilities** — what belongs here.
- **Forbidden Responsibilities** — what must never move here. This is the section that does the
  work; a contract with an empty one governs nothing.
- **Invariants** — what must hold no matter who edits it.
- **Entry Points** — how callers reach it.
- **Verify Command** — a command that actually runs today, even if it only builds this module.
- **Sibling Contracts** — the modules it may depend on, and the direction.

Two rules that decide whether this is worth doing at all:

- **Describe what is true, not what you wish were true.** A contract that states the boundary
  you intend to have is a plan, and plans belong in `docs/plans/`. If the code violates the
  boundary you want, write the boundary that exists and open a finding under §5.
- **State it in full.** A contract may never cite a plan path or a ticket as the source of a
  rule — `cg verify` fails the build for it, because a contract that depends on a deletable
  file is a contract that expires.

Leave `<!-- Replace this section -->` markers only where you genuinely could not determine the
answer. Each one is a question for §6 — a marker with no entry behind it is a hole nobody will
find again.

## 3. Fill the inheritance map

`map/inheritance.json` decides which rules are stamped into which contract. Nothing infers it
and nothing checks a scope is *correct* — the verifier proves only that a rule ID exists.

For each module add an entry with its path key, `depth` matching the segment count, `kind`
(`module` for a workspace root that needs its own `CLAUDE.md`/`AGENTS.md` pointers, `folder`
otherwise), the `contract` path, and its `rules`.

**When unsure whether a rule binds a module, include it.** A wrongly narrow scope means a
folder silently stops being told about a rule it must obey, and silence is the failure mode
this whole framework exists to remove. A wrongly broad scope is visible and annoying, which is
the better error.

`DP-` rules are never inherited. They are loaded at a fork, and an unavoidable guide is just a
rule.

Run `cg sync` after editing, then `cg verify`. Re-run `cg modules` — a mapped module stops being
reported, so the count going down is your progress.

An entry may govern a parent: a contract on `services/` covers `services/billing/` beneath it.
Prefer that where the modules genuinely share a boundary, and separate contracts where they do not.

## 4. Fill the routing map

`map/routing.md` ships as a stub because only the repository knows its own capabilities. Add one
row per capability, surface, or subsystem, naming the module contracts a task touching it must
load.

Write the rows in the words a request arrives in — "checkout fails at payment", not
"PaymentServiceImpl" — because the routing table is read by whoever received the request, before
they know which class is involved.

## 5. Assess the repository against the principles

This is the part that must not overclaim.

Work through `principles/architecture.md`, `product.md`, and any installed fork-loaded principle files. For
each rule, establish which of three states it is in **for this repository**:

| State | What it means | Where it goes |
|---|---|---|
| **Enforced** | a detector exists and passes | the enforcement-map row names it |
| **Assessed** | no detector; you read the code and formed a view | a finding, resolved below |
| **Unknown** | you could not tell without running or instrumenting it | say so; do not guess |

Every **Assessed** finding must resolve to exactly one of these, and to nothing else:

1. **A detector, written now** — the rule stops being aspirational for this repository, and the
   `<…> *(not yet built)*` marker comes out of the enforcement map in the same change.
2. **A proposed exception** — a `DL-02` entry in `docs/plans/decision-log.md` stating what the
   repository does instead, what that costs, and the one bounded edit that reverses it. Warmup
   proposes; it never accepts. A binding principle is protected under `cg-unblock` D-3, so waiving
   one is the owner's call even when the answer looks obvious. An exception nobody wrote down is a
   violation nobody remembers.
3. **A corrective Step** — handed to `cg-plan` or `cg-prepare`, because a fix that changes
   behaviour owes its contract and detector in the same change and is therefore delivery work,
   not warmup work.

**Never produce a compliance score, a percentage, or a grade.** A number computed from readings
implies a measurement that was not taken. State counts instead — how many rules have detectors,
how many were read, how many are unknown — because a count carries its own denominator and a
score hides it.

**Warmup never edits behaviour.** It writes governance, detectors, and findings. The moment a
finding requires a code change, it becomes a Step for `cg-produce`.

## 6. Raise what needs the owner — in the log, not in chat

Warmup does not interview you. It decides what it can from the code and the principles, records
what it decided, logs what it genuinely cannot decide, and hands you **one consolidated set at the
end**. That is the same rule every other Contract Graph skill follows: stopping mid-task costs the
run; a wrong reversible decision costs one edit.

Route every open question by what it would cost to be wrong:

| Question | Route | Why |
|---|---|---|
| a module root a build manifest identified | proceed; record an assumption | reversible by one edit to `inheritance.json` |
| a boundary with no manifest behind it — a package tree, a shared directory | **`DL-02`** | wrong here makes several contracts wrong, and no default is safe |
| which rules bind a module | proceed, including the rule when unsure | §3 — the broad scope is the visible error |
| an exception to a binding principle | **`DL-02`, always** | a binding principle is protected; it is never yours to waive quietly |
| a contract section you could not determine | marker, plus **`DL-02`** when the boundary is material | otherwise the marker is the record |

Reversible choices go in the plan's assumption ledger, one line each:

```markdown
- A1 <decision taken> — reverse by: <one bounded edit>
```

If the reverse clause will not fit in one clause, it was not reversible — make it a `DL-02`.

Owner questions go in `docs/plans/decision-log.md` under *Pending your review*, using the shape
already in that file. Keep each as its own stable entry, and never renumber one.

Two rules that make this work rather than becoming a queue nobody drains:

- **A logged question never pauses unrelated work.** A module whose boundary is in question still
  gets its contract, with that section marked and the entry linked. Every other module proceeds.
- **Present the set once, at the end.** Not one question per module as you meet it. The owner
  answers a consolidated list in one sitting, which is the difference between ten minutes and ten
  interruptions.

Stop and ask in chat only if nothing else can proceed — which, for warmup, essentially means the
repository has no discoverable modules at all.

## 7. Report coverage honestly

```markdown
# Warmup report

## Modules
- discovered: <n> — <how: build file, ownership boundary>
- mapped: <n>
- excluded: <n> — <each with its reason>

## Contracts
- written: <n>
- carrying unresolved `<!-- Replace -->` markers: <n> — <which>

## Principles
- enforced (detector exists and passes): <n>
- assessed by reading (evidence, not proof): <n>
- unknown (needs running or instrumenting): <n>

## Findings
- detectors written now: <n>
- exceptions proposed with their cost: <n>
- corrective Steps handed to planning: <n>

## Waiting on you
- `DL-02` entries under *Pending your review*: <n>
- assumptions recorded and proceeding: <n>

## Gate
<the exact `cg verify` output, and `cg modules`>
```

**Waiting on you** is the section to read first — it is the whole ask, in one place, and nothing
in it stopped the rest of the work. The principles section is the honest one. If most rules are `assessed` rather than `enforced`, say
so plainly — that is the true state of a repository at adoption, and pretending otherwise makes
the first real violation a surprise instead of a caught defect.

## 8. Next-action response

Choose exactly one immediate route:

- contracts written, gate green, and questions logged: point the owner at the `DL-02` set and name
  `cg-unblock` to apply the answers when they come;
- contracts written and nothing is pending: use `cg-plan` with the first real piece of work;
- findings need delivery: use `cg-plan` with the corrective set;
- no discoverable modules at all: stop and ask, naming what was searched for;
- warmup is complete and no work is queued: name no next skill, and say the skill is not run
  again.

End the user-facing response with:

```markdown
## Next action — <Warmup complete | Answers pending | Findings need delivery>
- **User action:** <one concrete action — when answers are pending, "answer the N entries under *Pending your review*">
- **Next input:** <$cg-plan | $cg-unblock | None — warmup complete, this skill is not run again> — <exact decision-log entries, corrective set, or gate evidence>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

## Completion check

- [ ] `cg modules` exits 0, or every remaining row is excluded with a stated reason.
- [ ] Every module root is mapped or excluded with a stated reason.
- [ ] Every mapped module has a contract describing code that exists.
- [ ] No contract cites a plan path or a ticket as the source of a rule.
- [ ] Every `Forbidden Responsibilities` section says something.
- [ ] `inheritance.json` scopes were widened rather than guessed narrow.
- [ ] `routing.md` is written in the words requests arrive in.
- [ ] Every finding is a detector, a recorded exception, or a corrective Step.
- [ ] Every open question is a `DL-02` entry or a recorded assumption — none was asked in chat.
- [ ] Every `<!-- Replace -->` marker has a decision-log entry behind it.
- [ ] Pending questions were presented once, as a consolidated set.
- [ ] No logged question stopped work that was not actually blocked by it.
- [ ] No score, percentage, or grade appears anywhere in the report.
- [ ] No behaviour was changed by this skill.
- [ ] `cg sync && cg verify` is green, and the report states real coverage.
- [ ] The response ends with one exact next action and skill.

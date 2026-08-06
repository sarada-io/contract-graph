---
name: cg-warmup
description: Adopt Contract Graph into a repository that already has code. Run once, after cg init, before the lifecycle skills are useful. Finds any predecessor governance framework and carries its rules forward rather than writing over them, discovers the real module roots, writes one folder contract per module from the code that is actually there, fills the inheritance and routing maps, assesses the repository against the binding principles, and harvests the rules the code already enforces into product and architecture principles so no later session has to re-read the code to learn them — listing every new rule for the owner to confirm. Never reports a compliance score, never edits behaviour, never deletes or runs the predecessor, and never marks a rule enforced that no detector proves.
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

Finish with all ten true:

1. Any predecessor governance framework is found, read, and carried forward or logged — never
   silently replaced.
2. Every real module root is discovered and either mapped or explicitly excluded with a reason.
3. Every mapped folder has a `contract.md` describing the code that is there — not an aspiration —
   and every module that holds more than one boundary declares its children.
4. `map/inheritance.json` names, for each module, the rules that actually bind it.
5. `map/routing.md` routes a task to the module contracts it touches.
6. Every principle assessment lands as a detector, a proposed exception, or a corrective Step.
7. The rules the code already enforces are written as principles, bound, and listed for the owner
   to confirm — so no later session has to re-read the code to learn them.
8. Every open question is a decision-log entry or a recorded assumption — none was asked in chat.
9. The report states coverage and the limits of its own evidence.
10. The user-facing response names the next action, next skill, input artifact, and readiness
    condition.

## 1. Look for the framework that came before

**Do this first, before writing a single contract.** A repository adopting Contract Graph rarely
starts from nothing. It usually has months of hand-written governance — an older contract format, a
principles file with its own IDs, its own verifier scripts, its own decision log. If you discover
that *after* authoring ten contracts, you have already written over it.

Contract Graph is only worth adopting if what it produces is at least as strong as what it
replaces. That is a claim, and this section is where you owe the evidence for it.

Search for it. Names vary — the tell is a directory of governance prose, not code:

| Where to look | What you are looking for |
|---|---|
| `.agents/`, `.claude/`, `.cursor/`, `.github/` | skill or instruction sets other than `cg-*` |
| repository root, `docs*/` | `CONTRIBUTING`, architecture-decision records, a principles or conventions file |
| `scripts/`, `tools/`, `bin/` | governance verifiers — anything that reads a contract or principles file |
| the build file | tasks wired into `check`, `test`, or `lint` that run those verifiers |
| any second decision log | a populated ledger under a different path than `docs/plans/decision-log.md` |

Rule IDs that no longer resolve are the strongest signal: a comment citing `PP-01-04` when no
`PP-` rule exists means a predecessor defined it and was removed underneath the code.

When you find one, do these three things:

- **Read its rules before writing yours.** Every rule the predecessor asserted is either
  reproduced in the new graph — as a principle, a contract invariant, or an enforcement-map row —
  or it is a deliberate drop. There is no third case. A rule that quietly fails to reappear is the
  regression this step exists to prevent.
- **Carry its product rules into `principles/product.md` now.** That file ships empty because a
  greenfield repository has not earned a `PP-` rule yet, and rules accrue there through decision
  harvest over several phases. A repository with a predecessor has already done that work. Waiting
  for those rules to re-accrue drops them, and the drop is invisible: the architecture family is
  pre-seeded and will look complete while the product family is empty. Copy each rule across with
  its ID where the ID still fits, restate it in full, and give it a row in the enforcement map
  naming the detector that already proves it.
- **A detector that loses its rule is the highest-severity finding here.** The predecessor's map
  is where you find them: a passing test bound to a rule ID that no longer exists is now
  deletable, and nothing in the new constitution argues back. List every one in the report even
  when the rule is carried forward, because the binding is what makes it safe, not the test.
- **Record the comparison.** Report it under *Predecessor* (§9): rules carried forward, rules
  dropped and why, and anything the old framework enforced that the new one does not yet. If the
  new coverage is *weaker* anywhere, say so in that sentence — do not average it away against the
  places it is stronger.
- **Never delete it, and never run it.** Its scripts read paths that may no longer exist, and
  deleting a toolchain is not reversible by one edit. Retiring it is a `DL-02` with options, and
  the fact that it is wired into the build — so the build now fails for a governance reason — is
  part of that entry, not a separate cleanup.

If you find nothing, say that in the report. "No predecessor framework found" is a real finding;
its absence is why nobody should later ask what happened to the old rules.

## 2. Discover the module roots

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
recording that as an assumption, and raise only the genuinely ambiguous ones — §8.

## 3. Write the contract hierarchy

Copy [the module contract template](assets/module-contract.template.md) for each module. It
already carries the two `BEGIN/END INHERITED` markers in the right place — leave them empty and
adjacent, because `cg sync` fills that block and `cg verify` rejects a hand-edited one.

A contract earns its place by letting an agent route *without* reading the code underneath it.
Four of its fields carry that weight, and they are the ones a description-shaped contract omits:

- **Project role** — why the parent system contains this unit and what it does with it. Not what
  the code is; what the system needed.
- **Parent contract** and **Used by** — the edges back up and inward, so a unit found from below
  can be placed without a search.
- **Child Contracts** — the edges down, and the section that decides whether this is a graph or a
  list. Name each child and say in a phrase how it decomposes this responsibility. Where the unit
  is genuinely the smallest owned boundary, write `None — leaf module`; `cg verify` requires the
  section, so an empty one is an omission nobody can distinguish from a leaf.

Then the boundary itself: **Allowed** and **Forbidden Responsibilities** (the section that does
the work — one left empty governs nothing), **Invariants**, **Entry Points**, a **Verify Command**
that runs today, and **Sibling Contracts** with their direction.

### Descend where a module holds more than one boundary

`cg modules` stops at build manifests, and most real modules are not the smallest unit anybody
works in. A module whose source splits into packages that own separate responsibilities — each
with its own callers, its own persistence, its own reason to change — is a parent, and stopping
there leaves an agent reading the whole module to find one of them.

Descend when **all three** hold, and stop otherwise:

1. The candidate owns a responsibility you can state without mentioning its siblings.
2. It has its own entry points — something outside it enters here specifically.
3. A change confined to it would not touch the others.

Use [the sub-module template](assets/submodule-contract.template.md), map it in
`inheritance.json` with `"kind": "folder"` and a `depth` matching its segment count, and add it to
the parent's **Child Contracts**. A child that exists but is not declared by its parent is
unreachable by traversal, which is the same as not existing.

Two or three levels is normal. Do not descend to every directory — a contract per package turns
the graph into the file tree, and a file tree is what the agent already had.

Two rules that decide whether this is worth doing at all:

- **Describe what is true, not what you wish were true.** A contract that states the boundary
  you intend to have is a plan, and plans belong in `docs/plans/`. If the code violates the
  boundary you want, write the boundary that exists and open a finding under §6.
- **State it in full.** A contract may never cite a plan path or a ticket as the source of a
  rule — `cg verify` fails the build for it, because a contract that depends on a deletable
  file is a contract that expires.

Leave `<!-- Replace this section -->` markers only where you genuinely could not determine the
answer. Each one is a question for §8 — a marker with no entry behind it is a hole nobody will
find again.

## 4. Fill the inheritance map

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

## 5. Fill the routing map

`map/routing.md` ships as a stub because only the repository knows its own capabilities. Add one
row per capability, surface, or subsystem, naming the module contracts a task touching it must
load.

Write the rows in the words a request arrives in — "checkout fails at payment", not
"PaymentServiceImpl" — because the routing table is read by whoever received the request, before
they know which class is involved.

## 6. Assess the repository against the principles

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

## 7. Harvest the rules the code already enforces

You have been reading code since §3. This section is what stops that reading from being thrown
away: **whatever you learned that the next session would otherwise have to learn again belongs in
the graph before this skill ends.**

Most of it already landed — a boundary is a contract section, a decomposition is a child contract.
What is left over is the constraints. A single seam constructs every storage path. One class is
the only place authorization is evaluated. No module outside one adapter package imports the cloud
SDK. Those are decisions somebody made and the code obeys, held nowhere but in the shape of the
code, so every future session pays to re-derive them. Written down, they also happen to be
enforceable — but the reason to write them is that re-reading the code is the cost this whole
project exists to remove.

### What qualifies

A candidate is a rule only when all four hold. Anything failing one is a description, and
descriptions belong in the contract sections you already wrote:

1. **It constrains, rather than describes.** "Repositories live in `data/`" is a description.
   "Nothing outside `data/` opens a database connection" is a rule — it forbids something.
2. **The code obeys it today**, and you can name the files that prove it.
3. **A violation would be a defect**, not a preference. If you cannot say what breaks, it is a
   style note.
4. **No existing rule already covers it.** A restatement of `AP-02-02` in local vocabulary makes
   the graph longer without making it stronger.

The strongest source is the one §1 already found: **a detector that enforces no rule.** Somebody
wrote a test to hold a line. The line is the rule; write it down and bind them.

### Which family it goes in

| The rule is… | Family |
|---|---|
| structural, and would hold for any repository | `AP-` — inherited everywhere, so the bar is high |
| true because of *this* product's market, pricing, shape, or tenancy | `PP-` — the family a brownfield repository has most of and ships with none of |
| a lean between two workable designs | a fork file, as a `guide` with its cost |

Two errors to avoid, in the order they are tempting:

- **Do not file a product rule as an architecture rule.** Tenancy is the usual casualty. "Every
  document lives under a tenant path prefix" is a real, testable, load-bearing rule — and it is a
  `PP-` rule, because a single-tenant repository inheriting it could never satisfy it. The test is
  whether a repository building something else would be *wrong* to adopt it.
- **Do not file a testable rule as a `guide`.** A `guide` is where a rule goes when no detector
  could exist, never where one goes because writing the detector is work. If you can describe the
  test, the rule is an `invariant` or an `AP-`/`PP-` rule and owes its row.

### What each harvested rule owes

Every `AP-` and `PP-` rule needs **exactly one enforcement-map row** — `cg verify` fails without
it. Write the row even when the detector does not exist yet; mark it `*(not yet built)*` and it is
tracked debt rather than a silent gap. Then bind it in `map/inheritance.json` and run `cg sync`: a
rule bound to nothing governs nothing.

### When a harvested rule contradicts a binding principle

Common, and it is *information*. The code was built to a rule the architecture principles disagree
with, and one of the two is wrong. Never resolve it yourself and never quietly drop the harvested
rule — raise a `DL-02` naming both rules, the code that follows the harvested one, and the cost of
moving either way. Same `D-3` floor as §8: a binding principle is not yours to waive, and neither
is a rule the whole codebase already follows.

### Keep it proportionate

Harvest what would change what an agent does. A repository yields a handful to a few dozen; a
hundred means you are transcribing the code rather than governing it, and a graph nobody finishes
reading has lost the argument it was making. Every harvested rule is listed for confirmation in
§9 — you write them, the owner keeps them.

## 8. Raise what needs the owner — in the log, not in chat

Warmup does not interview you. It decides what it can from the code and the principles, records
what it decided, logs what it genuinely cannot decide, and hands you **one consolidated set at the
end**. That is the same rule every other Contract Graph skill follows: stopping mid-task costs the
run; a wrong reversible decision costs one edit.

Route every open question by what it would cost to be wrong:

| Question | Route | Why |
|---|---|---|
| a module root a build manifest identified | proceed; record an assumption | reversible by one edit to `inheritance.json` |
| a boundary with no manifest behind it — a package tree, a shared directory | **`DL-02`** | wrong here makes several contracts wrong, and no default is safe |
| which rules bind a module | proceed, including the rule when unsure | §4 — the broad scope is the visible error |
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

## 9. Report coverage honestly

```markdown
# Warmup report

## Predecessor
- framework found: <none | what it was, and where>
- rules it stated: <n> — <by family>
- rules carried forward: <n> — <as principles, contract invariants, or enforcement-map rows>
- rules deliberately dropped: <n> — <each with its reason>
- detectors that lost their rule: <n> — <each test, and the rule ID that no longer resolves>
- still enforced by it and not yet by this graph: <n> — <which, and the DL-02 that decides them>

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

## New principles — please confirm
Harvested from the code (§7). Each is a rule this repository already follows that no principle
stated. They are written, bound, and green — this list is for you to keep, reword, or delete.

| ID | Rule | Why it is that family | Evidence in the code | Detector |
|---|---|---|---|---|
| <PP-nn-nn> | <the rule, stated in full> | <product-specific / structural / a lean> | <the files that prove it> | <name, or `not yet built`> |

- contradicting a binding principle: <n> — <each is a `DL-02`, listed under *Waiting on you*>
- **To delete one:** remove it from the principle file, its enforcement-map row, and its entries in
  `map/inheritance.json`, then run `cg sync`.

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

**New principles is the section to read second**, and it is a different kind of ask. Those rules
are already written and already green; nothing waits on the reply. What the owner is confirming is
that each one is a rule they want to keep, in the words they would have used — because from here
on it binds every agent that reads the graph. Present the whole set at once, never one at a time,
and never ask for approval before writing them: an unwritten rule leaves the code as the only
record of itself, which is the cost this step exists to remove.

## 10. Next-action response

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

- [ ] A predecessor framework was searched for, and the report says what was found — including
      "none".
- [ ] Every rule the predecessor asserted is carried forward or listed as a deliberate drop.
- [ ] The predecessor's product rules are in `principles/product.md`, not left to re-accrue.
- [ ] Every predecessor detector whose rule ID no longer resolves is named in the report.
- [ ] Nothing belonging to the predecessor was deleted or executed.
- [ ] `cg modules` exits 0, or every remaining row is excluded with a stated reason.
- [ ] Every module root is mapped or excluded with a stated reason.
- [ ] Every mapped folder has a contract describing code that exists.
- [ ] Every contract states Project role, Parent contract, and Used by — the edges that let an
      agent route without reading the code underneath.
- [ ] Every contract declares its Child Contracts, or says `None — leaf`.
- [ ] Every child contract is declared by its parent; none is reachable only by file search.
- [ ] No contract cites a plan path or a ticket as the source of a rule.
- [ ] Every `Forbidden Responsibilities` section says something.
- [ ] `inheritance.json` scopes were widened rather than guessed narrow.
- [ ] `routing.md` is written in the words requests arrive in.
- [ ] Every finding is a detector, a recorded exception, or a corrective Step.
- [ ] The rules the code already enforces are written as principles, not left in the code.
- [ ] Every harvested rule is in the right family — no product rule filed as `AP-`, no testable
      rule filed as a `guide`.
- [ ] Every harvested `AP-`/`PP-` rule has one enforcement-map row and is bound in
      `inheritance.json`.
- [ ] Every harvested rule contradicting a binding principle is a `DL-02`, not a silent choice.
- [ ] The harvested set is listed in the report for the owner to confirm, in one place.
- [ ] Every open question is a `DL-02` entry or a recorded assumption — none was asked in chat.
- [ ] Every `<!-- Replace -->` marker has a decision-log entry behind it.
- [ ] Pending questions were presented once, as a consolidated set.
- [ ] No logged question stopped work that was not actually blocked by it.
- [ ] No score, percentage, or grade appears anywhere in the report.
- [ ] No behaviour was changed by this skill.
- [ ] `cg sync && cg verify` is green, and the report states real coverage.
- [ ] The response ends with one exact next action and skill.

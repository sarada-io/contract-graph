---
name: cg-warmup
description: Adopt Contract Graph into a repository that already has code. Run once, after cg init, before the lifecycle skills are useful. Runs as three phases — a whole-repository survey, then a resumable per-module loop that writes each unit's contract, children, bindings and findings to disk before moving on, then one consolidation. Finds any predecessor governance framework and carries its rules forward rather than writing over them, discovers the real module roots and descends below build manifests, fills the inheritance and routing maps, assesses the repository against the binding principles, and harvests the rules the code already enforces into product and architecture principles so no later session has to re-read the code to learn them — listing every new rule for the owner to confirm. Resumes from cg modules after a context break rather than restarting. Never reports a compliance score, never edits behaviour, never deletes or runs the predecessor, and never marks a rule enforced that no detector proves.
---

# CG Warmup

A fresh `cg init` describes a repository that does not exist yet. Warmup replaces that
description with the one you actually have.

**Run this once.** After it, the lifecycle skills — `cg-plan`, `cg-prepare`, `cg-produce`,
`cg-sign-off` — have real contracts to work against, and you never need this skill again.

**Never delete it.** `cg verify` requires all six skills to be present and fails without
them, and a repository that adopts a second module tree later needs this one again. Finishing
is not the same as removing the instructions for finishing.

## Why it exists

`cg verify` on a freshly initialised brownfield repository reports **OK**. That is not a claim
that your repository is governed; it is a claim that the *scaffold* is well-formed. The
inheritance map ships with one example entry, so the verifier checks exactly that entry and
looks at nothing else. A forty-module repository can pass while thirty-nine modules are
invisible.

Warmup closes that gap, and the honest measure of it finishing is coverage: every module root
mapped, every mapped module carrying a contract, and every finding resolved to something
executable.

## How this skill runs — read this before §1

**This is not a linear procedure. It is a survey, a loop, and a consolidation.**

```text
Phase A — once      §1–§3    predecessor · module roots · routing skeleton
Phase B — per unit  §4–§6    ←──┐  contract · descend · bind · sync · record
                               └──┘  repeat until `cg modules` exits 0
Phase C — once      §7–§12   root contract · assess · harvest · decisions · report
```

**Phase B is one module at a time, and it carries nothing in context between iterations.** That
is the whole reason it is a loop. A forty-module repository will not fit in one window, and an
agent that tries to read every module before writing anything either drops what it learned about
the first ones or reads them twice — which is the exact cost this project exists to remove.

Everything Phase B learns is written to disk as it goes: the contract, the entry in
`map/inheritance.json`, and one appended block in `docs/plans/warmup-findings.md`. Those files
*are* the working state. Nothing is held in your head between modules.

**If you are resuming after a context break, you are not starting over.** Run:

```bash
cg modules
```

Every row it still reports `UNMAPPED` is a unit that has not been through Phase B. Every row it
reports `governed` is done — do not revisit it. Read the tail of `docs/plans/warmup-findings.md`
to see what earlier iterations recorded, then re-enter Phase B at the first unmapped row. Phase A
does not run again; its outputs are already on disk.

Phase C runs exactly once, when `cg modules` exits 0. It needs the *whole* set — the same rule
surfaces in five modules and must be written once, not five times — which is why harvesting into
principles cannot happen inside the loop.

## Required outcome

Finish with all twelve true:

1. Any predecessor governance framework is found, read, and carried forward or logged — never
   silently replaced.
2. Every real module root is discovered and either mapped or explicitly excluded with a reason.
3. Every mapped folder has a `contract.md` describing the code that is there — not an aspiration —
   and every module that holds more than one boundary declares its children.
4. `map/inheritance.json` names, for each module, the rules that actually bind it.
5. `map/routing.md` routes a task to the module contracts it touches.
6. Every unit that went through the loop left a findings block behind, so no module's code had to
   be read twice and a context break never restarts the work.
7. The repository contract states what this product is and is not — the root of the graph carries
   no placeholder.
8. Every principle assessment lands as a detector, a proposed exception, or a corrective Step.
9. The rules the code already enforces are consolidated across units, written as principles, bound,
   and listed for the owner to confirm — so no later session has to re-read the code to learn them.
10. Every open question is a decision-log entry or a recorded assumption — none was asked in chat.
11. The report states coverage and the limits of its own evidence.
12. The user-facing response names the next action, next skill, input artifact, and readiness
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

**But most identifiers in a codebase are work items, not rules, and chasing them wastes the run.**
The grammar around the ID settles it in one read:

| The sentence says | It is | What to do |
|---|---|---|
| *per* X · X *forbids* · *violates* X · *waived under* X · *enforced by* X | a **rule** | a predecessor signal — follow it |
| *scheduled in* X · *deferred to* X · *delivered in* X · X *closed it* · *pending* X | a **work item** | not a predecessor; stop digging |

A rule is obeyed; a work item is scheduled. `CS-5.1`, `Card 6`, `PHASE-3`, `JIRA-412` are plan and
ticket references — a deleted planning document, which is ordinary in any repository with history
and tells you nothing about governance. Do not reconstruct one.

The ID is not the finding. **The sentence around it may still be.** "The `CS-5.6` gate fails
production verification on unaccepted critical findings" names a real constraint the build obeys —
that is a §9 harvest candidate. Take the constraint, verify it against the code, and drop the
identifier: a rule that cites a ticket expires when the ticket does, and `cg verify` fails a
contract that cites one.

**Search the working tree only.** Do not recover a deleted principles file, contract, or decision
log out of version control and copy it forward. Version control tells you what a rule *was*, never
that the code still obeys it — the file was deleted, and a rule resurrected from history is an
assertion about the past dressed as an assertion about the present. This is the same rule as §4:
describe what is true.

If history is the only place a rule survives, it is not a predecessor finding; it is a lead. Go
and check whether the code still holds the line, and then write the rule from *that* evidence,
citing the files that prove it. Say in the report that history suggested it and what confirmed it.
A graph whose product principles were pasted out of a deleted file looks complete and is unfalsified.

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
- **Record the comparison.** Report it under *Predecessor* (§11): rules carried forward, rules
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
recording that as an assumption, and raise only the genuinely ambiguous ones — §10.

## 3. Sketch the routing map

`map/routing.md` ships as a stub because only the repository knows its own capabilities. Add one
row per capability, surface, or subsystem, naming the module contracts a task touching it must
load.

Write the rows in the words a request arrives in — "checkout fails at payment", not
"PaymentServiceImpl" — because the routing table is read by whoever received the request, before
they know which class is involved.

Sketch it now from the module list, and correct a row in Phase B whenever reading a module shows
the routing was wrong. Doing it here rather than at the end means the loop has somewhere to write
a correction to, instead of carrying one in context for thirty modules.

---

# Phase B — repeat §4–§6 for one unit at a time

Pick the first row `cg modules` still reports `UNMAPPED`. Run §4, §5, and §6 for **that unit
only**, then run `cg modules` again and pick the next. Do not batch: do not read three modules
before writing a contract, and do not defer a binding or a finding to "later in the loop". When
`cg modules` exits 0, go to Phase C.

## 4. Write this unit's contract

Copy [the module contract template](assets/module-contract.template.md). It already carries the
two `BEGIN/END INHERITED` markers in the right place — leave them empty and adjacent, because
`cg sync` fills that block and `cg verify` rejects a hand-edited one.

Read this unit's code now. Read it once, and write everything you learn from it before moving on —
§5 and §6 exist so that nothing you noticed has to survive in context past this iteration.

**Never generate contracts mechanically.** Not with a script, not by substituting a module name
into one shared body, not by writing several at once from a list of directory names. Ten contracts
is ten readings; that is the cost, and paying it is the entire product. A templated contract says
`Purpose: core responsibilities for <module>` and `Used by: dependent modules` — sentences that are
true of every module ever written, which is the same as saying nothing. It will pass `cg verify`,
because the verifier proves a rule ID exists and a heading is present, never that a sentence
carries information. A generated graph is indistinguishable from no graph at the moment an agent
tries to route with it, and it costs more than none because it looks answered.

The tell that you are doing this: you are about to write the same sentence into a second contract.
If a sentence is true of the next module too, it belongs in the repository contract (§7) or nowhere.

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

### Descend to every self-sufficient unit

`cg modules` stops at build manifests, and no manifest declares a package — so the level of the
graph that matters most for routing is exactly the level detection is blind to. Stopping at the
module leaves an agent reading the whole of it to find one component inside.

**The test is self-sufficiency.** A unit deserves its own contract when you can name a
functionality it delivers *and* it reaches outside itself only rarely. Both halves matter: a
coherent responsibility with tendrils into every sibling is not a component, it is a layer; and
a well-isolated directory that delivers no nameable functionality is a utility bag.

Measure it rather than eyeballing the folder tree. Read the imports at the candidate's edge:

- **Inbound** — who enters, and through what. A unit entered at one or two named types has a
  boundary. One entered at a dozen scattered points has no edge to write a contract about.
- **Outbound** — what it reaches for. Depending on the shared kernel and a published sibling
  port is self-sufficiency; reaching into three siblings' internals is not, and the right finding
  there is that the boundary is wrong (§10), not that a contract should describe the tangle.
- **Reason to change** — a unit that changes for its own reasons is a component. One that only
  ever changes when a sibling changes is part of that sibling.

`cg verify` **fails** a module that declares no children while its source branches into several
packages, so this is not optional and not deferrable to a later pass.

Several packages can genuinely form one boundary, and saying so is a legitimate answer — but it
is a claim about *these* packages, so it has to name them and say what makes them inseparable.
`cg verify` rejects a justification that names none of them: a sentence that would be equally true
of any module is not evidence, it is a way of not answering. Two or three packages sharing one
lifecycle is plausible; a dozen almost never is, and asserting it over twelve is how a graph ends
up describing nothing.

Use [the sub-module template](assets/submodule-contract.template.md), map it in
`inheritance.json` with `"kind": "folder"` and a `depth` matching its segment count, and add it to
the parent's **Child Contracts**. A child that exists but is not declared by its parent is
unreachable by traversal, which is the same as not existing.

Two or three levels is normal. Do not descend to every directory — a contract per package turns
the graph into the file tree, and a file tree is what the agent already had.

Two rules that decide whether this is worth doing at all:

- **Describe what is true, not what you wish were true.** A contract that states the boundary
  you intend to have is a plan, and plans belong in `docs/plans/`. If the code violates the
  boundary you want, write the boundary that exists and open a finding under §8.
- **State it in full.** A contract may never cite a plan path or a ticket as the source of a
  rule — `cg verify` fails the build for it, because a contract that depends on a deletable
  file is a contract that expires.

Leave `<!-- Replace this section -->` markers only where you genuinely could not determine the
answer. Each one is a question for §10 — a marker with no entry behind it is a hole nobody will
find again.

## 5. Bind this unit and sync

`map/inheritance.json` decides which rules are stamped into which contract. Nothing infers it
and nothing checks a scope is *correct* — the verifier proves only that a rule ID exists.

Add an entry for this unit and each child you wrote in §4: its path key, `depth` matching the
segment count, `kind` (`module` for a workspace root that needs its own `CLAUDE.md`/`AGENTS.md`
pointers, `folder` otherwise), the `contract` path, and its `rules`.

**When unsure whether a rule binds a module, include it.** A wrongly narrow scope means a
folder silently stops being told about a rule it must obey, and silence is the failure mode
this whole framework exists to remove. A wrongly broad scope is visible and annoying, which is
the better error.

Only `AP-` and `PP-` rules are ever inherited. `DP-`, `OP-`, `UP-`, and `SP-` are fork-loaded —
`cg verify` rejects an inheritance entry naming one, because an unavoidable guide is just a rule.

Run `cg sync`, then `cg verify`, **before moving to the next unit**. A broken map found now costs
one unit's rework; found thirty units later it costs thirty. Then re-run `cg modules` — this unit
stops being reported, and the count going down is your progress.

An entry may govern a parent: a contract on `services/` covers `services/billing/` beneath it.
Prefer that where the modules genuinely share a boundary, and separate contracts where they do not.

## 6. Record what this unit taught you, then forget it

You have just read this unit's code — the most expensive thing this skill does, and the one thing
you must never pay for twice. Before selecting the next unit, append one block to
`docs/plans/warmup-findings.md`:

```markdown
### <unit path>
- **Rule candidates:** <constraints the code obeys that no principle states — §9 decides the
  family and whether they survive; here you only record what you saw and the files that show it>
- **Principle observations:** <for any `AP-`/`PP-` rule this unit bears on: the rule ID, whether
  a detector exists here, and what you read — §8 consolidates these>
- **Detectors found:** <tests in this unit that guard a boundary, and the rule ID they cite if any>
- **Open questions:** <boundaries you could not settle — §10 turns these into `DL-02` entries>
- **Routing correction:** <a `map/routing.md` row this unit showed to be wrong, already fixed>
```

Every field may be `none`. An empty block is still written, because "this unit yielded nothing" is
information the consolidation needs and an absent block is indistinguishable from a unit that was
skipped.

**Then drop the unit's code from your working set and select the next one.** Phase C reads this
file, not your memory. If you find yourself scrolling back to what a module three iterations ago
contained, the block you wrote for it was too thin — go and thicken it rather than re-reading the
source.

---

# Phase C — once, after `cg modules` exits 0

§7–§12 run one time over the whole repository. Their input is
`docs/plans/warmup-findings.md` — every block Phase B appended — plus the contracts and maps now
on disk. **Read that file first.** Do not re-open module source to reconstruct what the loop
already recorded; if a block is too thin to work from, that is a defect in the block, and the fix
is to go back to that one unit rather than to re-read them all.

## 7. Fill the repository contract

`.agents/cg/contract.md` is the root of the graph — the first thing every future session reads,
and the node every route starts from. `cg init` ships it with `Project Identity` and *What This
Product Is Not* as `<!-- Replace this section -->` placeholders, and **nothing else fills them.**
They are not in `map/inheritance.json`, so `cg verify` never asks. A warmup that maps forty
modules and leaves this empty has built a graph whose root says nothing about the product.

It is written here rather than in Phase A because only now do you have the answer: every module
has a stated *Project role*, and the repository's identity is what those roles add up to.

Write:

- **Project Identity** — what this repository builds, in the words its own team would use; its
  stable technical identity (package root, module prefix, configuration prefix); its request or
  pipeline shape; and each top-level module named with the one thing the product uses it for.
  A newcomer should be able to route from this paragraph alone.
- **What This Product Is Not** — the exclusions, which do more work than the inclusions. State
  what this repository will not become, so an agent proposing one recognises it as out of bounds.
  Take these from what the code refuses to do: a boundary every module respects, a dependency
  nothing declares, a store nothing writes to.

Both come from evidence, not aspiration — the same rule as §4. If the repository genuinely does
not settle a question, say so plainly here rather than inventing a direction for it.

Leave no `<!-- Replace this section -->` marker behind in this file. A placeholder at the root of
the graph is the one hole every session pays for.

## 8. Assess the repository against the principles

This is the part that must not overclaim.

Work through `principles/architecture.md` and `product.md` — the binding families — against the
*Principle observations* collected in the findings file. For each rule, establish which of three
states it is in **for this repository**:

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

**Do not run this table over the fork-loaded files.** Every rule in `design.md`, `operations.md`,
`ux.md`, and `security.md` is a `guide`, and `cg verify` fails the build when a guide has an
enforcement-map row. A guide makes no claim about your code, so there is nothing to assess.

**Warmup never edits behaviour.** It writes governance, detectors, and findings. The moment a
finding requires a code change, it becomes a Step for `cg-produce`.

## 9. Harvest the rules the code already enforces

Phase B recorded *Rule candidates* for every unit. This section is what stops that reading from
being thrown away: **whatever the loop learned that the next session would otherwise have to learn
again belongs in the graph before this skill ends.**

**Consolidate before you write.** The same rule surfaces in several units — "nothing outside the
adapter package imports the vendor SDK" appears in every module that does not. Merge those into
one rule, stated once at the scope that is actually true, and bind it to every unit it governs. A
rule written five times is five rules to keep in step, and this merge is the reason harvesting
could not happen inside the loop.

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
moving either way. Same `D-3` floor as §10: a binding principle is not yours to waive, and neither
is a rule the whole codebase already follows.

### Keep it proportionate

Harvest what would change what an agent does. A repository yields a handful to a few dozen; a
hundred means you are transcribing the code rather than governing it, and a graph nobody finishes
reading has lost the argument it was making. Every harvested rule is listed for confirmation in
§11 — you write them, the owner keeps them.

## 10. Raise what needs the owner — in the log, not in chat

Warmup does not interview you. It decides what it can from the code and the principles, records
what it decided, logs what it genuinely cannot decide, and hands you **one consolidated set at the
end**. That is the same rule every other Contract Graph skill follows: stopping mid-task costs the
run; a wrong reversible decision costs one edit.

Route every open question by what it would cost to be wrong:

| Question | Route | Why |
|---|---|---|
| a module root a build manifest identified | proceed; record an assumption | reversible by one edit to `inheritance.json` |
| a boundary with no manifest behind it — a package tree, a shared directory | **`DL-02`** | wrong here makes several contracts wrong, and no default is safe |
| which rules bind a module | proceed, including the rule when unsure | §5 — the broad scope is the visible error |
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

## 11. Report coverage honestly

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
- written: <n> — <n> module, <n> sub-module
- deepest path from the repository contract to a leaf: <n> levels
- declaring `None — leaf`: <n>
- carrying unresolved `<!-- Replace this section -->` markers: <n> — <which>

## Principles
- enforced (detector exists and passes): <n>
- assessed by reading (evidence, not proof): <n>
- unknown (needs running or instrumenting): <n>

## New principles — please confirm
Harvested from the code (§9). Each is a rule this repository already follows that no principle
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

**Waiting on you** is the section to read first — the whole ask, in one place, and nothing in it
stopped the rest of the work. The principles section is the honest one: if most rules are
`assessed` rather than `enforced`, say so plainly. That is the true state of a repository at
adoption, and pretending otherwise makes the first real violation a surprise, not a caught defect.

**New principles is the section to read second**, and it is a different kind of ask. Those rules
are already written and already green; nothing waits on the reply. What the owner is confirming is
that each one is a rule they want to keep, in the words they would have used — because from here
on it binds every agent that reads the graph. Present the whole set at once, never one at a time,
and never ask for approval before writing them: an unwritten rule leaves the code as the only
record of itself, which is the cost this step exists to remove.

## 12. Dispose of your own working files

Every other Contract Graph artifact has somewhere to end up: a roadmap and a Step queue are
archived when their phase closes, a decision graduates or is dropped with its reason. Warmup's
outputs had nowhere, because warmup belongs to no phase — it runs once, before the lifecycle
exists, so there is no closing event to attach disposal to. This step is that event.

The three files warmup writes have different half-lives, and treating them alike is what leaves a
repository with permanent adoption litter:

| File | What it is | Where it ends up |
|---|---|---|
| `docs/plans/warmup-findings.md` | a **resume log** — Phase B appends a block per unit so a context break continues instead of restarting | **Delete it.** Once every mapped folder has a contract and the principles are harvested, it has nothing left to resume. Its content is already in the contracts it produced. |
| `docs/plans/warmup-corrective-set.md` | findings that must become work | **Consumed, then archived.** It drains when `cg-plan` gives every finding a phase; move it to `docs/plans/archive/` at that point, not before. |
| `docs/plans/warmup-report.md` | what adoption found, at a point in time | **`docs/design/`, or delete.** If it is worth keeping it is durable knowledge, and durable knowledge does not live under `docs/plans/` — a permanent contract may not cite a path there. Keep it only if a reader would return to it; archive or delete it otherwise. |

Do this before the next-action response, and say in that response what happened to each file. A run
that reports `Warmup complete` while all three survive has not finished — it has stopped.

**Delete rather than archive when a file has no reader.** `archive/` is for records someone may
audit; it is not a place to move things to avoid deciding. A resume log nobody will read is not
made valuable by relocating it.

The one exception: if warmup is **interrupted**, leave all three exactly where they are. They are
the resume point. Disposal is part of finishing, and only of finishing.

## 12a. Next-action response

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
- **Working files:** <what happened to warmup-findings, warmup-corrective-set, and warmup-report>
- **Next input:** <$cg-plan | $cg-unblock | None — warmup complete, this skill is not run again> — <exact decision-log entries, corrective set, or gate evidence>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

## Completion check

- [ ] Each of warmup's three working files was deleted, archived, or moved to `docs/design/`, and
      the response says which.
- [ ] A predecessor framework was searched for, and the report says what was found — including
      "none".
- [ ] Every rule the predecessor asserted is carried forward or listed as a deliberate drop.
- [ ] The predecessor's product rules are in `principles/product.md`, not left to re-accrue.
- [ ] Every predecessor detector whose rule ID no longer resolves is named in the report.
- [ ] Nothing belonging to the predecessor was deleted or executed.
- [ ] `cg modules` exits 0, or every remaining row is excluded with a stated reason.
- [ ] Every unit that went through Phase B has a findings block, including the empty ones.
- [ ] No unit's source was read in Phase C — consolidation used the findings file.
- [ ] Harvested rules were merged across units before being written, not repeated per unit.
- [ ] Every module root is mapped or excluded with a stated reason.
- [ ] Every mapped folder has a contract describing code that exists.
- [ ] `.agents/cg/contract.md` has Project Identity and *What This Product Is Not* written from
      evidence — no `<!-- Replace this section -->` marker left at the root of the graph.
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
- [ ] Every `<!-- Replace this section -->` marker has a decision-log entry behind it.
- [ ] Pending questions were presented once, as a consolidated set.
- [ ] No logged question stopped work that was not actually blocked by it.
- [ ] No score, percentage, or grade appears anywhere in the report.
- [ ] No behaviour was changed by this skill.
- [ ] `cg sync && cg verify` is green, and the report states real coverage.
- [ ] The response ends with one exact next action and skill.

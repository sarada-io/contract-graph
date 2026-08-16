---
name: cg-warmup
description: Adopt Contract Graph into a repository that already has code. Run once, after cg init, before the lifecycle skills are useful. Runs as three phases — a whole-repository survey, then a resumable per-module loop that writes and connects each unit's contract.yaml before moving on, then one consolidation. Finds any predecessor governance framework and carries its rules forward rather than writing over them, discovers real module roots and self-sufficient components, builds the contract graph, verifies the structural binding, and harvests durable product rules or non-binding architecture practices so later sessions do not re-read the code to learn them. Resumes from cg modules after a context break rather than restarting. Never reports a compliance score, edits behaviour, deletes or runs the predecessor, or marks a rule enforced that no detector proves.
---

# CG Warmup

A fresh `cg init` describes a repository that does not exist yet. Warmup replaces that
description with the one you actually have. A brownfield typically has no existing Contract Graph contracts. Write the graph from the
code and §2a. Predecessor markdown, if found, is a checklist against the tree — not a graph to
copy.

**Run this once.** After it, the lifecycle skills — `cg-plan`, `cg-prepare`, `cg-produce`,
`cg-sign-off` — have real contracts to work against, and you never need this skill again.

**Never delete it.** `cg verify` requires all seven skills to be present and fails without
them, and a repository that adopts a second module tree later needs this one again. Finishing
is not the same as removing the instructions for finishing.

## Why it exists

`cg verify` on a freshly initialised brownfield repository reports **OK**. That is not a claim
that your repository is governed; it is a claim that the empty root graph is well-formed. A
forty-module repository can pass while all forty modules are still unrepresented; `cg modules`
names that coverage gap until warmup writes and connects their contracts.

Warmup closes that gap, and the honest measure of it finishing is coverage: every module root
governed, every governed module carrying a connected contract, and every finding resolved to something
executable.

Warmup declares and mechanically protects an existing cohesive declared surface before proposing
restructuring. It must not add wrapper types or move code solely to impose a source-layout
convention. Restructuring becomes a corrective Step when the existing surface mixes distinct
responsibilities, cannot be mechanically confined, exposes internals
(`graph.surface.encapsulate`), mixes optional vendor clients (`graph.adapters`), or has no small
inbound surface — many functions spread across unmanaged files and folders.

That last case is what `graph.surface.service` is for. Forty functionalities with no named entry
do not become forty nodes. Categorise them into a small set of services and point `contract.yaml`
`surface` at those types. If the service types already exist, declare them. If they do not,
warmup records a corrective Step to introduce them so later sessions enter five named operations
instead of rediscovering forty files. Folder wrappers to impose layout are still forbidden;
services are the inbound categorisation, not a new directory tree.

## How this skill runs — read this before §1

**This is not a linear procedure. It is a survey, a loop, and a consolidation.**

```text
Phase A — once      §1–§3    predecessor · module roots · code-first context · root routes
Phase B — per unit  §4–§6    ←──┐  contract · descend · connect · bind · record
                               └──┘  repeat until `cg modules` exits 0
Phase C — once      §7–§12   root contract · assess · harvest · decisions · report
```

**Phase B is one module at a time, and it carries nothing in context between iterations.** That
is the whole reason it is a loop. A forty-module repository will not fit in one window, and an
agent that tries to read every module before writing anything either drops what it learned about
the first ones or reads them twice — which is the exact cost this project exists to remove.

Everything Phase B learns is written to disk as it goes: the unit's `contract.yaml`, reciprocal
parent and child edges, its applicable `P` rules, and one appended block in
`docs/plans/warmup-findings.md`. Those files *are* the working state. Nothing is held in your head
between modules.

**If you are resuming after a context break, you are not starting over.** Run:

```bash
cg modules
```

- **UNMAPPED** — this unit has not been through Phase B. Enter §4 for it.
- **DESCEND** — a contract exists, but `graph.recurse` is unfinished (undeclared packages, no
  `Leaf rationale`). Re-enter §4 at *Descend with the binding graph*. Do not treat `governed` as
  done.
- **governed** with no DESCEND row — finished. Do not revisit it.

Read the tail of `docs/plans/warmup-findings.md` for earlier notes. Phase A does not run again.

**Before Phase A, confirm the installed binding can recurse.** Run `cg verify`. If it fails because
`.agents/cg/principles/architecture.yaml` is missing `hierarchy.kinds` or `graph.recurse`, the catalog is
older than this skill (`cg init` preserves catalogs). Stop. Ask the owner to copy the packaged
binding or confirm a deliberate amendment. Do not write nodes against a catalog that cannot recurse.

Phase C runs exactly once, when `cg modules` exits 0 (no UNMAPPED, no DESCEND). It needs the *whole*
set — the same rule surfaces in five modules and must be written once, not five times — which is
why harvesting into principles cannot happen inside the loop.

## Required outcome

Finish with all twelve true:

1. Any predecessor governance framework is found, read, and carried forward or logged — never
   silently replaced.
2. Every real module root is discovered and either mapped or explicitly excluded with a reason.
3. Every governed boundary has exactly one `.agents/cg/contract.yaml` describing the code that is
   there — not an aspiration — and every non-leaf declares its children. `graph.recurse` has been
   applied inside each module; a `cg modules` row is not a leaf by itself.
4. The global `A` catalog passes, and each contract's `rules` array names only additional
   repository-owned `P` bindings that apply to that boundary.
5. Contract-owned `routes` match task language to the contracts a request must load.
6. Every unit that went through the loop left a findings block behind, so no module's code had to
   be read twice and a context break never restarts the work.
7. The repository contract states what this product is and is not — the root of the graph carries
   no placeholder.
8. Every binding failure lands as a detector repair, a proposed exception, or a corrective Step.
9. The rules the code already enforces are consolidated across units, classified as P bindings,
   D practices, A promotion candidates, or fork guidance, and listed for the owner to confirm —
   so no later session has to re-read the code to learn them.
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

Rule IDs that no longer resolve are the strongest signal: a comment citing `P01-04` when no
`P` rule exists means a predecessor defined it and was removed underneath the code.

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
  reproduced in the new graph — as a binding, best practice, contract invariant, or product-rule
  enforcement row —
  or it is a deliberate drop. There is no third case. A rule that quietly fails to reappear is the
  regression this step exists to prevent.
- **Carry a predecessor product rule only when the code still obeys it.** `.agents/cg/guidelines/product.yaml`
  ships empty because a greenfield repository has not earned a `P` rule yet. A brownfield
  repository has usually already written some. Waiting for those rules to re-accrue drops them,
  and the drop is invisible: the architecture family is pre-seeded and will look complete while
  the product family is empty. Copy each rule that the tree still holds, with its ID where the ID
  still fits, restate it in full, and give it a row in `.agents/cg/enforcement.yaml` naming the
  detector that already proves it. A predecessor `product.md` is a checklist to verify against the
  code, not the source of the product survey. §2a reads the tree; a rule the code no longer obeys
  is a deliberate drop, not a carry.
- **A detector that loses its rule is the highest-severity finding here.** The predecessor's map
  is where you find them: a passing test bound to a rule ID that no longer exists is now
  deletable, and nothing in the new constitution argues back. List every one in the report even
  when the rule is carried forward, because the binding is what makes it safe, not the test.
- **Record the comparison.** Report it under *Predecessor* (§11): rules carried forward, rules
  dropped and why, and anything the old framework enforced that the new one does not yet. If the
  new coverage is *weaker* anywhere, say so in that sentence — do not average it away against the
  places it is stronger.
- **Never delete it, and never run it.** Its scripts read paths that may no longer exist, and
  deleting a toolchain is not reversible by one edit. Retiring it is a `DU-NN` with options, and
  the fact that it is wired into the build — so the build now fails for a governance reason — is
  part of that entry, not a separate cleanup.

If you find nothing, say that in the report. "No predecessor framework found" is a real finding;
its absence is why nobody should later ask what happened to the old rules.

## 2. Discover the module roots

Start with the tool, which reads build manifests rather than guessing from directory shape:

```bash
cg modules
```

It prints every detected root, whether a discovered contract already governs it, and exits **1**
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

## 2a. Snapshot the product from the code

Module roots tell you where the build cuts. They do not tell you what the product is. Contracts
are only as good as this snapshot, and the snapshot comes from the tree — deployables, entry
points, persistence, CI, tests — not from a predecessor `product.md`.

Write the answers into `docs/plans/warmup-findings.md` now, then into the root contract in §7 and
the harvest in §9. A hundred interview questions are not a hundred `P` or `E` rules. Each answer
is context that makes the next contract true, or a constraint that forbids something, or a
corrective Step when the composition is wrong.

| Question | What to read | Where it lands |
|---|---|---|
| SaaS, enterprise install, or consumer app | tenancy in signatures and paths; billing/metering types; whether infrastructure is per-customer | root `purpose` / `forbids`; `P` if the market shape forbids a different product |
| Monolith, mini-monolith, or microservices | `cg modules`, Boot/application entry points, how many artifacts CI ships | root composition; `P` only if this repository committed to a count; otherwise describe what is there |
| Named domain model or scattered types | ubiquitous language in ports vs DTOs that leak persistence or vendor types | `graph.surface.encapsulate`; a missing model is a corrective Step, not a leaf per file |
| API/services first, classic web, mobile, or desktop | launchers, HTTP surfaces, mobile/desktop projects, template roots | root `routes` `when` phrases; surface `kind` |
| Defined CI/CD | workflows that must pass to merge | `verification` commands; absence is a finding, not a guessed pipeline |
| Defined security policy | authorization chokepoints, secret handling, trust-boundary tests | `P` when product-specific; `E` when advisory; a missing chokepoint is a Step |
| Composition healthy, or restructure required | `graph.recurse`, `graph.surface`, `graph.adapters` against the packages you actually opened | stay if the surface is cohesive; **a brave restructure is a corrective Step** when responsibilities, vendor clients, or inbound scatter cannot be confined — not silent stay, and not a rewrite of behaviour in this skill |

Warmup never edits behaviour. If the snapshot says the composition is wrong, §8 records the Step
and `cg-plan` owns the delivery. Protecting a declared cohesive surface comes first; proposing to
split or merge it is allowed once that surface is named.

## 3. Sketch the root routes

The repository contract's `routes` array is the first task-to-contract edge. Add one route per
capability, surface, or subsystem. Each route owns a stable `id`, phrases under `when`, and one or
more canonical contract paths under `contracts`.

Write `when` phrases in the words a request arrives in — "checkout fails at payment", not
"PaymentServiceImpl" — because routing happens before the caller knows which class is involved.
Use `cg contract route --task "<request>"` to exercise the routes.

Sketch them now from the module list, and correct a route in Phase B whenever reading a module
shows it was wrong. The contract file is the only routing source; do not create a companion map.

---

# Phase B — repeat §4–§6 for one unit at a time

Pick the first row `cg modules` still reports `UNMAPPED`, or if none, the first `DESCEND`. Run §4,
§5, and §6 for **that unit only**, then run `cg modules` again and pick the next. Do not batch: do
not read three modules before writing a contract, and do not defer a binding or a finding to "later
in the loop". When `cg modules` exits 0, go to Phase C.

**Binding authority.** Read `.agents/cg/principles/architecture.yaml` before writing a node. `hierarchy.kinds`
is the recursive mapping (repository → module → submodule → component or library). `graph` is the
node decision (recurse, selfSufficient, surface, stay, add-child, elsewhere, compose, stop, forbid, adapters). A
self-sufficient unit earns a child node; `cg modules` listing a module is not a leaf. Do not
consult `engineering.yaml` to decide whether a folder is a contract. D entries are advice after
the graph is placed.

## 4. Write this unit's contract

Copy [the YAML contract template](assets/contract.template.yaml) to
`<unit>/.agents/cg/contract.yaml`. Keep the schema's field names and replace every instructional
value. The YAML file is the contract: do not create a companion Markdown file or a separate
inheritance map. CommonMark is allowed inside descriptive string values.

Read this unit's code now. Read it once, and write everything you learn from it before moving on —
§5 and §6 exist so that nothing you noticed has to survive in context past this iteration.

**Never generate contracts mechanically.** Not with a script, not by substituting a module name
into one shared body, not by writing several at once from a list of directory names. Ten contracts
is ten readings; that is the cost, and paying it is the entire product. A templated contract says
`purpose: core responsibilities for <module>` and parent `uses: dependent modules` — sentences that are
true of every module ever written, which is the same as saying nothing. It will pass `cg verify`,
because the verifier proves a rule ID exists and a heading is present, never that a sentence
carries information. A generated graph is indistinguishable from no graph at the moment an agent
tries to route with it, and it costs more than none because it looks answered.

The tell that you are doing this: you are about to write the same sentence into a second contract.
If a sentence is true of the next module too, it belongs in the repository contract (§7) or nowhere.

A contract earns its place by letting an agent route *without* reading the code underneath it.
Four of its fields carry that weight, and they are the ones a description-shaped contract omits:

- **`purpose`** — why the parent contains this unit, how the parent uses it, and who enters it.
- **`relations.parent`** — the edge back up, including the delegated responsibility under `uses`.
- **`relations.children`** — the edges down. Each child path says how it decomposes this
  responsibility. A smallest owned boundary explicitly uses `composition: "leaf"` and an empty
  child array; a parent uses `"composed"` and at least one child.

Then the boundary itself: `responsibilities.owns/allows/forbids`, a language-native `surface` with
observable accepts, returns, failures, and guarantees, `invariants`, executable `verification`,
and lateral `relations.dependencies` with their direction.

### Descend with the binding graph

`cg modules` stops at build manifests, and no manifest declares a package — so the level of the
graph that matters most for routing is exactly the level detection is blind to. Stopping at the
module leaves an agent reading the whole of it to find one component inside. A `governed` module
that still prints `DESCEND` is not finished.

Apply `.agents/cg/principles/architecture.yaml` `graph.recurse` and `graph.selfSufficient` to every candidate
inside this unit. Cite those fields; do not invent a local test. `hierarchy.kinds` names the child's
kind; `hierarchy.transitions` constrains it. `graph.stop` is when to become a leaf; `graph.forbid`
is what never counts as a node. Depth is not capped: a two-level module leaf and a five-kind nest
can coexist. Do not stop at three because a sentence said three is normal, and do not add a fourth
because a folder exists. Apply `selfSufficient` at this node.

`cg modules DESCEND` waits until three undeclared package branches; two self-sufficient packages
still take `add-child`. `cg modules DESCEND` and `cg verify` `[0]` name undeclared packages on leaves *and* on composed
nodes that have not claimed their children. Answer that now. If several packages form one
boundary, `graph.stop` requires a `Leaf rationale:` assumption that names them and says why they
are inseparable.

`graph.surface` is declared entry and encapsulation. Enter only through the contract surface.
`graph.surface.service` is the first way to declare it: list the named services whose operations
take parameters, do the work, and return the completed result; `contract.yaml` `surface` points at
those types. Internals, algorithms, persistence, framework types, and vendor types stay behind
that call. An undeclared entry or a bypass is a corrective Step, not stay.

If this unit is many functions across unmanaged files with no small inbound surface, do not
create a node per file. Categorise the work into a small set of services. Declare them when the
types exist; otherwise §8 a corrective Step to introduce them. Do not consult E01 to make that
node decision. E01 is caller consumption of an already-declared surface.

`graph.adapters` is the vendor split of `graph.surface.encapsulate`. An optional external resource
is a parent-owned port; each concrete option is `add-child`, not `stay`. Two vendor clients in one
unit is a corrective Step, not a shared database file. E02 is construction of the service behind
the call; do not consult it to make that node decision.

Use [the component contract template](assets/component-contract.template.yaml) when `add-child`
selects a component or library, and add reciprocal edges: the parent names the child's canonical
contract path and the child names the parent. `cg verify` rejects a dangling, one-sided, cyclic, or
root-unreachable edge.

Two rules that decide whether this is worth doing at all:

- **Describe what is true, not what you wish were true.** A contract that states the boundary
  you intend to have is a plan, and plans belong in `docs/plans/`. If the code violates the
  boundary you want, write the boundary that exists and open a finding under §8.
- **State it in full.** A contract may never cite a plan path or a ticket as the source of a
  rule — `cg verify` fails the build for it, because a contract that depends on a deletable
  file is a contract that expires.

Leave a string beginning `Replace this sentence` only where you genuinely could not determine the
answer. Each one is a question for §10 — a marker with no entry behind it is a hole nobody will
find again.

## 5. Bind and verify this unit

The structural `A` catalog applies globally and is never copied into contract `rules`. That
array is reserved for additional repository-owned `P` bindings whose scope requires authoring
judgement. Add applicable `P` IDs directly; `cg verify` proves every ID exists. Do not copy rule
text into the contract; `cg contract context --id <id>` resolves global A rules and scoped P
rules together.

**When unsure whether a rule binds a module, include it.** A wrongly narrow scope means a
folder silently stops being told about a rule it must obey, and silence is the failure mode
this whole framework exists to remove. A wrongly broad scope is visible and annoying, which is
the better error.

`E` entries are non-binding and never appear
in a contract's `rules` array.

Run `cg sync`, then `cg contract verify`, then `cg verify`, **before moving to the next unit**.
`cg sync` writes this module's `AGENTS.md` and `CLAUDE.md` pointers from its contract so the
folder is openable as a workspace root. A broken edge found now costs one unit's rework; found
thirty units later it costs thirty.

A verification command that only proves a path exists (`test -f`, `test -d`, `[ -f`) is not
verification. Name the test or build that exercises the invariant. If the unit has no such command
yet, that is a §8 finding, not an existence check.

Then re-run `cg modules` — UNMAPPED and DESCEND for this unit both clear when recurse is done.

A parent contract may govern nested build modules only when they genuinely share one responsibility.
Prefer separate child contracts whenever the nested module has its own public surface or reason to
change.

## 6. Record what this unit taught you, then forget it

You have just read this unit's code — the most expensive thing this skill does, and the one thing
you must never pay for twice. Before selecting the next unit, append one block to
`docs/plans/warmup-findings.md`:

```markdown
### <unit path>
- **Rule candidates:** <constraints the code obeys that no principle states — §9 decides the
  family and whether they survive; here you only record what you saw and the files that show it>
- **Rule observations:** <A failures, applicable P rules, or D practices this unit bears on;
  include what you read and any detector evidence — §8 consolidates these>
- **Detectors found:** <tests in this unit that guard a boundary, and the rule ID they cite if any>
- **Open questions:** <boundaries you could not settle — §10 turns these into `DU-NN` entries>
- **Routing correction:** <a root or parent `routes` entry this unit showed to be wrong, already fixed>
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
`docs/plans/warmup-findings.md` — every block Phase B appended — plus the connected contracts now
on disk. **Read that file first.** Do not re-open module source to reconstruct what the loop
already recorded; if a block is too thin to work from, that is a defect in the block, and the fix
is to go back to that one unit rather than to re-read them all.

## 7. Fill the repository contract

`.agents/cg/contract.yaml` is the root of the graph — the first thing every future session reads,
and the node every route starts from. `cg init` ships its `purpose` and
`responsibilities.forbids` with `Replace this sentence` placeholders, and **nothing else fills
them.**
The root is not a discovered implementation module, so module coverage never asks. A warmup that maps forty
modules and leaves this empty has built a graph whose root says nothing about the product.

It is written here rather than in Phase A because only now do you have the answer: every module
has a stated purpose in its parent, and the repository's identity is what those roles add up to.

Write:

- **`purpose`** — what this repository builds, in the words its own team would use; its
  stable technical identity (package root, module prefix, configuration prefix); its request or
  pipeline shape; and each top-level module named with the one thing the product uses it for.
  A newcomer should be able to route from this paragraph alone.
- **`responsibilities.forbids`** — the exclusions, which do more work than the inclusions. State
  what this repository will not become, so an agent proposing one recognises it as out of bounds.
  Take these from what the code refuses to do: a boundary every module respects, a dependency
  nothing declares, a store nothing writes to.

Both come from evidence, not aspiration — the same rule as §4. If the repository genuinely does
not settle a question, say so plainly here rather than inventing a direction for it.

Leave no `Replace this sentence` marker behind in this file. A placeholder at the root of
the graph is the one hole every session pays for.

## 8. Assess structural binding failures

This is the part that must not overclaim.

Run `cg verify` against the global `A` catalog and every scoped `P` rule. Do not assess
engineering.yaml as compliance: it is non-binding decision guidance. For each binding, establish
which of three states it is in **for this repository**:

| State | What it means | Where it goes |
|---|---|---|
| **Enforced** | the registered detector exists and passes | the A catalog or P enforcement row names it |
| **Violated** | the registered detector runs and fails | a corrective Step or an owner-approved exception |
| **Unproven** | the claimed binding has no working detector in this repository | it is not enforced; resolve the false claim below |

Every non-green finding must resolve to exactly one of these, and to nothing else:

1. **A repository-owned detector, written now** — valid for a `P` rule when its enforcement row
   and affected contract references are updated in the same change. A missing `A` detector
   cannot be created by editing installed YAML; record an upgrade or verifier-owner delivery Step.
2. **A proposed exception** — a `DU-NN` entry in `docs/plans/decision-log.md` stating what the
   repository does instead, what that costs, and the one bounded edit that reverses it. Warmup
   proposes; it never accepts. A `A` or `P` binding is protected under `cg-unblock` D-3, so waiving
   one is the owner's call even when the answer looks obvious. An exception nobody wrote down is a
   violation nobody remembers.
3. **A corrective Step** — handed to `cg-plan` or `cg-prepare`, because a fix that changes
   behaviour owes its contract and detector in the same change and is therefore delivery work,
   not warmup work. Undeclared entries, internals on the surface, mixed optional vendor
   clients, or unmanaged scatter with no small inbound surface cite `graph.surface.service`,
   `graph.surface`, or `graph.adapters` here, not silent stay. Scatter becomes a small set of
   services, not a node per file.

**Never produce a compliance score, a percentage, or a grade.** A number computed from readings
implies a measurement that was not taken. State counts instead — how many bindings are enforced,
violated, or unproven — because a count carries its own denominator and a score hides it.

**Do not run this table over `engineering.yaml`.** Its D entries are
non-binding practices. They may inform a finding but make no compliance claim.

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
4. **No existing rule already covers it.** A restatement of an existing A or P rule in local vocabulary makes
   the graph longer without making it stronger.

The strongest source is the one §1 already found: **a detector that enforces no rule.** Somebody
wrote a test to hold a line. The line is the rule; write it down and bind them.

### Which family it goes in

| The rule is… | Family |
|---|---|
| structural advice without complete enforcement | `E` — a non-binding best practice |
| generic structural invariant that could satisfy a deterministic measure, blocking detector, and negative fixture | `A` candidate — route it to the verifier-owning repository; do not assign a local ID |
| true because of *this* product's market, pricing, shape, or tenancy | `P` — the family a brownfield repository has most of and ships with none of |
| a lean between two workable designs | `E` — a non-binding preference, with `cost` when the trade-off is not obvious |

Two errors to avoid, in the order they are tempting:

- **Do not file a product rule as an engineering guideline.** Tenancy is the usual casualty. "Every
  document lives under a tenant path prefix" is a real, testable, load-bearing rule — and it is a
  `P` rule, because a single-tenant repository inheriting it could never satisfy it. The test is
  whether a repository building something else would be *wrong* to adopt it.
- **Do not promote a D practice to A on wording alone.** Promotion requires structural impact,
  a deterministic measure, a blocking detector, and a fail-on-demand fixture.

### What each harvested rule owes

Every `A` candidate records the proposed invariant, deterministic measure, blocking detector,
and negative fixture, then becomes delivery work in the repository that owns the verifier. Only
that verifier-owning change assigns the next permanent ID in `principles/architecture.yaml` and removes an
equivalent D practice. Every `P` rule needs exactly one repository `.agents/cg/enforcement.yaml`
row and is listed in the affected contracts' `rules` arrays. A detector recipe without working enforcement is
not a binding.

### When a harvested rule contradicts a binding

Common, and it is *information*. The code was built to a rule an existing A or P binding
contradicts, and one of the two is wrong. Never resolve it yourself and never quietly drop the harvested
rule — raise a `DU-NN` naming both rules, the code that follows the harvested one, and the cost of
moving either way. Same `D-3` floor as §10: a `A` or `P` binding is not yours to waive, and neither
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
| a module root a build manifest identified | proceed; record an assumption | reversible by removing its contract edge and file |
| a boundary with no manifest behind it — a package tree, a shared directory | **`DU-NN`** | wrong here makes several contracts wrong, and no default is safe |
| which rules bind a module | proceed, including the rule when unsure | §5 — the broad scope is the visible error |
| an exception to a `A` or `P` binding | **`DU-NN`, always** | a binding is protected; it is never yours to waive quietly |
| a contract section you could not determine | marker, plus **`DU-NN`** when the boundary is material | otherwise the marker is the record |

Reversible choices go in the plan's assumption ledger, one line each:

```markdown
- A1 <decision taken> — reverse by: <one bounded edit>
```

If the reverse clause will not fit in one clause, it was not reversible — make it a `DU-NN`.

Owner questions go in `docs/plans/decision-log.md` under *Pending your review*, using
[the decision entry template](../cg-unblock/assets/decision-entry.template.md). Keep each as its
own stable `DU-NN` entry, and never renumber one. Do not copy that shape, this section, or
promotion rules into the ledger file.

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
- rules carried forward: <n> — <as principles, contract invariants, or enforcement.yaml rows>
- rules deliberately dropped: <n> — <each with its reason>
- detectors that lost their rule: <n> — <each test, and the rule ID that no longer resolves>
- still enforced by it and not yet by this graph: <n> — <which, and the DU-NN that decides them>

## Modules
- discovered: <n> — <how: build file, ownership boundary>
- governed by connected contracts: <n>
- excluded: <n> — <each with its reason>

## Contracts
- written: <n> — <n> module, <n> sub-module
- deepest path from the repository contract to a leaf: <n> levels
- declaring `composition: "leaf"`: <n>
- carrying unresolved `Replace this sentence` markers: <n> — <which>

## Bindings
- enforced (detector exists and passes): <n>
- violated (detector runs and fails): <n>
- unproven (no working detector): <n>

## Harvested rules and structural candidates — please confirm
Harvested from the code (§9). Repository-owned `P` rules listed here are written, scoped, and
green; `E` entries are explicitly advisory. Generic structural findings remain `A` candidates
until a verifier-owning delivery change registers their detectors and assigns permanent IDs.

| ID | Rule | Why it is that family | Evidence in the code | Detector |
|---|---|---|---|---|
| <Pnn-nn / Enn-nn / A candidate> | <the rule, stated in full> | <product-specific / advisory / generic structural> | <the files that prove it> | <working detector, `advisory`, or proposed detector> |

- contradicting a binding: <n> — <each is a `DU-NN`, listed under *Waiting on you*>
- **To delete one:** remove a P rule from `.agents/cg/guidelines/product.yaml`, its enforcement row, and affected
  contract references. Amend an A rule only with its detector and negative fixture in the same change.

## Findings
- detectors written now: <n>
- exceptions proposed with their cost: <n>
- corrective Steps handed to planning: <n>

## Waiting on you
- `DU-NN` entries under *Pending your review*: <n>
- assumptions recorded and proceeding: <n>

## Gate
<the exact `cg verify` output, and `cg modules`>
```

**Waiting on you** is the section to read first — the whole ask, in one place, and nothing in it
stopped the rest of the work. The bindings section is the honest one: if rules are
`unproven` rather than `enforced`, say so plainly. That is the true state of a repository at
adoption, and pretending otherwise makes the first real violation a surprise, not a caught defect.

**Harvested rules and structural candidates is the section to read second.** What the owner is
confirming is which repository-owned `P` rules and advisory `E` practices to keep, and which
generic candidates to propose to the verifier owner. Present the whole set at once, never one at a
time. Never describe a candidate as binding before its detector is registered.

## 12. Dispose of your own working files

Every other Contract Graph artifact has somewhere to end up: a roadmap and a Step queue are
archived when their phase closes, a decision graduates or is dropped with its reason. Warmup's
outputs had nowhere, because warmup belongs to no phase — it runs once, before the lifecycle
exists, so there is no closing event to attach disposal to. This step is that event.

The three files warmup writes have different half-lives, and treating them alike is what leaves a
repository with permanent adoption litter:

| File | What it is | Where it ends up |
|---|---|---|
| `docs/plans/warmup-findings.md` | a **resume log** — Phase B appends a block per unit so a context break continues instead of restarting | **Delete it.** Once every governed unit has a connected contract and the rules are harvested, it has nothing left to resume. Its content is already in the contracts it produced. |
| `docs/plans/warmup-corrective-set.md` | findings that must become work | **Consumed, then archived.** It drains when `cg-plan` gives every finding a phase; move it to `docs/plans/archive/` at that point, not before. |
| `docs/plans/warmup-report.md` | what adoption found, at a point in time | **`docs/decisions/`, or delete.** If it is worth keeping it is durable knowledge, and durable knowledge does not live under `docs/plans/` — a permanent contract may not cite a path there. Keep it only if a reader would return to it; archive or delete it otherwise. |

Do this before the next-action response, and say in that response what happened to each file. A run
that reports `Warmup complete` while all three survive has not finished — it has stopped.

**Delete rather than archive when a file has no reader.** `archive/` is for records someone may
audit; it is not a place to move things to avoid deciding. A resume log nobody will read is not
made valuable by relocating it.

The one exception: if warmup is **interrupted**, leave all three exactly where they are. They are
the resume point. Disposal is part of finishing, and only of finishing.

## 12a. Next-action response

Choose exactly one immediate route:

- contracts written, gate green, and questions logged: point the owner at the `DU-NN` set and name
  `cg-unblock` to apply the answers when they come;
- contracts written and nothing is pending: use `cg-plan` with the first real piece of work;
- findings need delivery: use `cg-plan` with the corrective set;
- no discoverable modules at all: stop and ask, naming what was searched for;
- warmup is complete and no work is queued: name no next skill, and say the skill is not run
  again.

End the user-facing response with:

```markdown
## Next action — <Warmup complete | Answers pending | Findings need delivery>
- **User action:** <one concrete action — when answers are pending, "answer the N entries under *Pending your review*"; always say what happened to warmup-findings, warmup-corrective-set, and warmup-report>
- **Next input:** <$cg-plan | $cg-unblock | None — warmup complete, this skill is not run again> — <exact decision-log entries, corrective set, or gate evidence>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

## Completion check

- [ ] Each of warmup's three working files was deleted, archived, or moved to `docs/decisions/`, and
      the response says which.
- [ ] A predecessor framework was searched for, and the report says what was found — including
      "none".
- [ ] Every rule the predecessor asserted is carried forward or listed as a deliberate drop.
- [ ] The predecessor's product rules are in the `P` catalog under `guidelines/`, not left to re-accrue.
- [ ] Every predecessor detector whose rule ID no longer resolves is named in the report.
- [ ] Nothing belonging to the predecessor was deleted or executed.
- [ ] `cg modules` exits 0, or every remaining row is excluded with a stated reason.
- [ ] Every unit that went through Phase B has a findings block, including the empty ones.
- [ ] No unit's source was read in Phase C — consolidation used the findings file.
- [ ] Harvested rules were merged across units before being written, not repeated per unit.
- [ ] Every module root is governed by a contract or excluded with a stated reason.
- [ ] Every governed boundary has one `contract.yaml` describing code that exists.
- [ ] `.agents/cg/contract.yaml` has `purpose` and `responsibilities.forbids` written from
      evidence — no `Replace this sentence` marker remains at the root of the graph.
- [ ] Every contract states `purpose` and a reciprocal parent edge — the context that lets an
      agent route without reading the code underneath.
- [ ] Every contract declares `composition: "composed"` with children or `"leaf"` without them.
- [ ] Every child contract is declared by its parent; none is reachable only by file search.
- [ ] No contract cites a plan path or a ticket as the source of a rule.
- [ ] Every `responsibilities.forbids` value says something.
- [ ] Contract `rules` contains only applicable P rules; global A rules are not duplicated.
- [ ] Contract `routes.when` phrases use the words requests arrive in.
- [ ] Every finding is a detector, a recorded exception, or a corrective Step.
- [ ] The rules the code already enforces are recorded in the correct binding, practice, or
      candidate destination rather than left implicit in the code.
- [ ] Every harvested item is in the right destination: D practice, A candidate, or
      repository-specific P rule.
- [ ] Every harvested A candidate has a proposed measure, detector, and negative fixture and is
      routed to verifier-owner delivery; every P rule has one enforcement row and is bound in each
      affected contract.
- [ ] Every harvested rule contradicting a binding is a `DU-NN`, not a silent choice.
- [ ] The harvested set is listed in the report for the owner to confirm, in one place.
- [ ] Every open question is a `DU-NN` entry or a recorded assumption — none was asked in chat.
- [ ] Every unresolved `Replace this sentence` marker has a decision-log entry behind it.
- [ ] Pending questions were presented once, as a consolidated set.
- [ ] No logged question stopped work that was not actually blocked by it.
- [ ] No score, percentage, or grade appears anywhere in the report.
- [ ] No behaviour was changed by this skill.
- [ ] `cg sync && cg verify` is green, and the report states real coverage.
- [ ] The response ends with one exact next action and skill.

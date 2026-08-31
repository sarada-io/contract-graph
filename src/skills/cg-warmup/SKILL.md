---
name: cg-warmup
description: Adopt Contract Graph into a repository that already has code, or reseed an existing graph after a package upgrade. After cg init. Adoption is four phases — a whole-repository survey, a resumable per-module loop that writes and connects each unit's contract.yaml, a recursive leaf audit for component contracts, then one consolidation. Reseed walks governed leaves additively — new child contracts, new P rows, route targets — and never overwrites existing purpose or P IDs. Finds any predecessor governance framework on adoption and carries its rules forward rather than writing over them. Resumes from cg modules after a context break rather than restarting. Never reports a compliance score, edits behaviour, deletes or runs the predecessor, or marks a rule enforced that no detector proves.
---

# CG Warmup

A fresh `cg init` describes a repository that does not exist yet. Warmup replaces that
description with the one you actually have. A brownfield typically has no existing Contract Graph contracts.
Write the graph from the code and §2a. Predecessor markdown, if found, is a checklist against the
tree — not a graph to copy. After adoption, `cg-plan`, `cg-prepare`, `cg-produce`, and `cg-sign-off`
have real contracts to work against. An already-governed tree uses **Reseed** instead: the graph
on disk is the baseline, not a predecessor.

**Never delete this skill.** `cg verify` requires all seven skills, and a later module tree still
needs these instructions. Auto-run never dispatches it.

Warmup declares and mechanically protects an existing cohesive declared surface before proposing
restructuring. Protect the named surface first; propose a split or merge only once that surface is
named. It must not add wrapper types or move code solely to impose a source-layout convention.
If the existing surface mixes distinct responsibilities, cannot be mechanically confined, exposes
internals (`graph.surface.encapsulate`), mixes optional vendor clients (`graph.adapters`), or has
no small inbound surface, that is a restructure finding: write it into the corrective set for
`cg-plan`. The owner validates that programme. Warmup does not rewrite the code.

`graph.surface.service` is the inbound categorisation: a small set of services, not a node per
file. If the service types exist, declare them. If they do not, record a corrective Step to
introduce them. Folder wrappers to impose layout are forbidden.

Read `.agents/skills/cg-unblock/SKILL.md` only when a fork fails D-1: unresolvable from contracts
and accepted decisions, material, costly to reverse, and nothing else can proceed.

## Which entry — read this before §1

**Confirm the installed binding can recurse.** Run `cg verify`. If it fails because
`.agents/cg/principles/architecture.yaml` is missing `hierarchy.kinds` or `graph.recurse`, the
catalog is older than this skill (`cg init` preserves catalogs). Stop. Ask the owner to copy the
packaged binding or confirm a deliberate amendment. Do not write nodes against a catalog that
cannot recurse.

Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with `cg residue`.
Then run:

```bash
cg modules
```

| `cg modules` | Mode |
|---|---|
| any **UNMAPPED** or **DESCEND** | **Adoption / resume** — How this skill runs, then §1 |
| exit 0, all governed | **Reseed** — additive; skip §1–§3 and template copy |

The contracts already on disk are the baseline, not a predecessor. Predecessor search (§1) runs
on adoption only; `cg-*` stays excluded. Consecutive reseed with unchanged cues is a no-op.

## Reseed — additive, when every root is governed

Skip Phase A. Do not copy a template onto an existing `contract.yaml`. Do not blank `purpose`,
`forbids`, or existing P IDs. Walk the **installed** `graph.*` and
[the code-inspection catalog](assets/warmup.yaml), not the packaged architecture catalog.

1. Re-walk every leaf with the Phase D table. `add-child` and a separable package already exists:
   write the child from the component template; recurse. Never overwrite an existing contract.
2. `add-child` that would move code: append a **Restructure:** row to
   `<docs>/plans/warmup-corrective-set.md`. Do not wipe an in-flight `cg-plan` tree.
3. After each new child: `cg sync`, `cg verify`. Rewrite parent and root `routes` by **adding**
   the child path to routes whose `when` already names that surface. Do not delete existing
   `when` phrases or contract paths.
4. Harvest with §9, additively. New product rules get the next unused `Pnn-nn` and an
   `enforcement.yaml` row (`unproven — <violation>` when no detector). Skip when an existing P
   already covers the constraint. Never renumber P IDs. Fill root `purpose` / `forbids` only if
   they still contain `Replace this sentence`.
5. Write `<docs>/plans/warmup-reseed-delta.md` listing added contracts, added P IDs, amended
   routes, and skipped-because-already-covered items. If nothing is missing: say so, **write no
   file**, stop.
6. `cg verify`. End with §12a, naming the delta or that it was empty.

## How this skill runs — adoption / resume

**This is not a linear procedure. It is a survey, a loop, a leaf audit, and a consolidation.**

```text
Phase A — once      §1–§3    predecessor · module roots · code-first context · root routes
Phase B — per unit  §4–§6    ←──┐  contract · descend · connect · bind · record
                               └──┘  repeat until `cg modules` exits 0
Phase D — once      §6a      recursive leaf audit · write existing components · else corrective
Phase C — once      §7–§12   root contract · assess · harvest · decisions · report
```

Phase B is one unit at a time. Write its `contract.yaml`, reciprocal edges, applicable `P` rules,
and one block in `<docs>/plans/warmup-findings.md`. Nothing is held between modules.

**If you are resuming after a context break, you are not starting over.** Run `cg modules`:

- **UNMAPPED** — this unit has not been through Phase B. Enter §4 for it.
- **DESCEND** — a contract exists, but `graph.recurse` is unfinished (undeclared packages, no
  `Leaf rationale`). Re-enter §4 at *Descend with the binding graph*.
- **governed** with no DESCEND row — finished for adoption. Do not revisit it on this entry.
  Reseed is the other entry, when every row is already governed.

Read the tail of `<docs>/plans/warmup-findings.md` for earlier notes. Phase A does not run again
on resume.

Read [the code-inspection catalog](assets/warmup.yaml) before Phase B and again at §9. Those cues
are how harvest and descent inspect the tree. They are not E, not P, and not A.

Phase C runs exactly once per adoption, after Phase D, when the leaf audit has either written
existing children or recorded the convoluted splits. Harvesting cannot happen inside the loop:
the same rule surfaces in several modules and must be written once.

## Required outcome

Finish with all fourteen true:

1. Any predecessor governance framework is found, read, and carried forward or logged — never
   silently replaced.
2. Every real module root is discovered and either mapped or explicitly excluded with a reason.
3. Every governed boundary has exactly one `.agents/cg/contract.yaml` describing the code that is
   there — not an aspiration — and every non-leaf declares its children. `graph.recurse` has been
   applied inside each module. Phase D re-walked every leaf: a component the code already has is
   a child contract now; a component that would require a convoluted split is a corrective-set row.
4. The global `A` catalog passes, and each contract's `rules` array names only additional
   repository-owned `P` bindings that apply to that boundary.
5. Contract-owned `routes` match task language to the contracts a request must load.
6. Every unit that went through the loop left a findings block behind.
7. The repository contract states what this product is and is not — no placeholder at the root.
8. Composition is assessed by applying `graph` in Phase B. A row enters
   `<docs>/plans/warmup-corrective-set.md` only when that walk requires a shape the code does not
   yet have. Each row names the architecture target and applicable `E` guidance. `cg-plan` turns
   the set into a programme the owner validates before any code moves.
9. Every binding failure lands as a detector repair, a proposed exception, or a corrective Step.
10. Rules the code already enforces are consolidated, classified as P, `E`, A candidates, or fork
    guidance, and listed for the owner to confirm.
11. Every open question is a decision-log entry or a recorded assumption — none was asked in chat.
12. The report states coverage and the limits of its own evidence.
13. The response ends with the `Next action` block in §12a.

## 1. Look for the framework that came before

**Do this first, before writing a single contract.** Search the working tree only. Do not recover
a deleted principles file, contract, or decision log from version control.

| Where to look | What you are looking for |
|---|---|
| `.agents/`, `.claude/`, `.cursor/`, `.github/` | skill or instruction sets other than `cg-*` |
| repository root, `docs*/` | `CONTRIBUTING`, architecture-decision records, a principles or conventions file |
| `scripts/`, `tools/`, `bin/` | governance verifiers — anything that reads a contract or principles file |
| the build file | tasks wired into `check`, `test`, or `lint` that run those verifiers |
| any second decision log | a populated ledger under a different path than `<docs>/plans/decision-log.md` |

Most identifiers in a codebase are work items, not rules, and chasing them wastes the run:

| The sentence says | It is | What to do |
|---|---|---|
| *per* X · X *forbids* · *violates* X · *waived under* X · *enforced by* X | a **rule** | a predecessor signal — follow it |
| *scheduled in* X · *deferred to* X · *delivered in* X · X *closed it* · *pending* X | a **work item** | not a predecessor; stop digging |

The ID is not the finding. The sentence around it may still name a real constraint. Take the
constraint, verify it against the code, and drop the identifier.

When you find a predecessor:

- **Read its rules before writing yours.** Every rule it asserted is reproduced in the new graph
  or it is a deliberate drop.
- **Carry a predecessor product rule only when the code still obeys it.**
  `.agents/cg/guidelines/product.yaml` ships empty. Copy each rule the tree still holds, restate
  it in full, and give it a row in `.agents/cg/enforcement.yaml` naming the detector that already
  proves it. A predecessor `product.md` is a checklist against the code, not the source of §2a.
- **A detector that loses its rule is the highest-severity finding here.** List every one in the
  report even when the rule is carried forward.
- **Record the comparison** under *Predecessor* (§11): rules carried forward, rules dropped and
  why, and anything the old framework enforced that the new one does not yet.
- **Never delete it, and never run it.** Retiring it is a `DU-NN`.

If you find nothing, say "No predecessor framework found" in the report.

## 2. Discover the module roots

```bash
cg modules
```

It prints every detected root, whether a contract already governs it, and exits **1** while any is
unmapped — that is also the gate that this skill is finished.

Detection is a heuristic. Read the build yourself where the answer looks wrong.

| Ecosystem | The file that decides |
|---|---|
| Go | `go.mod` (and each nested one in a multi-module repo) |
| Node | `package.json`, plus `workspaces` / `pnpm-workspace.yaml` |
| JVM | `settings.gradle(.kts)` includes, or Maven `<modules>` |
| Python | `pyproject.toml`, `setup.cfg` |
| .NET | `*.sln` project references, `*.csproj` |
| Rust | `Cargo.toml` `[workspace] members` |

Where no build file draws the line, fall back to the deployment or ownership boundary and say so
in the report. A root reported as `.` is the repository itself: in a monorepo map what is inside
it. Exclude vendored, generated, build output, and fixtures with a stated reason.

Do not stop and ask the owner to confirm the list. Proceed on the roots a manifest identified,
recording that as an assumption, and raise only the genuinely ambiguous ones — §10.

## 2a. Snapshot the product from the code

Module roots tell you where the build cuts. They do not tell you what the product is. Write the
answers into `<docs>/plans/warmup-findings.md` now, then into the root contract in §7 and the
harvest in §9.

| Question | What to read | Where it lands |
|---|---|---|
| SaaS, enterprise install, or consumer app | tenancy in signatures and paths; billing/metering types | root `purpose` / `forbids`; `P` if the market shape forbids a different product |
| Monolith, mini-monolith, or microservices | `cg modules`, entry points, how many artifacts CI ships | root composition; describe what is there |
| Named domain model or scattered types | ports vs DTOs that leak persistence or vendor types | `graph.surface.encapsulate`; a missing model is a corrective Step |
| API/services first, classic web, mobile, or desktop | launchers, HTTP surfaces, mobile/desktop projects | root `routes` `when` phrases; surface `kind` |
| Defined CI/CD | workflows that must pass to merge | `verification` commands; absence is a finding |
| Defined security policy | authorization chokepoints, secret handling | `P` when product-specific; `E` when advisory |
| Composition healthy, or restructure required | `graph.recurse`, `graph.surface`, `graph.adapters` against the packages you opened | stay if the surface is cohesive; otherwise a restructure finding — not silent stay, and not a rewrite of behaviour in this skill |

Warmup never edits behaviour. If the snapshot says the composition is wrong, §8 writes
`<docs>/plans/warmup-corrective-set.md` and `cg-plan` turns it into a programme the owner
validates before any move.

## 3. Sketch the root routes

The repository contract's `routes` array is the first task-to-contract edge. Add one route per
capability, surface, or subsystem. Each route owns a stable `id`, phrases under `when`, and one or
more canonical contract paths under `contracts`.

Write `when` phrases in the words a request arrives in — "checkout fails at payment", not
"PaymentServiceImpl". Use `cg contract route --task "<request>"` to exercise them. Sketch now from
the module list. When Phase B or D writes a child, rewrite the parent and any root route whose
`when` names that surface so the child contract is on the route. Empty `routes` on a composed
node with named inbound children is a miss.

---

# Phase B — repeat §4–§6 for one unit at a time

Pick the first row `cg modules` still reports `UNMAPPED`, or if none, the first `DESCEND`. Run §4,
§5, and §6 for **that unit only**, then run `cg modules` again and pick the next. Do not batch.
When `cg modules` exits 0, go to Phase D, not Phase C.

**Binding authority.** Read `.agents/cg/principles/architecture.yaml` before writing a node.
`hierarchy.kinds` is the recursive mapping. `graph` is the node decision (recurse, selfSufficient,
surface, stay, add-child, elsewhere, compose, stop, forbid, adapters). A self-sufficient unit
earns a child node; `cg modules` listing a module is not a leaf. Do not consult
`.agents/cg/guidelines/engineering.yaml` to decide whether a folder is a contract, or to add a
finding `graph` did not produce.

**Restructure proposal.** When a finding exists, both catalogs guide the programme you hand to
`cg-plan`. `architecture.yaml` is the target shape (`hierarchy`, `graph.surface`, `graph.adapters`).
`engineering.yaml` is remaining design judgement for that move. Cite each applicable `E` id with
its `reason`. If a practice has a real cost, name the cost. `E` does not override `graph`, does
not appear in `rules`, and does not become a compliance row.

## 4. Write this unit's contract

Copy [the YAML contract template](assets/contract.template.yaml) to
`<unit>/.agents/cg/contract.yaml` **only when this unit has no contract.yaml** (UNMAPPED). Never
overwrite an existing file. Keep the schema's field names and replace every instructional value.
The YAML file is the contract. CommonMark is allowed inside descriptive string values.

Read this unit's code once, and write everything you learn from it before moving on.

**Never generate contracts mechanically.** Not with a script, not by substituting a module name
into one shared body, not by writing several at once from a list of directory names. The tell:
you are about to write the same sentence into a second contract. If a sentence is true of the next
module too, it belongs in the repository contract (§7) or nowhere.

Four fields carry the routing weight:

- **`purpose`** — why the parent contains this unit, how the parent uses it, and who enters it.
- **`relations.parent`** — the edge back up, including the delegated responsibility under `uses`.
- **`relations.children`** — the edges down. A smallest owned boundary uses `composition: "leaf"`
  and an empty child array; a parent uses `"composed"` and at least one child.
- **`routes`** — task phrases to the smallest contracts a request must load. After `add-child`,
  rewrite this unit's routes and any root route whose `when` names the child.

Then: `responsibilities.owns/allows/forbids`, a language-native `surface`, `invariants`,
executable `verification`, and lateral `relations.dependencies`. A constraint the
implementation already refuses belongs in `invariants` and `forbids` even when no test
exists; absence of a detector is not absence of the constraint.

### Descend with the binding graph

Apply `.agents/cg/principles/architecture.yaml` `graph.recurse` and `graph.selfSufficient` to every
candidate inside this unit. Walk the `family: descent` cues in
[the code-inspection catalog](assets/warmup.yaml) before writing Leaf rationale. Cite those fields. `hierarchy.kinds` names the child's kind;
`hierarchy.transitions` constrains it. `graph.stop` is when to become a leaf; `graph.forbid` is
what never counts as a node. Depth is not capped: a two-level module leaf and a five-kind nest
can coexist. Apply `selfSufficient` at this node.

`cg modules DESCEND` waits until three undeclared package branches; two self-sufficient packages
still take `add-child`. If several packages form one boundary, `graph.stop` requires a
`Leaf rationale:` assumption that names them and says why they are inseparable.

`graph.surface` is declared entry and encapsulation. Enter only through the contract surface.
`graph.surface.service` is the first way to declare it: list the named services; `contract.yaml`
`surface` points at those types. An undeclared entry or a bypass is a corrective Step, not stay.

If this unit is many functions across unmanaged files with no small inbound surface, do not create
a node per file. Categorise the work into a small set of services. Declare them when the types
exist; otherwise §8 a corrective Step to introduce them.

`graph.adapters` is the vendor split of `graph.surface.encapsulate`. An optional external resource
is a parent-owned port; each concrete option is `add-child`, not `stay`. Two vendor clients in one
unit is a corrective Step.

The corrective set is driven by that walk, not by `cg verify` and not by preference. For every
candidate, take exactly one row:

| `graph` result | Code already has that shape | What warmup does |
|---|---|---|
| `stay` — cohesive surface, services exist, one vendor (or none) | yes | write the contract; **Restructure:** none |
| `add-child` and the child unit already exists as a separable directory or package | yes | write the child contract now; **Restructure:** none |
| `add-child`, `elsewhere`, introduce services, or split vendor adapters | no — fulfilling it would move or add code | write the contract for the mixed unit that exists; **Restructure:** finding |
| a nicer folder layout, a new wrapper type, or `graph.forbid` | — | not a finding |

A **Restructure:** finding is the only input to the corrective set. Phase C merges those rows; it
does not invent new ones. When the row is a finding, load `engineering.yaml` before leaving the
unit and record the applicable `E` ids on it. That is proposal shape, not a second membership test.

Use [the component contract template](assets/component-contract.template.yaml) when `add-child`
selects a component or library, and add reciprocal edges. `cg verify` rejects a dangling,
one-sided, cyclic, or root-unreachable edge.

- **Describe what is true, not what you wish were true.** A contract that states the boundary you
  intend is a plan, and plans belong in `<docs>/plans/`. If the code violates the boundary you
  want, write the boundary that exists and open a finding under §8.
- **State it in full.** A contract may never cite a plan path or a ticket as the source of a rule.

Leave a string beginning `Replace this sentence` only where you genuinely could not determine the
answer. Each one is a question for §10.

## 5. Bind and verify this unit

The structural `A` catalog applies globally and is never copied into contract `rules`. That array
is reserved for additional repository-owned `P` bindings. Add applicable `P` IDs directly. Do not
copy rule text into the contract; `cg contract context --id <id>` resolves A and P together.
**When unsure whether a rule binds a module, include it.** `E` entries never appear in `rules`.

Run `cg sync`, then `cg contract verify`, then `cg verify`, **before moving to the next unit**.
`cg sync` writes workspace-root pointers only for `kind: module`, and only the filenames the
selected profiles own (`AGENTS.md` and/or `CLAUDE.md`, matching `.agents/cg/profile.json`). Do
not create the unselected name by hand, and do not copy either file onto a leaf, component, or
submodule. If a later `cg init` adds a profile, `cg sync` copies an existing module pointer to
the new filename.

A verification command that only proves a path exists (`test -f`, `test -d`, `[ -f`) is not
verification. Name the test or build that exercises the invariant. If the unit has no such
command yet, that is a §8 finding.

Then re-run `cg modules`. A parent contract may govern nested build modules only when they
genuinely share one responsibility.

## 6. Record what this unit taught you, then forget it

Append one block to `<docs>/plans/warmup-findings.md`:

```markdown
### <unit path>
- **Rule candidates:** <constraints the code obeys that no principle states — §9 decides the
  family; here record what you saw and the files that show it>
- **Rule observations:** <A failures, applicable P rules, or `E` practices this unit bears on>
- **Detectors found:** <tests in this unit that guard a boundary, and the rule ID they cite if any>
- **Open questions:** <boundaries you could not settle — §10 turns these into `DU-NN` entries>
- **Routing correction:** <a root or parent `routes` entry this unit showed to be wrong, already fixed>
- **Restructure:** none | finding — <graph result>; E: <applicable ids or none>
```

Every field may be `none`. An empty block is still written. Then drop the unit's code from your
working set and select the next one. Phase D then Phase C read this file, not your memory.

---

# Phase D — once, after modules are governed, before harvest

A module contract is not the smallest change surface. The product is a later session locating
one responsibility without opening the whole module. After `cg modules` exits 0, re-walk every
leaf. Phase B's Leaf rationale does not skip this.

If you are resuming and `cg modules` exits 0 but `<docs>/plans/warmup-findings.md` has no
`### Phase D` block, you are here. Do not start Phase C.

For each leaf, in unit-path order, then for each child you write, recursively:

1. Count implementation lines under the unit. Skip test trees, generated output, and vendored
   code. **2,000–5,000 lines is a reading budget, not a split rule.** `graph.forbid` says size
   is not evidence a node is required. Below ~2,000, still apply the descent cues when a named
   inbound surface exists. Above ~5,000, look harder — do not stop because Phase B already
   called it a leaf.
2. Walk the `family: descent` cues in [the code-inspection catalog](assets/warmup.yaml) and
   `graph.selfSufficient` / `graph.stop`.
3. Take exactly one outcome:

| `graph` result | Code already has that shape | What Phase D does |
|---|---|---|
| `add-child` and a separable directory or package already exists | yes | write the child contract now; recurse into it |
| `add-child` but fulfilling it would move code, invent types, or tangle the shared seam | no | keep the leaf; **Restructure:** finding in the corrective set |
| `stay` / `graph.stop` | — | keep or tighten Leaf rationale; name the packages and why they are inseparable |

More contracts help only when each owns one responsibility. A node per file, per controller, or
per `utils` folder is still `graph.forbid`. A types-only package whose callers enter through
parent ports is `graph.stop` on the parent, not `add-child`. After writing children, rewrite
parent and root `routes` so `when` phrases load the child contracts.

Run `cg sync`, then `cg verify`, after each newly written child. Re-run `cg modules`. Then append:

```markdown
### Phase D
- **Audited leaves:** <unit paths>
- **Children written now:** <unit paths or none>
- **Corrective (convoluted split):** <unit paths or none>
```

Then go to Phase C.

---

# Phase C — once, after Phase D

§7–§12 run one time over the whole repository. Their input is
`<docs>/plans/warmup-findings.md` plus the connected contracts now on disk. **Read that file
first.** Do not re-open module source to reconstruct what the loop already recorded.

## 7. Fill the repository contract

`.agents/cg/contract.yaml` is the root of the graph. `cg init` ships its `purpose` and
`responsibilities.forbids` with `Replace this sentence` placeholders, and **nothing else fills
them.** Leave no `Replace this sentence` marker behind in this file.

Write:

- **`purpose`** — what this repository builds; its stable technical identity; its request or
  pipeline shape; and each top-level module named with the one thing the product uses it for.
- **`responsibilities.forbids`** — what this repository will not become, taken from what the code
  refuses to do.

Both come from evidence, not aspiration. If the repository does not settle a question, say so
plainly rather than inventing a direction.

## 8. Assess structural binding failures

Run `cg verify` against the global `A` catalog and every scoped `P` rule. Do not assess
`engineering.yaml` as compliance. For each binding, establish which of three states it is in:

| State | What it means | Where it goes |
|---|---|---|
| **Enforced** | the registered detector exists and passes | the A catalog or P enforcement row names it |
| **Violated** | the registered detector runs and fails | a detector repair, a `DU-NN` exception, or — if the fix changes code — a corrective-set row |
| **Unproven** | the claimed binding has no working detector in this repository | it is not enforced |

Every non-green *binding* finding must resolve to a detector written now, a proposed `DU-NN`
exception, or a code-changing row in the corrective set. Warmup proposes exceptions; it never
accepts. An `A` or `P` binding is protected under `cg-unblock` D-3. A missing `A` detector cannot
be created by editing installed YAML.

Separately, consolidate every Phase B **Restructure:** finding that is not `none` into
`<docs>/plans/warmup-corrective-set.md`. Those rows are driven by the §4 graph walk. `cg verify`
cannot see mixed vendors, missing services, or undeclared children that the walk already named.
Do not add a row because a layout looks untidy. Do not omit a row because the contract already
describes the mess.

When the set is non-empty, write it before Phase C ends. That file is the input `cg-plan` uses so
the owner can validate the restructure programme. Load both catalogs when writing each row:
`.agents/cg/principles/architecture.yaml` for the target node shape, and
`.agents/cg/guidelines/engineering.yaml` for remaining practices that apply to the move. Do not
start moving code.

```markdown
# Warmup corrective set
Status: Unconsumed

## <finding>
- **Evidence:** <unit, packages, surface, or vendor mix actually opened>
- **Graph decision:** <add-child | elsewhere | introduce services | split vendor adapters>
- **Architecture target:** <hierarchy kind and graph.surface / graph.adapters keys that define the destination>
- **Engineering guidance:** <E ids that apply to this move, each with reason; none if graph already specifies the outcome>
- **Proposed programme outcome:** <the observable structure after the move>
- **Why warmup cannot fix it:** behaviour would change; owner must validate the plan first
```

**Never produce a compliance score, a percentage, or a grade.** State counts: enforced, violated,
unproven. **Warmup never edits behaviour.** The moment a finding requires a code change, it is
delivery work for `cg-plan` → `cg-prepare` → `cg-produce` after the owner accepts the programme.

## 9. Harvest the rules the code already enforces

Phase B recorded *Rule candidates* for every unit. **Consolidate before you write.** Merge the
same constraint into one rule at the scope that is actually true, and bind it to every unit it
governs. Walk the `family: harvest` and `family: bind` cues in
[the code-inspection catalog](assets/warmup.yaml) before you close the catalog. A detector that
still runs in the build with no P row is a miss.

### What qualifies

A candidate is a rule only when all four hold:

1. **It constrains, rather than describes.** "Nothing outside `data/` opens a database connection"
   is a rule.
2. **The code obeys it today**, and you can name the files that prove it.
3. **A violation would be a defect**, not a preference.
4. **No existing rule already covers it.**

The four tests qualify a **constraint**. They do not require a test file. Named ceilings,
single-seam types, startup validators, throwing constructors, config defaults, and scheduled
jobs count when you can name the implementing files. Vision prose with no implementing code
does not.

A product-specific constraint the code already obeys is **P**. Write it in
`.agents/cg/guidelines/product.yaml` and list it on every contract it governs. The strongest
source is a detector that enforces no rule — the line is the rule; write it down and bind
them. A working detector is the enforcement row and the rule is enforced. Without a detector,
the enforcement row is `unproven — <the observable violation>` and the rule is not enforced.
Still write the P id. Do not skip the catalog because the repository has no architecture-test
suite.

### Which family it goes in

| The rule is… | Family |
|---|---|
| structural advice without complete enforcement | `E` — a non-binding best practice |
| generic structural invariant that could satisfy a deterministic measure, blocking detector, and negative fixture | `A` candidate — route it to the verifier-owning repository; do not assign a local ID |
| true because of *this* product's market, pricing, shape, or tenancy | `P` |
| a lean between two workable designs | `E` — a non-binding preference, with `cost` when the trade-off is not obvious |

- **Do not file a product rule as an engineering guideline.** The test is whether a repository
  building something else would be *wrong* to adopt it.
- **Do not promote an `E` practice to A on wording alone.** Promotion requires structural impact,
  a deterministic measure, a blocking detector, and a fail-on-demand fixture.

### What each harvested rule owes

Every `A` candidate records the proposed invariant, deterministic measure, blocking detector,
and negative fixture, then becomes delivery work in the repository that owns the verifier. Every `P` rule needs exactly one repository `.agents/cg/enforcement.yaml` row and is listed in the
affected contracts' `rules` arrays. A detector recipe without working enforcement is not a binding.

### When a harvested rule contradicts a binding

Never resolve it yourself and never quietly drop the harvested rule — raise a `DU-NN` naming both
rules, the code that follows the harvested one, and the cost of moving either way.

### Keep it proportionate

Harvest what would change what an agent does. A repository yields a handful to a few dozen. Every
harvested rule is listed for confirmation in §11.

## 10. Raise what needs the owner — in the log, not in chat

Warmup does not interview you. Decide from the code, log what it cannot decide, and hand one
consolidated set at the end.

| Question | Route |
|---|---|
| a module root a build manifest identified | proceed; record an assumption |
| a boundary with no manifest behind it | **`DU-NN`** |
| which rules bind a module | proceed, including the rule when unsure |
| an exception to an `A` or `P` binding | **`DU-NN`, always** |
| a contract section you could not determine | marker, plus **`DU-NN`** when the boundary is material |

Reversible choices go in the plan's assumption ledger:

```markdown
- A1 <decision taken> — reverse by: <one bounded edit>
```

If the reverse clause will not fit in one clause, it was not reversible — make it a `DU-NN`.

Owner questions go in `<docs>/plans/decision-log.md` under *Pending your review*, using
[the decision entry template](../cg-unblock/assets/decision-entry.template.md). Keep each as its
own stable `DU-NN` entry, and never renumber one.

A logged question never pauses unrelated work. Present the set once, at the end. Stop and ask in
chat only if nothing else can proceed — which, for warmup, means the repository has no
discoverable modules at all.

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

**Waiting on you** is the section to read first. **Harvested rules and structural candidates is
the section to read second.** Present the whole set at once. Never describe a candidate as binding before its detector is registered.

Write the report to `<docs>/plans/warmup-report.md`.

## 12. Dispose of your own working files

Do this before the next-action response, and say what happened to each file. If warmup is
**interrupted**, leave all three where they are.

| File | What it is | Where it ends up |
|---|---|---|
| `<docs>/plans/warmup-findings.md` | resume log | **Delete it** once every governed unit has a connected contract and the rules are harvested |
| `<docs>/plans/warmup-corrective-set.md` | findings that must become work | **Consumed, then archived** under `<docs>/plans/archive/` when `cg-plan` gives every finding a phase |
| `<docs>/plans/warmup-report.md` | what adoption found | **`<docs>/decisions/`**, or delete. Durable knowledge does not live under `<docs>/plans/` |
| `<docs>/plans/warmup-reseed-delta.md` | reseed additions | **`<docs>/decisions/`**, or delete after the owner reads it. Never written when the delta is empty |

Delete rather than archive when a file has no reader.

## Stage boundary — yield here

Adoption: finish Phase A, loop Phase B until `cg modules` exits 0, run Phase D, then Phase C.
Reseed: the additive walk above, then §12a. That is this skill.
Then return to the user. Do not invoke the next skill yourself, however obvious the route is.
The `Next action` block names the successor so a person can choose it and so `cg-auto-run` can
follow it under a granted authority — naming it is not permission to take it. The single exception
is a dispatch from `cg-auto-run`. If you were not dispatched by it, you are the last stage of this
turn.

## 12a. Next-action response

Choose exactly one immediate route:

- contracts written, gate green, and questions logged: point the owner at the `DU-NN` set and name
  `cg-unblock` to apply the answers when they come;
- contracts written and nothing is pending: use `cg-plan` with the first real piece of work;
- findings need delivery: use `cg-plan` with `<docs>/plans/warmup-corrective-set.md` so the owner
  can validate the restructure programme before any move;
- no discoverable modules at all: stop and ask, naming what was searched for;
- reseed wrote nothing: name no next skill, and say the delta was empty;
- warmup is complete and no work is queued: name no next skill.

End the user-facing response with:

```markdown
## Next action — <Warmup complete | Answers pending | Findings need delivery | Empty reseed>
- **User action:** <one concrete action — when answers are pending, "answer the N entries under *Pending your review*"; always say what happened to warmup-findings, warmup-corrective-set, warmup-report, and warmup-reseed-delta>
- **Next input:** <$cg-plan | $cg-unblock | None — warmup complete | None — empty delta> — <exact decision-log entries, corrective set, delta, or gate evidence>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

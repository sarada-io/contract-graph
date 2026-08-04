# Contract Graph

**Bounded, verified context for coding agents.**

Your contracts form a graph. Agents traverse it instead of reading your codebase — and every
rule ships with the test that fails when it breaks.

Spec-driven workflows tell an agent what to build. Contract Graph makes the repository reject what
it shouldn't have built — including a test that proves each detector still works.

```bash
npx contract-graph init . --design saas,ops
cg sync
cg verify
```

---

## What it actually does

Three things, and it is worth being concrete about them.

**1. It writes governance into your repository as files.** `cg init` scaffolds a `.agents/` tree:
the architecture rules, the design-principle packs you asked for, a rule → detector map, a routing
map, and six lifecycle skills. These are plain Markdown and JSON. Nothing is hidden in a database
or a service, and the tool is not running when your agent reads them.

**2. It generates the derived copies and refuses to let them drift.** Several files are *outputs*,
not sources: the rule block inherited into each module `contract.md`, the principle index in your
root entry files, and the Claude discovery wrapper for each skill. `cg sync` regenerates them;
`cg verify` fails if any one was hand-edited or left stale. You edit the source, never the copy.

**3. It fails your build when governance and code disagree.** `cg verify` exits non-zero when a
contract is missing a required section, cites a transient plan, or has a stale inherited block —
and when a rule has no row in the enforcement map. That last one is what keeps the rules honest:
you cannot add a rule and postpone its detector, because the postponement is itself a build
failure.

What it does **not** do: it does not run your tests, read your source, or check that a detector is
correct. It checks that every rule *has* one and that the governance files are internally
consistent. The detectors themselves live in your build, written by you.

### What lands in your repo

```
.agents/
  cg/
    principles/
      AP-01-executable.md one AP-nn file per architecture principle (source)
      AP-02-contexts.md   filenames sort in principle-ID order (source)
      PP-00-start-here.md inert example; real PP-nn files accrue here (source)
      design/saas.md      DP-SAAS-* rules for one topic, loaded at a fork (source)
    map/
      routing.md          task → which module contracts to load (source, a stub to fill)
      enforcement.md      rule ID → the detector that proves it (source)
      inheritance.json    which rules bind which folders (source)
    contract.md           governance's own contract + the skill catalog (source)
    workflow.md           the development loop (source)
  skills/cg-plan/         one folder per skill (source)
  rules/cg.md             shared agent pointer (generated)
.claude/skills/cg-plan/   Claude discovery wrapper, ≤12 lines (generated)
AGENTS.md                 root entry points — each carries a principle index
CLAUDE.md                   (partly generated: the index block is the tool's,
.github/copilot-instructions.md   the rest is yours)
<module>/
  .agents/cg/contract.md  the module's boundary + an inherited rule block (partly generated)
  CLAUDE.md, AGENTS.md    pointers making the folder openable on its own (generated)
```

Two groupings carry the weight. **`principles/`** holds one prefixed file per architecture or
product principle, plus selectively installed design-set files. A rule's family and principle ID
decide its file, and `cg verify` rejects a mismatch. **`map/`** holds the three things that map one
address space onto another: task → contract, rule → detector, rule → folder. Everything else at
the top of `cg/` is a document you read start to finish.

Filenames are lowercase except where they carry a canonical uppercase rule-family ID:
`AP-01-executable.md`, but `contract.md`.

The split that matters: **source files you write, generated files `cg sync` owns.** Every generated
region sits between `BEGIN`/`END` markers, so a file can be partly yours and partly the tool's.

## Why this exists

An agent will violate a rule that lives only in prose, and nobody will catch it. So Contract Graph's
first principle is about its own principles:

> **AP-01-02** — A rule and its enforcing test land in **the same commit**. A documentation change
> introducing a constraint without its detector is incomplete and must not merge.

Everything else follows. A rule with no detector is aspirational, and the framework says so out
loud rather than pretending otherwise.

## What you get

**Three rule families, loaded at different costs.** The ladder mirrors ordinary SDLC order:

| Tier | Loaded | Analogue | Shipped |
|---|---|---|---|
| `AP-*` Architecture | always | architecture | yes — the portable core |
| `DP-<SET>-*` Design | at a fork, only the sets it touches | design | yes — selectable packs |
| `PP-*` Product | when the work touches your product's specifics | specification | **no — starts empty, grows as you build** |

`PP` starting empty is the point. You inherit architecture and design guidance on day one and none
of anyone else's product opinions.

**Modality is per-rule, not per-family.** Each rule declares itself:

```markdown
- **DP-OPS-01-01** `invariant` — Every request entering the system carries a trace id.
- **DP-SAAS-01-01** `guide` — Prefer configuration over structural change.
  **Cost:** a configuration surface you must own, validate, audit, and version.
```

An `invariant` owes a detector and appears in the enforcement map. A `guide` owes a **cost clause**
and must never be given a detector. `cg verify` enforces both directions, so the enforcement map
never fills with rows nobody will build.

Architecture and product rules carry no marker and owe a row **unconditionally** — `cg verify`
fails the build when an `AP-` or `PP-` rule has none, and when a row cites a rule ID no principles
file defines. The map cannot quietly fall behind the rules it claims to cover.

**Two tiers of contract.** A `contract.md` per folder states its boundary, invariants, and entry
points; a `XxxContract` type per directory states what that unit promises its callers, with
implementations confined to a sibling `impl/`. Callers see only the contract — that single rule is
what makes change free on either side of it. See [docs/contracts.md](docs/contracts.md).

**Contracts that survive plan deletion.** Every module carries a `contract.md` stating its
boundary, invariants, and entry points in full. It inherits binding rules through a generated block
that `cg verify` rejects if hand-edited. Contracts may not cite a transient plan as the source of
a rule — that check is machine-enforced, not a convention.

**A folder is a workspace.** Any module folder opens on its own with complete governing context:
its contract, the rules that bind it, and pointers a scoped agent can follow. Hand someone a
folder and say *change anything inside; keep the contract.*

**Six lifecycle skills, harness-neutral.** `cg-plan` → `cg-prepare` → `cg-execute` →
`cg-complete`, with `cg-decide` cross-cutting and `cg-document` for durable records. They live
in `.agents/skills/` and specify responsibilities and evidence, not a particular coding agent.
See [Skills](#skills).

## Commands

| Command | Does |
|---|---|
| `cg init [dir] --design a,b` | scaffold governance; never overwrites an existing file |
| `cg sync [dir]` | regenerate inherited blocks, principle indexes, and discovery wrappers |
| `cg sync --check` | report what sync would rewrite; change nothing (use in CI) |
| `cg verify [dir]` | verify contracts, skills, and design principles |
| `cg packs` | list bundled design-principle packs |

Every command exits **0** on success and **1** on failure, so any build system can gate on it:

| Command | Exit 1 when | Use it |
|---|---|---|
| `cg verify` | any contract, skill, or rule check fails | the gate — this one is sufficient |
| `cg verify --warn` | never — prints findings, exits 0 | adopting on an existing repo |
| `cg sync --check` | a generated file is stale or hand-edited | a narrower, faster subset of `verify` |

### Wire it into your build

A governance check that has to be remembered is a governance check that will not run. Put it where
the build already fails.

**npm** — `cg` is on the path inside `npm scripts`, so no `npx` needed:

```json
{
  "scripts": {
    "governance": "cg verify && cg sync --check",
    "pretest": "npm run governance"
  }
}
```

**GitHub Actions** — as its own step, so a red governance check is legible in the log:

```yaml
- run: npx contract-graph verify
- run: npx contract-graph sync --check
```

**Make / Gradle / anything else** — it is a process with an exit code:

```makefile
governance:
	npx contract-graph verify
	npx contract-graph sync --check

check: governance test
```

**`cg verify` is the only gate you need.** `sync` writes four kinds of derived file — inherited
rule blocks, root principle indexes, the shared agent rule, and the Claude wrappers — and `verify`
checks every one of them for drift, on top of everything else it checks. There is no staleness
`sync --check` catches that `verify` misses.

Run it anyway where a *narrow, fast* signal is worth more than a complete one: a pre-commit hook,
or a build step whose failure should say "run `cg sync`" and nothing else. In CI it is belt and
braces, not extra coverage.

**Adopting on an existing repo?** Start with `cg verify --warn` in the build. It prints every
finding and exits 0, so the pipeline stays green while you work the list down. Drop the flag the
day it prints nothing — and treat that day as the real adoption date, because until then the check
is advisory and advisory checks decay.

## Design packs

| Pack | Resolves |
|---|---|
| `saas` | product shape at SaaS scale — what is shared, per-tenant, configurable, versioned |
| `ux` | surface behaviour, disclosure, task completeness |
| `ops` | observability, tracing, audit, rollback, migration, single-maintainer load |

Set names are routing labels, not identities. Rename, split, or merge them as it becomes clear
which forks actually recur — unlike rule IDs, which are never renumbered.

## Skills

A skill is a folder of Markdown telling an agent how to carry out one stage of the loop — what it
must load, what it must produce, and what evidence closes it. They are **harness-neutral**: the
skill states the responsibility, not the tool.

```
.agents/skills/cg-plan/
  SKILL.md               the instructions (source, ≤500 lines)
  agents/openai.yaml     display name, short description, default prompt (source)
  assets/                templates the skill writes from (optional)
  references/            detail loaded only when needed (optional)

.claude/skills/cg-plan/
  SKILL.md               generated discovery wrapper, ≤12 lines — never edit
```

Two source files, one generated. The wrapper exists because Claude discovers skills under
`.claude/skills/`, but the skill itself must not live there — one canonical copy under `.agents/`
stays readable by any agent, and `cg sync` projects it into whatever a specific harness expects.

**Why the line budget.** `SKILL.md` caps at 500 lines and the wrapper at 12 because a skill is
loaded into a context window, not read by a person. Detail that only *some* runs need belongs in
`references/`, loaded on demand. That is progressive disclosure, and the cap is what enforces it.

**How the loop runs.** `cg-plan` scopes the work and names the contracts it touches. `cg-prepare`
loads exactly those. `cg-execute` changes code inside the boundary. `cg-complete` harvests the
decisions and drains the log. `cg-decide` is called from any of them when something is unspecified;
`cg-document` writes the durable record. The routing lives in `.agents/cg/map/routing.md` — task in, module
contracts out — which starts as a stub because only you know your modules.

### Adding or changing a skill

Your new skill is checked exactly as the six built-in ones are — the verifier does not privilege
its own.

1. Create `.agents/skills/cg-<name>/SKILL.md`, with frontmatter naming the folder:

   ```markdown
   ---
   name: cg-audit
   description: Audit a module contract against the code inside its boundary. Use when a
     contract is suspected of describing something the module no longer does.
   ---
   ```

2. Add `agents/openai.yaml` — note the top-level `interface:` mapping:

   ```yaml
   interface:
     display_name: "Contract Audit"
     short_description: "Audit a contract against its folder"
     default_prompt: "Use $cg-audit on the module I name, and report what disagrees."
   ```

3. Add the catalog link in `.agents/cg/contract.md` — `[cg-audit](../skills/cg-audit/SKILL.md)`.
4. Run `cg sync` — it writes the `.claude/` wrapper for you.
5. Run `cg verify`.

`cg verify` then holds you to all of this:

| Check | Rule |
|---|---|
| folder name | starts `cg-`, lowercase-kebab |
| `SKILL.md` size | ≤ 500 lines |
| frontmatter | exactly `name` + `description`, one-line plain scalars |
| `name` | identical to the folder name |
| `description` | present, ≤ 1024 characters |
| catalog | linked from `.agents/cg/contract.md` |
| `agents/openai.yaml` | present, with all three interface keys |
| `short_description` | 25–64 characters |
| `default_prompt` | names `$cg-<name>` |
| `.claude/` wrapper | present, ≤ 12 lines, byte-identical to generated |
| orphan wrappers | a `.claude/` skill with no `.agents/` source fails |

So the answer to *"how do I test a skill I just wrote?"* is `cg verify`, and it runs in the build
you wired above. What it proves is that the skill is **well-formed and discoverable** — that an
agent can find it, load it, and that its wrapper matches its source. It cannot prove the
instructions are *good*; that shows up in whether the loop produces the evidence the skill claims.

## Testing your changes

**If you changed governance in your own repo** — rules, contracts, skills, the map:

```bash
cg verify && cg sync --check
```

That is the whole test. `verify` catches wrong; `sync --check` catches stale.

**If you changed Contract Graph itself** — a runtime script or any scaffolded deliverable under
`src/`:

```bash
npm test
```

The package source layout is explicit about what runs and what lands in a repository:

```
src/
  scripts/       CLI implementation, loader, sync, verifier, and dev helper
  principles/    flat AP-nn/PP-nn files; design/ contains opt-in packs
  governance/    contract.md, workflow.md, and map/
  skills/        canonical cg-* skill trees
  scaffold/      rules/ and the starter module tree
bin/cg.js        executable shim importing src/scripts/cli.js
```

45 tests include fail-on-demand cases for every verifier check. The suite's rule, stated at the top of
[test/verify.test.js](test/verify.test.js): every negative case is load-bearing. A suite that only
proves the green path passes is indistinguishable from a verifier that checks nothing — so each
test mutates one thing in an otherwise-green repository and asserts that one specific check fires.

Adding a check to the verifier means adding a test that fails without it. Prove that, don't assume
it — break the check on purpose and confirm your new test goes red:

```bash
npm test    # comment out the new check first; the new test must fail
```

If it still passes, the test is decorative and you have learned that before shipping it rather than
after. This is the same falsifiability discipline the framework asks of your detectors, applied to
its own.

CI runs both layers on Node 18/20/22 — the unit suite, then a scaffold-and-verify self-check that
proves a freshly initialised repository is green. See
[.github/workflows/ci.yml](.github/workflows/ci.yml).

## Decisions become rules

Unspecified detail gets decided from the principles and logged as an assumption, not escalated to
a human mid-task. At a phase close, resolved decisions are triaged into five destinations:

| Destination | For |
|---|---|
| module `contract.md` | scoped to one module's boundary — **most decisions land here** |
| `AP` | universal structural invariants |
| `PP` | invariants owed to your product's market or shape |
| `DP-<SET>` | topic-scoped truths, marked `invariant` or `guide` |
| drop | one-offs — a bucket name, a version pin, a retirement |

Then the decision log drains. Its steady state is *open questions*, not everything ever settled, so
its size tracks how much is undecided rather than how long you've been building.

A promoted rule states itself in full and **never cites the decision that produced it** — permanent
governance cannot take its authority from a transient file. The reasoning goes in the amendment
ledger, which requires you to write down what the rule **costs**.

## Requirements

Node 18.17+. No runtime dependencies.

## Status

Early. The core — contracts, inheritance, skills, design principles, verification — is built and
tested. The code-level contract tree is documented but its drift check is not built, so verified
composition graphs and parallel execution across a contract remain designed-not-built — see
[docs/contracts.md](docs/contracts.md) and [docs/roadmap.md](docs/roadmap.md).

## Licence

Apache-2.0.

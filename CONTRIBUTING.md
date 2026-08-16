# Contributing

## Setup

```bash
node --test "test/**/*.test.js"
```

Node 18.17+. Run `npm install` once; the package deliberately keeps its runtime surface to the YAML
parser it bundles for canonical contract and binding files. A PR adding another runtime dependency
needs to argue for it because every dependency is supply-chain surface on a verifier.

## Building the package

Files under `src/cg/principles/` are the human-edited architecture principles catalog
(`architecture.yaml`). Engineering and product guidelines are YAML under `src/cg/guidelines/`
(`engineering.yaml`, `product.yaml`). After changing either, run:

```bash
npm run build
npm run build:check
```

The first command replaces the root-level `build/` package target; the second proves every file
and mode in that target matches its package source without writing. Never edit `build/` directly.
It is gitignored, as is `tmp/` from `npm run try`. `npm run clean` deletes both. `npm run pack`
rebuilds `build/` and writes `contract-graph-<version>.tgz` at the repository root (`*.tgz` is
gitignored). Architecture and product YAML are copied into `build/agent/cg/principles/` in the
checkout and `agent/cg/principles/` inside the tarball. The packaged `bin` is `script/cli.js`, not
the checkout's `bin/cg.js`.

Product entries are short YAML sentences: `id` plus `text`, under a `Pnn` heading. The catalog
ships with `principles: []`. Design entries are `id`, `rule`, and `reason`. The rule is the
practice; the reason is why it exists. A preference may also carry `cost`. `E` never appears in
`enforcement.yaml`.

## Publishing

`package.json` `version` is the source of truth. The git tag and the npm version follow it.

The registry artifact is the tarball from `npm run pack`, not the git checkout and not the
`build/` directory. `npm publish ./build` packs that folder again at publish time; `npm publish`
from the repo root would ship `src/` and `bin/cg.js`. Publish the file you just packed:

```bash
git status --short          # must be empty — pack reads the working tree
npm test
npm run pack
npm login
npm publish contract-graph-<version>.tgz --access public
```

Smoke-test the extracted tarball (after `npm install --omit=dev` in the extract, so `yaml`
resolves) before publishing: greenfield `cg init` keeps the starter `src` module; brownfield with
a build manifest does not invent one, reports `UNMAPPED`, and still reaches `cg verify: OK`.

Do not publish from a dirty tree. `npm pack` reads files on disk, so uncommitted edits ship and
committed-but-unbuilt catalog changes do not.

## Trying a scaffold locally

```bash
npm run try -- claude
```

Scaffolds a throwaway repository in `tmp/<target>`, runs `init` → `sync` → `verify`, and reports
which artifacts the named editor actually reads. `tmp/` is gitignored and safe to delete.

`cg verify` proves a scaffold is well-formed; `npm run try` is how you check an editor finds it. The
second is not something the verifier can close on its own.

The helper is `src/scripts/dev.js`, and it is **excluded from the package target**. It is
repository tooling: it writes to `tmp/`, it is reached only through `npm run try`, and it does not
ship. A test asserts the exclusion and exact target-to-tarball correspondence.

## Source layout

```text
src/scripts/    engine — CLI, verifier, and contract graph
src/skills/     lifecycle skills → .agents/skills/
src/cg/         authored contract-graph core → .agents/cg/
src/install/    init extras: hooks, rules, profiles, and templates
```

`src/cg/` mirrors the installed graph: `contract.yaml`, `workflow.md`, `phases.json`,
`enforcement.yaml`, `binding/`, `principles/`, and `schema/`. `src/install/templates/` holds the
starter module and the `docs/{plans,design,guides}` trees. Profile configs live in
`src/install/profiles/` and are never copied into an adopting repo.

## Changing the scaffold

`SCAFFOLD_MAPPING` in `src/scripts/init.js` is the executable source of truth for what `cg init`
writes. Its rules are directory-level: every consumer-facing file under `src/`, except runtime
scripts and profile configuration, must match exactly one rule.

Each rule has an ownership policy:

- `replace` is framework-owned. `cg init` updates it from the installed package.
- `preserve` is repository-owned context. `cg init` writes it only when it is absent.

The test suite checks the mapping in both directions. Coverage rejects an unmapped file or one
claimed by overlapping rules. A round-trip test scaffolds a temporary repository and compares the
result with an independently encoded source-to-target map. When changing the mapping, first make
the relevant detector fail with one deliberate mutation, then restore it and run `npm test`.

Editor profiles live in `src/install/profiles/` and may add discovery artifacts only; they may not
change the universal contract or governance tree. To add one:

1. Confirm the paths the real editor reads using its installed application and a scratch
   repository. A string found in an application bundle proves presence, not absence.
2. Add `<name>.scaffolding.conf.json` with its lowercase name, display name, root pointers,
   optional skill wrappers, and inheritance.
3. Add tests for its exact artifacts, missing selected artifacts, absent unselected artifacts,
   malformed configuration, and profile neutrality.
4. Run `npm test`, then `npm run try -- <name>` and inspect `tmp/<name>` in the real editor.

A profile may be a named no-op when the universal scaffold already supplies everything its editor
discovers. Do not invent a redundant file merely to give the profile a visible artifact. Cursor is
this case: it reads `AGENTS.md` and `.agents/skills/`, so its profile extends `codex` and adds no
unique path.

## The rule that applies to this repository too

**A binding and its enforcing test land in the same commit.** A PR that adds a check to `verify.js`
without a fail-on-demand test in `test/` will be asked for the test. A PR that adds an `E`
preference with an empty `cost` will be asked to fill it or omit the field.

### Fail-on-demand, specifically

Every check needs a test that mutates one thing in an otherwise-green repository and asserts *that
specific check* fires. A test that only proves the green path passes is indistinguishable from a
check that does nothing.

`test/verify.test.js` shows the shape: `makeRepo()` builds a green fixture, `edit()` breaks exactly
one thing, `assertFails(dir, code, note)` asserts the right code fires and prints every actual
failure when it does not.

## Changing an architecture practice

Architecture entries are advisory. The usual shape is:

```yaml
- id: E01-01
  rule: <the practice>
  reason: <why this practice exists>
```

A preference between workable designs may also carry `cost`:

```yaml
- id: E12-01
  rule: <the preference>
  reason: <why this preference exists>
  cost: <what choosing this makes harder, slower, or unavailable>
```

Neither form may have an enforcement-map row. A practice that should bind belongs in `P` or,
when it meets the structural promotion gate, in `A`.

## Promoting architecture guidance to structural binding

In this verifier-owning repository, an `E` practice may move to `src/cg/principles/architecture.yaml` only when
all four facts are present:

1. violating it would damage graph routing, ownership, boundary structure, or structural truth;
2. one deterministic measurement states pass versus fail;
3. a blocking detector is registered by the installed verifier; and
4. a negative fixture proves that detector fires.

Implement and register the detector, assign the next permanent `A` ID, and remove the
overlapping D practice in the same change. Every architecture-principle entry carries `rule`, `measure`, and
`enforcedBy`; every detector entry carries its registered implementation and exact negative-fixture
name. Binding prose without all of this does not merge. An initialized consumer repository cannot
add a built-in detector by changing its preserved YAML alone; product-specific enforcement belongs
in `P`, while a generic structural proposal belongs here.

**Rule IDs are never renumbered.** Append within a guideline or the architecture-principles catalog; redefine in place; never reuse. Set
*names* may be renamed, split, or merged — they are routing labels, not identities.

## Adding an engineering guideline

Add it to `src/cg/guidelines/engineering.yaml` under the next unused `Enn` heading, or append
inside an existing heading. Do not renumber. Product-specific bindings belong in `product.yaml`
as `P`, not here.
The verifier checks that every entry sits under its owning principle and retains its stable ID.
A new family prefix is a verifier change, not a YAML addition.

## Imported rules

If a rule comes from somewhere else, it arrives with the rule but without the case behind it or its
cost. Before it lands, state what it costs **here**. If that cannot be stated, the rule is being
adopted on reputation rather than reasoning, and it should be dropped. Check the source's licence
before copying text; a paraphrase carrying your own cost clause is usually the better artifact
anyway.

## Commit expectations

- One change per commit where practical.
- A behaviour change updates its documentation in the same commit.
- Say what the change **costs** in the message when it costs something.

# Contracts

Contract Graph represents a repository as connected, machine-readable contracts. A contract is
the durable promise for one owned software boundary and the routing node that leads to the next
smaller boundary.

## Authoring a new contract

Use the shared `.agents/cg/templates/contract.template.yaml` as an authoring aid, not another source of validity rules. The contract schema defines shape; `architecture.yaml` determines placement and decomposition. Replace the example kind, parent, composition and surface with inspected facts. A surface may be a function, event, command, schema or another supported entry—not necessarily a service. Warmup and produce use this same template only for missing contracts; existing contracts are amended in place. Run `cg verify` after authoring.

## Inspect implementation facts before authoring

`cg contract inspect` gathers source evidence for one selected unit and proposes field values for review. It writes only to stdout and never modifies a contract. Use normal contract routing to select an existing boundary, or select an unmapped directory explicitly before adoption:

```bash
cg contract inspect . --id billing
cg contract inspect . --id billing --json
cg contract inspect . --unit packages/billing --entry src/index.ts --json
```

Exactly one of `--id` or `--unit` is required. IDs, governed units and canonical contract paths work with `--id`, which requires a valid graph. `--unit` works before init or with an incomplete graph and reports graph problems separately. Repeat `--entry` for explicit unit-relative entry files. JSON and Markdown contain the same evidence. Exit 0 means a report was produced, including partial reports; it does not mean that a contract is verified or ready to accept. Invalid selection or fatal errors exit 1. There is no apply or write option.

The JavaScript/TypeScript adapter uses pinned TypeScript 5.9.3 to parse JavaScript/TypeScript ESM syntax without executing source, builds, package scripts or configuration plugins. It records explicit exported names (including aliases, defaults and type-only declarations), import/re-export sites, literal dynamic imports and package entry declarations. Exact relative file references may resolve as filesystem facts; this is not full Node, compiler or bundler resolution. A language export is a candidate, not necessarily an architectural public surface. Public paths and supported symbol lists are proposed separately from existing authored values; discrepancies never delete promises automatically.

Package `bin`, `main`, `types`/`typings` and `exports` supply entry evidence. Conditional alternatives remain qualified; wildcard/array targets and exclusions are recorded without expansion. Missing generated targets stay missing. CommonJS semantics, wildcard export closure, declaration-only implementation evidence, TS namespace/ambient exports, extension inference, path aliases, workspace package resolution, framework routes remain unsupported or unresolved. The parser does not type-check or prove runtime availability, input/output behavior, errors or guarantees.

Dart/Flutter, Java, Kotlin, Python, Go and .NET/C# have additional syntax adapters. They use pinned `web-tree-sitter` 0.25.10 and grammar binaries from `tree-sitter-wasms` 0.1.11 for Java/Kotlin/Python/Go/C#, plus the pinned Dart WASM distributed in `@plurnk/plurnk-mimetypes-grammar-dart` 1.16.1 (vendored without its JavaScript wrapper); no adopter compiler, runtime, build or plugin is invoked. Each report lists its `adapters`, parser versions and grammar binary hashes, and records the adapter/language for each analyzed file. Packaged grammar versions define the accepted syntax: a newer or unsupported construct that the grammar cannot parse produces a failed file analysis, not an empty API. Language parsers are bounded to 2,000 progress callbacks per file; stopping early yields a failed analysis.

| Language | Supported declaration and dependency evidence | Explicit limits |
|---|---|---|
| Dart/Flutter | Library-public declarations and members, explicit constructors, functions, accessors, bindings, type aliases, enums, mixins and named extensions; import/export URIs, aliases, deferred markers, ordered show/hide combinators, conditional alternatives, part directives and main entry evidence | Underscore names are library-private. Parts/reexports, inherited/mixed-in APIs, generated/implicit members, extension applicability, annotations and platform selection remain unresolved. No Flutter widget behavior, navigation, generated-code freshness or build resolution is inferred. |
| Java | Public types, explicit public fields/methods/constructors, public nested types, implicit interface members, package/import declarations and static/wildcard import markers | Inherited, annotation-generated, enum/record-generated APIs and Java module exports are not expanded. |
| Kotlin | Default-public or explicit public types, functions, properties, constructor properties and type aliases; package/import aliases | Private/internal/protected declarations are excluded from the public set. Implicit override visibility, generated/multiplatform APIs, scripts, destructuring and inheritance remain qualified. |
| Python | Top-level definitions/bindings, class members, simple literal `__all__`, non-underscore naming convention, static/relative imports and aliases | `__all__` controls star imports, not access control. Imported binding availability, decorators, dynamic exports, conditional definitions, inheritance and module/class execution remain unresolved. |
| Go | Unicode-uppercase exported declarations, fields, interface methods and methods on public receivers; package/import declarations | Build tags, platform/test filenames, embedded/promoted members, aliases and non-public receivers require further review. |
| .NET/C# | Public types/members, implicit interface members, nested types, namespaces and using aliases/static/global markers | Assembly/build resolution, partial/record-generated APIs, preprocessor branches, attributes, inheritance, operators/indexers and compiler-generated entries remain qualified. F# and Visual Basic are unsupported. |

Member names are qualified by their containing source type (for example `Api.Charge`); constructors use their declared source name (for example `Api.Api`). Namespace/package identity is separate evidence. Overloads produce separate observations with the same symbol name; this tool does not infer overload signatures or behavior. Non-JS imports retain their source specifiers and aliases but remain unresolved against language builds, environments and dependency graphs. A source declaration's visibility is not proof that its compiled package exposes that API.

Use an explicit entry in any supported language, for example `cg contract inspect . --unit billing --entry Api.cs --json`. When an unmapped unit has no explicit entry selection, source files with supported public declarations become **candidate inspection paths**, never automatic contract surfaces or graph nodes. Existing authored contracts retain their selected surfaces. The scan reports nested Dart (`pubspec.yaml`)/Go/Python/JVM/.NET project roots for separate selection rather than absorbing them into one boundary. Languages outside the listed adapters remain unsupported even if the installed grammar distribution contains their parser binaries.

For a Flutter trial, run `cg contract inspect . --unit . --entry lib/main.dart --json` from the application directory, or select a smaller contract-owned unit after routing. Repeat `--entry` for known flavor entry files; `main` observations do not select a build target. `cg modules` recognizes `pubspec.yaml` packages and Dart source branches. `.dart_tool`, `build` and `integration_test` trees are excluded from ordinary inventory; generated `.g.dart`/`.freezed.dart`/`.gr.dart` files encountered elsewhere remain qualified source observations. Barrel exports remain useful candidate paths even when their full exported symbol set is unknown. Flutter widget fixtures exercise syntax extraction, not a running Flutter application. Dart privacy and package boundaries follow the [Dart library](https://dart.dev/language/libraries) and [package layout](https://dart.dev/tools/pub/package-layout) conventions; neither defines architectural contract ownership.

Read the report's coverage and `stable` status before its proposals. Each source observation identifies its file, range and content hash; manifest observations identify their property pointer. Explicit entry selection is recorded as a proposal, not an extracted source fact. Snapshot hashes identify the analyzed inputs, including directory inventories and probed target presence. Rerun before consuming saved evidence after any relevant source, graph, manifest or configuration change. Reports are transient; retain one only while active work or repository policy needs it.

Unknown proposal values are `null` with a state/reason in the report, never empty arrays. An observed empty ESM export set is explicitly distinguished from parse failure or incomplete export coverage. Positive facts can survive partial coverage, but unresolved export sets cannot propose replacing an authored symbol list. All required contract fields are assessed: meaning, responsibilities, behavior, composition, dependencies, rules, routes and verification remain authored content or decisions requiring judgment. Keep report statuses and evidence objects out of `contract.yaml`; its existing schema remains authoritative.

The scan stops at declared descendant units and nested package roots and identifies them for separate inspection. It excludes tool, vendor, generated and test trees, records skipped symlinks, and limits the inventory to 10,000 entries, 64 directory levels, 1 MiB per read file and 32 MiB total read bytes. Limits and unreadable files make coverage partial. Explicit entry declarations can identify files within normally excluded trees, but do not override declared descendant ownership. No symlinks are followed. This inventory is bounded evidence, not proof that the graph contains every architectural boundary.

Implementation imports stay separate from `relations.dependencies`. A resolved target can name its most specific **declared** contract owner when the graph is valid; the author must decide whether the import is a legitimate public dependency, a bypass to repair, or evidence that the boundary needs review. It does not determine parent/child ownership, a leaf declaration or task routes.

After review, use the shared template for a missing contract or amend an existing contract narrowly. Supply meaning from accepted intent, bounded code reading and actual behavioral checks; never weaken an accepted promise merely to agree with current code. Run contract/graph verification after authoring and report its result separately from extraction and behavioral evidence. Inspection, better instructions and passing schema checks do not prove implementation correspondence.

The installed skills invoke inspection during warmup before contract population, during produce when changes need source facts, and at sign-off for affected contract units after finishing changes and repairs. Sign-off records current evidence and finding dispositions alongside behavioral and graph checks, refreshing it when relevant inputs change. Unaffected units and documentation-only work do not require a repository-wide scan. These are agent procedure requirements: init installs them, while `cg verify` and `cg delivery close` do not automatically run source inspection or enforce its report freshness.

## One artifact per boundary

Every governed directory owns exactly one canonical file:

```text
<unit>/.agents/cg/contract.yaml
```

The repository root is the unit `.` and therefore owns `.agents/cg/contract.yaml`. Parent,
dependency, and routing edges live in that node rather than companion maps. Human-readable
Markdown is a projection produced by `cg contract show`; it is not a second source of truth.

Descriptive YAML scalar values may contain CommonMark. This keeps prose close to the structured fields
it explains without splitting one contract across two files.

Contract YAML uses a deliberately restricted YAML 1.2 profile. Duplicate keys, aliases, anchors,
explicit tags, merge keys, multiple documents, non-string keys, and non-JSON scalar values are
rejected. The package includes the parser; repositories do not supply executable loaders or tags.

## The recursive model

The composition spine is:

```text
repository → module → (submodule)* → component | library → implementation
```

Every node uses the same schema. `kind` describes its architectural scale; it does not change the
meaning of the other fields. Kind definitions and the stay / add-child / elsewhere decision live
in `.agents/cg/principles/architecture.yaml` `hierarchy.kinds` and `graph`, so every shipped skill reads one
protocol. A child must decompose its parent's responsibility, and every child
edge must be reciprocated by the child's parent edge.

Depth is mixed and uncapped. A module may be a leaf under the repository (two levels) after
`graph.recurse`, `graph.selfSufficient`, and `graph.stop` have been applied. Another module may nest
submodule, component, and library nodes (four or five kinds) when each child is self-sufficient.
`hierarchy.transitions` constrain which kind may sit under which, not how tall the graph may grow.

Hierarchy is the primary route, but `relations.dependencies` may connect siblings or shared
libraries laterally. Dependency edges do not confer ownership and do not make a contract reachable;
every contract must still be reachable from the root through composition edges.

## Required contract fields

| Field | Meaning |
|---|---|
| `$schema` | Canonical schema URL: `https://contractgraph.dev/schema/contract-v1.schema.json`. |
| `contractVersion` | Contract format version. Current nodes use `"1.0"`. |
| `id` | Stable graph identity. Reordering or moving presentation must not change it casually. |
| `name`, `kind`, `unit` | Human name, boundary type, and repository-relative directory owned. |
| `summary`, `purpose` | A short discriminator and how the parent uses the boundary. CommonMark is allowed. |
| `responsibilities` | What the boundary owns, allows, and explicitly forbids. |
| `surface` | The language-native public entry points and their observable promises. |
| `invariants` | Stable statements that must remain true, linked to verification or explicit debt. |
| `relations` | Parent, composition state, children, and lateral dependencies. |
| `rules` | Applicable repository-owned `P` rule IDs. Global `A` rules apply automatically. |
| `verification` | Smallest executable commands and the invariant IDs each proves. |
| `routes` | Task phrases and the canonical contracts they select. |
| `agent` | What an agent reads first and checks before changing the boundary. |

Optional `assumptions`, `exceptions`, and namespaced `extensions` carry truth that does not belong
in the core model. Unknown top-level fields are rejected so misspellings cannot silently become
unused contract data.

The package also installs the same schema at `.agents/cg/schema/contract.schema.json`, so local
validation does not depend on network access. The contractgraph.dev URL is its public identity
and must serve the matching schema bytes. Both `cg verify` and the JSON schemas require the
canonical `https://contractgraph.dev/schema/<name>-v1.schema.json` identity for contract,
principles, and enforcement. Architecture, engineering, and product catalogs share
`principles-v1`. Declarations using any other host or path must be updated before verification.
Re-initialisation refreshes A/E catalogs, migrates legacy P catalogs, and updates the known
`sarada.io/contract-graph/schema/` v1 contract/enforcement declarations without changing their
other bytes. Unrecognized schema identities still require explicit correction.

## Declared surfaces are concrete promises

Each non-repository boundary declares at least one surface (A10). A surface names:

- its stable ID and language-neutral kind;
- its path relative to the governed unit;
- the exported symbols callers use, when symbols apply;
- what it accepts and returns;
- its observable failure modes; and
- the guarantees callers may rely on.

That list is the unit's promise to its parent and dependents, not “public” in the language, HTTP,
or customer-facing sense. `graph.surface` requires an explicit entry and promise, while
`graph.surface.service` describes one possible entry style. Functions, events, services, streams,
and asynchronous operations can all have declared surfaces; no fixed type count or synchronous
completion model is required. Construction details and mutable implementation state stay internal
unless explicitly part of the promise. Technology-specific APIs may deliberately expose those
concepts. A consumer-independent core does not acquire a consumer's product-specific workflow
when its existing promise already suffices. E01-03 recommends cohesive facades and E02-06
recommends adapters; neither recommendation independently requires a rewrite or child contract.

The code form remains language-native. A service may be a class, a module of functions, an HTTP
resource, or another native export. TypeScript exports, Java interfaces, schemas, commands, events,
and HTTP endpoints remain valid surfaces when they are that callable promise. The YAML contract
declares the cohesive surface. Record which language, build, or repository controls protect its
internals and where coverage is absent; Contract Graph does not supply universal import confinement
or prescribe one source layout.

`cg verify` currently proves that every non-repository node declares a surface and that every
declared surface path exists (A10, A11). Language-specific detectors must additionally prove
that symbols are exported and callers do not bypass the surface.

## Composition has no implicit state

`relations.composition` is one of:

- `leaf` — the contract is the smallest owned boundary and `children` is empty;
- `composed` — responsibility is decomposed and `children` contains at least one contract edge;
- `unmapped` — root-only transitional state after brownfield init and before warmup discovers the
  real top-level boundaries.

There is no implicit or omitted state. `unmapped` is explicit, valid only at the repository root,
and must have no child edges. Warmup replaces it with `leaf` or `composed` after inspecting the
repository. If an inner boundary cannot be classified safely, the agent records the uncertainty
in the decision log while continuing unrelated work; it cannot use `unmapped` to hide the gap.

Contract references are explicit objects:

```yaml
contract: modules/billing/.agents/cg/contract.yaml
uses: Delegates charging and refund policy to the billing capability.
via: [BillingPort]
```

Paths are repository-relative and always end in `.agents/cg/contract.yaml`. Contract edges do not
use JSON Schema `$ref`; `$ref` is reserved for schema composition, while `contract` means a graph
edge.

## Invariants and verification are reciprocal

An invariant names verification IDs, and every verification entry names the invariant IDs it
covers. `cg verify` checks both directions. An invariant without executable verification must
carry a `debt` object explaining the gap and optionally the work item that tracks it.

This distinction prevents `verification: []` from looking the same as a forgotten field. It does
not turn debt into enforcement: a rule is enforced only when its detector exists, blocks, and has
a fail-on-demand test.

## Binding rules are executable data, not generated prose

The structural binding catalog lives at `.agents/cg/principles/architecture.yaml`. Its `A` rules apply to
every contract node without being copied into each node's `rules` array. Each binding has a
deterministic measure and names a detector registered by the installed verifier plus the negative
fixture that proves the detector can fail.

A contract lists only applicable repository-owned `P` product rule IDs under `rules`. `cg
contract context` resolves those IDs against the product catalog under `.agents/cg/guidelines/` and includes P
rules from the selected contract's ancestors, alongside the ambient A rules.

This avoids duplicated rule text, hand-edited generated regions, and a separate inheritance map
that could disagree with the contract. The ID remains stable; the binding or product catalog
remains the sole source of its full wording.

`E` engineering practices do not
appear in `rules`. Engineering guidelines remain repository choice; copying them into a contract must not turn
advice into implicit authority.

A non-binding practice moves to `A` only when it has structural impact, a deterministic measure,
a blocking detector implemented by the installed verifier, and a negative fixture. Promotion in
the verifier-owning codebase assigns the next permanent `A` ID and removes the `E` copy in the
same change, so one obligation never has two authorities. An adopting repository cannot register a
new built-in detector by editing the catalog alone; it keeps the practice advisory, adopts a scoped
`P` rule, or proposes the generic detector upstream until verifier support exists.

### Principle ownership after installation

Contract Graph separates framework mechanics from repository policy:

- schemas, contract tooling, verification code, and lifecycle skills are framework-owned and may
  be replaced by a later `cg init`;
- architecture and engineering are refreshed from the release, with the previous files backed up;
- product principles are repository-owned and format-migrated, preserving IDs, statements, and comments;
- contract and enforcement content is preserved apart from known legacy schema URLs, while
  workflow and phase policy remain unchanged.

The shipped architecture principles are strong starting constraints, not immutable vendor policy.
Engineering guidelines are strong recommendations, but remain non-binding. After installation,
the repository owner may deliberately amend or retire defaults, but a later init refreshes A/E
and keeps those amendments in its backups for review. An
architecture-principle amendment remains limited to semantics the installed verifier can detect. Creating a new
generic `A` binding requires a verifier change; repository-specific authority belongs in `P`.
Every amendment remains explicit because silently changing structural authority would make one
engineering session reinterpret the graph for every later session.

Contract Graph's permanent authority is narrower than the complete set of good software practices.
It owns the YAML graph protocol and the structural governance needed to keep that graph useful
through change. A broader application-architecture preference remains guidance unless the
repository adopts a product-specific form as `P` or the verifier owner promotes a generic
structural invariant through the structural gate.

A repository constitution may govern broader product and engineering choices. It complements
rather than replaces these structural bindings: repository policy guides product decisions, while
A detectors protect graph integrity.

### Architecture principles and guideline catalogs

Architecture principles are authored YAML at `src/cg/principles/architecture.yaml`, analogous to
`enforcement.yaml`. Product guidelines are authored YAML at `src/cg/guidelines/product.yaml` and
ship empty. `cg build` validates all three catalogs and copies them into the package target.
They appear at `agent/cg/principles/` and `agent/cg/guidelines/` inside the tarball. Leftover `engineering.md`,
`product.md`, or compiled `engineering.json` / `product.json` fails verification the same way
leftover `enforcement.md` does.

There are three authored principle catalogs, one shared schema
(`https://contractgraph.dev/schema/principles-v1.schema.json`):

- `src/cg/principles/architecture.yaml` — `family: architecture`, `binding: global`. Recursive
  mapping (`hierarchy.kinds`), node decision (`graph` walk:
  node, recurse, selfSufficient, surface, decide, compose, stop, forbid, adapters), permitted
  boundary hierarchy, and global `A` structural principles with statement, reason, measure,
  registered detectors, and negative fixtures. The walk is documented in [lifecycle](lifecycle.md).
  `graph.surface` is declared entry and encapsulation behind the contract.
  `graph.surface.service` describes one way to declare that entry: named operations
  `contract.yaml` points at. `graph.adapters` is the vendor and consumer-adapter split of that
  encapsulation. The protocol fields are not `A` detectors and do not scan imports;
- `src/cg/guidelines/engineering.yaml` — `family: engineering`, `binding: advisory`. The shipped
  `E` advisory catalog; read on every lifecycle pass by default and applied when relevant, with no compliance gate; and
- `product.yaml` — `family: product`, `binding: scoped`. Repository-owned `P` bindings specific
  to the adopting product, initially empty.

Catalog nesting is packaging: A keeps flat `A01` leaves so registered detector identities stay
stable. E/P retain named groups with `entries` such as `E01-01` and `P01-01`. Sharing a schema
does not renumber these identities or require identical nesting.

The engineering catalog uses two categories: **Structural Best Practices** and **Broader Engineering
Considerations**. Each principle leaf is `id`, `statement`, and `reason`: the practice, and why it
exists. Optional `cost` is available only on advisory E leaves. Family determines authority. `A` is globally binding, `P` is boundary-scoped binding, and
`E` is the shipped SHOULD family. A preference in that catalog may carry an explicit cost. The package
ships populated A and E catalogs and an empty P catalog. Adopters may deliberately retire all E
entries (`categories: []`, `principles: []`); architecture still requires a non-empty catalog.
Catalog shape is validated even for advisory entries. An invalid E document fails format
validation; disagreement with a valid E statement does not fail verification.

The build manifest records the SHA-256 of every package file. Authored YAML catalogs are copied,
not compiled to JSON. `cg build --check` verifies the complete target without changing it.
`npm run pack` rebuilds it and passes only that directory to npm, so the verified directory and
the tarball cannot select files from different sources.

This is a source/runtime distinction, not a rejection of Markdown. Architecture principles, engineering
guidelines, product guidelines, and enforcement remain YAML in both source and package because humans amend
them and the verifier consumes their structure directly. After `cg init`, `architecture.yaml` and
`engineering.yaml` reflect the installed release; prior versions remain in backups. `product.yaml`
retains repository-authored rules through schema conversion. Agent procedures remain Markdown where reading
prose is their runtime behavior, including `workflow.md` and each `SKILL.md`.

## Routing belongs to contracts

Routes are owned by the contract that has enough context to choose among its descendants. Each
route has:

- a stable `id`;
- one or more task phrases under `when`; and
- one or more canonical contract paths under `contracts`.

The root routes broad product language into top-level capabilities. A module may then route more
specific language into its components. The CLI performs deterministic phrase matching and returns
the strongest matches; it does not ask a model to invent the first edge.

## Graph invariants enforced

`cg contract verify`, `cg graph verify`, and `cg verify` reject:

- invalid or unsupported YAML and unsupported contract versions;
- missing required fields and unknown top-level or structured fields;
- invalid IDs, unsafe unit paths, duplicate IDs, or duplicate governed units;
- anything other than exactly one owned responsibility per boundary;
- the same owned responsibility declared by more than one contract;
- a top-level module named as a horizontal technical layer;
- a boundary named as a miscellaneous bag rather than a responsibility;
- parent-child kinds outside the hierarchy declared by the binding catalog;
- a contract stored outside its governed unit;
- missing contract references;
- non-reciprocal parent and child edges;
- a child outside its parent's unit;
- composition or dependency cycles and contracts unreachable from the root;
- invalid composition states, leaf contracts with children, composed contracts without children,
  or `unmapped` below the repository root;
- missing declared surface paths;
- unknown binding rule IDs;
- dangling or one-sided invariant/verification references; and
- permanent contract strings that cite transient plan paths or ticket IDs.

These checks prove the authored graph is internally closed. They do not yet prove that source code
contains no undeclared architectural child, that every exported symbol matches its declaration, or
that implementation imports respect every boundary. Those require ecosystem-specific detectors.

## Installed JavaScript interface

The package exports its contract engine from `contract-graph` and
`contract-graph/contracts`. It includes loaders, graph discovery and validation, lookup by ID,
unit, or path, context resolution, deterministic routing, and Markdown/tree/Mermaid projections.

The CLI provides the same operations:

```bash
cg contract show --id billing
cg contract context --id billing
cg contract children --id billing
cg contract parents --id billing
cg contract surface --id billing
cg contract route --task "refund failed after checkout"
cg contract verify
cg graph show
cg graph show --format mermaid
cg graph verify
```

Commands read one or more connected YAML files; no executable JavaScript is supplied by the
repository being inspected. Repository data stays declarative, while the installed, versioned
library owns parsing, traversal, rendering, and verification.

The loop that consumes those contracts — plan, queue, Step, and the disk baseline a later
session is supposed to trust — is [workflow](workflow.md).

## Preserve accepted promises when contracts change

A contract's purpose explains how its unit serves its parent. Project intent supplies the wider product meaning; a module can refine that meaning through its purpose, responsibility and surface without a mandatory separate intent document. A module cannot silently change its parent's promise. Establish authority for an actual product change and update affected callers and contracts together.

Record the distinction between a promised requirement and its current implementation. When code violates an accepted invariant, retain the requirement and expose the discrepancy and missing evidence. Conversely, do not claim that an intended capability already exists. Updating both code and a contract to agree does not establish that the changed promise was authorized.

When a test expectation changes, determine whether it repairs an incorrect test, reflects an authorized requirement change, or conceals an implementation defect. The last case requires repairing the implementation. See [architecture considerations](architecture-considerations.md#intent-authority-and-implementation-evidence) for amendment reasoning and [intent approval](intent.md) for the repository context.

## Authoring rule

Contracts are written from the code and architectural intent one boundary at a time. Generating
many files from a shared prose template creates syntactically valid but useless context. Templates
provide field shape only. The author must supply distinct purpose, ownership, surface, invariants,
and edges for each unit, then run `cg verify` before moving on.

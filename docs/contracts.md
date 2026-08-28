# Contracts

Contract Graph represents a repository as connected, machine-readable contracts. A contract is
the durable promise for one owned software boundary and the routing node that leads to the next
smaller boundary.

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
| `$schema` | Canonical schema URL: `https://sarada.io/contract-graph/schema/contract-v1.schema.json`. |
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
validation does not depend on network access. The Sarada URL is its stable public identity and must
serve the matching schema bytes.

## Declared surfaces are concrete promises

Each non-repository boundary declares at least one surface (A10). A surface names:

- its stable ID and language-neutral kind;
- its path relative to the governed unit;
- the exported symbols callers use, when symbols apply;
- what it accepts and returns;
- its observable failure modes; and
- the guarantees callers may rely on.

That list is the unit's promise to its parent and dependents, not “public” in the language, HTTP,
or customer-facing sense. `graph.surface` is the protocol: enter only here. The first way to
declare entry is a **service** (`kind: service`): one or two named types whose operations take
parameters, do the work, and return the completed result. `contract.yaml` `surface` lists those
services and points at the implementation they encapsulate. Constructor ports assemble a service
behind the call; they are not how a parent talks to the node. Encapsulate algorithms, construction,
mutable internals, persistence, framework types, and vendor types behind the service. A new entry
or a bypass is not stay. `graph.adapters.port` is the vendor case of that encapsulation.

The code form remains language-native. A service may be a class, a module of functions, an HTTP
resource, or another native export. TypeScript exports, Java interfaces, schemas, commands, events,
and HTTP endpoints remain valid surfaces when they are that callable promise. The YAML contract
declares the cohesive surface and the repository mechanically protects its internals; Contract Graph
does not prescribe one source layout.

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
- authored contracts, the architecture-principles catalog, guideline catalogs, enforcement mappings,
  and workflow context are repository-owned and are preserved after their first installation.

The shipped architecture principles are strong starting constraints, not immutable vendor policy.
Engineering guidelines are strong recommendations, but remain non-binding. After installation,
the repository owner may deliberately retain, amend, replace, or retire either catalog. An
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
ship empty. `cg build` validates both catalogs and copies them into the package target.
They appear at `agent/cg/principles/` and `agent/cg/guidelines/` inside the tarball. Leftover `engineering.md`,
`product.md`, or compiled `engineering.json` / `product.json` fails verification the same way
leftover `enforcement.md` does.

There are three authored policy surfaces:

- `src/cg/principles/architecture.yaml` — recursive mapping (`hierarchy.kinds`), node decision (`graph` walk:
  node, recurse, selfSufficient, surface, decide, compose, stop, forbid, adapters), permitted
  boundary hierarchy, and global `A` structural bindings with measures, registered detectors,
  and negative fixtures. The walk is documented in [lifecycle](lifecycle.md). `graph.surface` is
  declared entry and encapsulation behind the contract. `graph.surface.service` is the first way to
  declare that entry: named operations `contract.yaml` points at. `graph.adapters` is the vendor split of
  that encapsulation. These are not `A` detectors and do not scan imports;
- `src/cg/guidelines/engineering.yaml` — the non-binding `E` engineering catalog; and
- `product.yaml` — repository-owned `P` bindings specific to the adopting product, initially empty.

The engineering catalog uses two categories: **Structural Best Practices** and **Broader Engineering
Considerations**. Each entry is `id`, `rule`, and `reason`: the practice, and why it exists.
Family determines authority. `A` is globally binding, `P` is boundary-scoped binding, and `E` is
the non-binding engineering catalog. A preference in that catalog may carry an explicit cost.

The build manifest records the SHA-256 of every package file. Authored YAML catalogs are copied,
not compiled to JSON. `cg build --check` verifies the complete target without changing it.
`npm run pack` rebuilds it and passes only that directory to npm, so the verified directory and
the tarball cannot select files from different sources.

This is a source/runtime distinction, not a rejection of Markdown. Architecture principles, engineering
guidelines, product guidelines, and enforcement remain YAML in both source and package because humans amend
them and the verifier consumes their structure directly. After `cg init`, `architecture.yaml`,
`engineering.yaml`, and
`product.yaml` are repository-owned and preserved. Agent procedures remain Markdown where reading
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

## Authoring rule

Contracts are written from the code and architectural intent one boundary at a time. Generating
many files from a shared prose template creates syntactically valid but useless context. Templates
provide field shape only. The author must supply distinct purpose, ownership, surface, invariants,
and edges for each unit, then run `cg verify` before moving on.

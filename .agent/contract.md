# Contract Graph Dev Kit repository contract

Parent: [AGENTS.md](../AGENTS.md). Purpose: route maintenance of Contract Graph Dev Kit itself
to the smallest responsible boundary before reading implementation.

These are repository-only Markdown contracts. They describe logical ownership of the current
code; they are not installed by `cg init`, consumed by `cg verify`, or a replacement for the
product's YAML graph. Flat runtime files remain at their current paths. The boundaries below
are review constraints, not mechanically enforced import boundaries.

## Route a change

1. Match the requested behavior to a row below. Use the task wording, not just a filename
   or command noun: `contract inspect` and `contract verify` have different owners.
2. Read the linked child contract. Its implementation table and boundary promises select
   the relevant source and tests; the installation, graph and verification children also
   give function-level reading guides.
3. Read that source and its tests before editing. Follow sibling links only when their
   promises are affected. A shared file does not transfer ownership of all its callers.
4. Keep the existing entry point, update the affected contract when its promise changes,
   and run the child's verification. If no row fits, use “When the route is unclear” below.

### Choose the responsibility

| Request | Owning child contract |
| --- | --- |
| Install, re-init, release upgrades, migrate catalogs, editor profiles or discovery | [Installation](installation/contract.md) |
| YAML nodes, graph traversal, routes, projections, module discovery | [Graph](graph/contract.md) |
| Source facts, language support, parser adapters, inspection reports | [Inspection](inspection/contract.md) |
| Intent approval, delivery receipts, status, next action, residue | [Delivery](delivery/contract.md) |
| A/E/P catalogs, schemas, binding detectors, aggregate verification | [Verification](verification/contract.md) |
| Skills, lifecycle instructions, templates, human documentation | [Authoring](authoring/contract.md) |
| Build, package, runtime identity, local development and release tools | [Distribution](distribution/contract.md) |

### Find a specific task

The phrases below are examples, not exact-match keywords. The owner column is the next
contract to read; the last column narrows reading after that contract.

| User asks about… | Read next | Existing section or entry point |
| --- | --- | --- |
| First install, initialize, reinstall, update an existing installation, upgrade to a new release | [Installation](installation/contract.md#where-an-init-or-upgrade-change-belongs) | `init.js`: `init`; upgrades use this same sequence |
| Which files are copied, overwritten, preserved, backed up or retired; missing starter files | [Installation](installation/contract.md#where-an-init-or-upgrade-change-belongs) | `SCAFFOLD_MAPPING`, scaffold helpers, `retireSkills` |
| Greenfield/brownfield setup, existing source, custom docs folder, saved profile selection | [Installation](installation/contract.md) | `init.js`, `profiles.js`; interactive choices in `cli.js` |
| Catalog refresh, old schema URLs, missing product rationale, migration failure or rollback | [Installation](installation/contract.md#where-an-init-or-upgrade-change-belongs) | `init-catalogs.js`, `migrate-principles.js`; `cg migrate-principles` is format conversion |
| Claude, Codex, Cursor, Copilot, Antigravity; profile selection or picker | [Installation](installation/contract.md) | `profiles.js`, `picker.js`, `src/install/profiles/` |
| Missing/stale AGENTS or CLAUDE pointers, skill wrappers, regenerated editor discovery | [Installation](installation/contract.md) | `sync.js`; shared rendering helpers are indexed by Verification |
| Claude admission hook, hook installation or wiring | [Installation](installation/contract.md) | `src/install/hooks/cg-gate.mjs`; admission decisions belong to Delivery |
| Parse/load a contract, invalid YAML, parent/child links, cycles, duplicate ownership | [Graph](graph/contract.md#boundary-promises) | `contracts.js`: parser, contract validation and graph loading |
| Find a contract by ID/path, show parents/children/surface, resolve context or route a task | [Graph](graph/contract.md#boundary-promises) | `contracts.js`: selection, context and routing |
| Show the graph as a tree, JSON or Mermaid; exported npm graph API | [Graph](graph/contract.md) | `contracts.js`: projections; `contract-graph` and `contract-graph/contracts` exports |
| Detect module roots, unmapped code, coverage gaps or unfinished descent | [Graph](graph/contract.md) | `modules.js`; `cg modules` |
| Inspect source, propose contract fields, choose a unit/entry file, stale source snapshot | [Inspection](inspection/contract.md) | `contract-inspection.js`: selection, confinement, evidence and reports |
| Extract imports/exports, TypeScript or JavaScript parsing, add language support | [Inspection](inspection/contract.md) | `inspection/index.js` and the relevant language adapter |
| Dart/Flutter, Java, Kotlin, Python, Go, C# parser behavior, grammar hashes or unsupported syntax | [Inspection](inspection/contract.md) | Language adapters, `inspection/grammars/`, third-party notices |
| Project intent approval, review evidence, changed project context invalidating approval | [Delivery](delivery/contract.md) | `intent.js`; `cg intent` |
| Start/checkpoint/review/approve/handoff/close a delivery, suspend/resume or abandon it | [Delivery](delivery/contract.md) | `delivery.js`; `cg delivery`, compatibility alias `cg prototype` |
| Persist, compact or recover receipts; verify delivery evidence for a pull request | [Delivery](delivery/contract.md) | `delivery-storage.js`, `delivery.js`; `cg delivery verify` |
| What runs next, why a skill is blocked, programme status, queue or recovery action | [Delivery](delivery/contract.md) | `next.js`, `status.js`; `cg next --for`, `cg status` |
| Leftover plans, unreferenced files, shared ownership or safe scope of cleanup | [Delivery](delivery/contract.md) | `residue.js`; `cg residue` reports evidence, not permission to delete |
| A/E/P rules, architecture principles, engineering advice, product bindings or enforcement | [Verification](verification/contract.md) | `binding.js`, `catalog.js`, policy catalogs; also read architecture policy |
| Contract/catalog schema fields, validation errors, registered detectors, negative fixtures | [Verification](verification/contract.md) | `src/cg/schema/`, `binding.js`, `verify.js`; Graph also consumes contract shape |
| Aggregate verification failures, missing skills, phase checks, scaffold validity | [Verification](verification/contract.md#bounded-reading-inside-the-larger-files) | `verify.js`; `cg verify` |
| Decision-harvest manifest, classify/close checks, prepared drain route | [Verification](verification/contract.md) | `harvest.js`; `cg harvest` |
| Shared path helpers, policy loaders, legacy Markdown rules or pointer rendering | [Verification](verification/contract.md#bounded-reading-inside-the-larger-files) | `model.js`; inspect the specific export and its caller |
| Warmup, planning, production, prototype, sign-off or unblock instructions | [Authoring](authoring/contract.md) | Relevant `src/skills/cg-*/SKILL.md` and `src/cg/workflow.md` |
| Sprint/Epic procedure, batch/per-item review, owner questions, decision consolidation | [Authoring](authoring/contract.md) | Skills and workflow; runtime evidence/state changes also require Delivery |
| Expert selection, domain experts, coordinator/worker instructions | [Authoring](authoring/contract.md) | `src/cg/experts.md`, `src/skills/experts/` |
| Starter contract content, contract template, project context, docs/plan templates | [Authoring](authoring/contract.md) | `src/cg/`, `src/install/templates/`; Installation owns copying/preservation |
| README, product claims, vision, human guides, branding or contributor instructions | [Authoring](authoring/contract.md) | `README.md`, `docs/README.md`, `docs/assets/`, `CONTRIBUTING.md` |
| Build output, package mappings, manifest hashes, npm exports/dependencies or Node compatibility | [Distribution](distribution/contract.md) | `build.js`, `package.json`, `package-lock.json` |
| Wrong CLI version, installed build identity, executable mismatch | [Distribution](distribution/contract.md) | `runtime.js`; `cg --version --json` |
| Local menu, clean/build/pack/publish, tarball install, editor development fixtures | [Distribution](distribution/contract.md) | `scripts/urun.mjs`, `urun`, `urun.cmd`, `dev.js`; release actions need explicit scope |
| CI configuration, npm test runner, scratch directories, mutation-test harness | [Distribution](distribution/contract.md) | `.github/workflows/ci.yml`, `scripts/test.mjs`, `scripts/check-principles-mutations.mjs` |
| CLI help (`cg help`, `--help`, `-h`), flags, arguments, prompts, output formatting or exit codes | [Root composition](#root-surface-and-composition) | `bin/cg.js`, `cli.js`; consult the affected behavior's child as well |
| This maintainer graph, source ownership pointers or repository-only planning | [Maintainer context](#maintainer-context-and-tests) | `.agent/`, `AGENTS.md`; distinct from installed `.agents/cg/` |

### Resolve overlapping words

- **Upgrade:** start with Installation even when a release changes skills or schemas.
  Authoring owns skill content; Verification owns schema semantics; init owns applying them.
- **Verify:** `cg contract verify` and `cg graph verify` use Graph; `cg verify` uses
  Verification; `cg intent verify` and `cg delivery verify` use Delivery. CLI dispatch
  composes these behaviors but does not become their owner.
- **Discovery:** editor/skill discovery uses Installation; module-root discovery uses
  Graph; imports, exports and source evidence use Inspection.
- **Approval or sign-off:** instructions about asking/reviewing use Authoring; stored
  acceptance, freshness and completion decisions use Delivery.
- **Rules:** migration of existing rules uses Installation; rule meaning, schema and
  enforcement use Verification; explaining those rules to an agent uses Authoring.

### When the route is unclear

For a known file, follow its `Repository contract:` header or the child's implementation
table. For a command, find its dispatch in `cli.js` and use the task table above. For a
failure, read the test for the affected behavior; a test runner failure belongs to Distribution.
If a request crosses owners, name the primary behavior and follow only its affected sibling
links. If no owner covers a genuinely new responsibility, add a child and root route in the
same change. Do not create a new script just because the user's wording is absent here.

## Root surface and composition

[bin/cg.js](../bin/cg.js) launches [cli.js](../src/scripts/cli.js), which owns CLI
argument handling, interactive orchestration, command dispatch, output and exit codes.
Each command's behavior belongs to the child above. Adding a command requires routing it to
an owner here; a new verb is not a new responsibility by itself. The package's exported graph
API belongs to Graph. CLI changes use the affected child's tests and `npm test`.

The children jointly cover `src/scripts/`, shipped assets and maintainer tooling. Tests sit
beside this logical graph in `test/`; they verify their named owner rather than forming another
product capability. Human-facing topic routes remain in [docs/README.md](../docs/README.md).

## Maintainer context and tests

| Repository surface | Owner and next context |
| --- | --- |
| `.agent/contract.md`, child contracts, source ownership comments, `AGENTS.md` | Root owns routing and composition; the affected child owns its boundary promise. [Authoring](authoring/contract.md) owns maintainer documentation conventions. |
| `.agent/architecture-policy.md` | [Verification](verification/contract.md) owns structural policy; read the [policy](architecture-policy.md) before changing architectural promises. |
| `.agent/skills/repo-plan/SKILL.md`, temporary `docs/plan/` | Repository-only planning: use the [repo-plan skill](skills/repo-plan/SKILL.md) when maintaining a plan. Plans are not permanent product specifications. |
| `test/*.test.js`, helpers and fixtures | The behavior's child owns assertions and fixtures. Each child lists focused checks. TypeScript fixtures belong to Inspection, not a separate TypeScript runtime. |
| `.github/workflows/ci.yml`, test runner and release tooling | [Distribution](distribution/contract.md) owns how checks/builds are run; individual failures route to the behavior's owner. |

Keep the two trees distinct: singular `.agent/` is this repository's lightweight maintainer
context; plural `.agents/cg/` is the installed product's governance tree. Product assets are
authored in `src/cg/`, `src/skills/` and `src/install/`, assembled by Distribution, then installed
by Installation. Edit the authored source for a product change, not generated `dist/build/`.

## Keep this map small and true

This is the minimal maintainer graph: `.agent/contract.md` →
`.agent/<responsibility>/contract.md` → named source files and their existing tests.
Source headers point back to their owning node. These comments refer to the source checkout;
the maintainer nodes are not packaged or scaffolded. No detector or verification script is
needed for this Markdown hierarchy.

The runtime is JavaScript ES modules, including the adapter that parses TypeScript.
The `.ts` files under `test/fixtures/contract-inspection/` are inspected input, not runtime
modules; keep their bytes focused on the test case rather than adding ownership headers.
The flat script layout groups responsibilities logically. Preserve existing import paths and
package exports when making routine changes; physical extraction is a separate refactor with
the owner's behavioral tests. File length alone does not justify another command or driver.

- Before adding a tool or script, name its owner and reuse that boundary's existing entry point.
  In particular, installation upgrades extend `init`; never create a parallel upgrade driver.
- A helper may be a separate file inside one logical owner. Record it in that owner's contract;
  file count alone is not a reason to introduce another boundary.
- Update affected ownership, links, entry points and verification in the same change as code.
  A new responsibility needs a child and a route here; a moved responsibility needs both owners updated.
- Split a child only when a distinct responsibility needs its own promise. Keep current facts
  and constraints here, with detailed explanations linked to their canonical homes.
- Do not hide cross-boundary work in shared helpers. `model.js` is an existing mixed concern
  documented under Verification; inspect the relevant export and its consumers before editing.

Validation follows [CONTRIBUTING.md](../CONTRIBUTING.md#choose-validation-from-the-change-surface).
For this Markdown graph, check local links and ownership against actual files and CLI dispatch.
No claim of automated drift prevention follows from these prose contracts.

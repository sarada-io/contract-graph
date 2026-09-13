<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://contractgraph.dev/assets/contract-graph-mark-white.webp">
    <img src="https://contractgraph.dev/assets/contract-graph-mark.webp" alt="Contract Graph logo" width="96" height="96">
  </picture>
</p>

# Contract Graph

**Scale model-driven development with contracts, not shared context.**

Contract Graph makes software understandable to coding agents as a traversable context graph:
repository → module → sub-module → component or library → relevant implementation. Each contract
explains what its unit owns, how its parent uses it, and where to read next. Agents follow that
map before reading the code needed for a change.

You can work in two modes: **Product Prototyping** and **Detailed Plan-Based Delivery**. Both keep
that graph truthful as the software changes and finish through the same verified delivery process.

## Choose how to work

| Mode | Start here when… | Your involvement |
|---|---|---|
| **Product Prototyping** | You need to try a working experience before deciding exactly what to build. | Use the preview, give feedback, approve the experience, then ask the agent to finish it. |
| **Detailed Plan-Based Delivery** | The outcome is understood, and you want an explicit implementation roadmap. | Agree on phases and acceptance gates, then run delivery stage by stage or opt into auto-run. |

### Product Prototyping

Start with `/cg-prototype` and describe the experience you want to explore:

```text
/cg-prototype
Improve the dashboard layout and interactions. Launch the application
and iterate with me until the experience is right.
```

The agent routes to the relevant contracts, launches the application, and makes small changes.
Give feedback in the same conversation. You do not need a detailed implementation plan or a new
skill invocation for every adjustment. The roadmap keeps the objective, feedback, accepted
choices, and known gaps available for later sessions.

During this loop, application test authoring, test suites, and browser regression testing are
deferred. Build and launch commands still run, contracts stay truthful, and changes to contract
YAML require `cg verify` in that iteration. Trying the preview establishes what you want;
delivery checks establish whether the resulting implementation meets its requirements.

When you accept the whole experience, ask the agent to complete the selected prototype:

```text
/cg-sign-off
I approve the dashboard prototype's UX. Complete its remaining
production work and sign it off.
```

The agent finalises the roadmap from the accepted result, carries the existing code into delivery,
and coordinates preparation, implementation, deferred tests, repairs, documentation, and sign-off.
You do not need to invoke each intervening skill. Changes to the accepted experience return for
affected human review; final closure requires the delivery checks to pass.

UX acceptance and the request to finish are separate decisions. “Sign this off” alone does not
supply UX acceptance. See the [prototype guide](https://contractgraph.dev/docs/prototype/) for recovery and working across
sessions.

### Detailed Plan-Based Delivery

Start with `/cg-plan` when you can describe the outcome and its constraints:

```text
/cg-plan
Add export and import for saved dashboards. Plan the work around
backward compatibility, validation, and recovery from invalid files.
```

Delivery proceeds through four stages:

1. **Plan — `/cg-plan`:** establish the current baseline, divide the outcome into ordered phases,
   and define scope, dependencies, risks, and acceptance gates.
2. **Prepare — `/cg-prepare`:** turn one selected phase into a detailed queue of executable steps,
   with concrete changes, dependencies, and verification commands.
3. **Produce — `/cg-produce`:** execute ready steps sequentially, updating code, tests, and
   affected contracts together.
4. **Sign off — `/cg-sign-off`:** verify the selected phase, repair defects, and close it only
   when its requirements pass.

Each standalone stage names the next action for you. For an accepted roadmap, `/cg-auto-run`
can coordinate delivery within the scope you grant, using one Engineer per phase where the host
supports fresh workers. It records unresolved decisions and asks you when an answer is needed.

If planning reveals that the experience still needs exploration, the agent returns the known
scope to you for `/cg-prototype`. Auto-run does not start prototyping or supply human approval.
An accepted prototype already supplies its delivery roadmap; it does not need a second planning
pass merely to enter preparation.

## Install and set up

Requires Node.js 18.17 or newer. Install the CLI globally, then initialise your repository:

```bash
npm install --global contract-graph
cd your-repository
cg init
```

`cg init` confirms the target directory and lets you select editor support. Reload your editor's
skills after installation. The CLI installs, verifies, and inspects; the agent skills do the
planning and implementation. Initialisation does not add an npm dependency to your application.

**New repository:** establish the root contract's purpose, boundaries, and routes, then choose
prototyping or detailed planning.

**Existing repository:** run `cg modules`, then `/cg-warmup` to map the code into contracts.
Warmup adopts unmapped boundaries or additively extends an existing graph. Until adoption is
complete, a passing scaffold check does not mean the implementation has been fully mapped.

**Updating an installation:** install the intended package version, then run `cg init --yes`
with the repository's existing docs root and editor profiles. Skills, schemas, and hooks update;
architecture and engineering refresh from the release with backups; product rules migrate to the
current schema without losing their content. Contracts and enforcement keep their content while
known legacy schema URLs update; workflow and existing documentation are preserved. Use
`cg --version --json` to identify the exact build. See [upgrade](https://contractgraph.dev/docs/upgrade/) for migration
and deliberate adoption of changes to preserved policy.

Supported editor profiles cover Cursor, Codex, Claude Code, GitHub Copilot, and Antigravity.
Antigravity, Codex, and Cursor share the `agents` profile (`AGENTS.md` and `.agents/skills/`).
Host capabilities determine whether features such as fresh auto-run workers are available.

## Shared tools

Both modes use `/cg-unblock` to resolve consequential decisions and record answers. `/cg-warmup`
builds or extends the repository's context graph; it is a separate adoption step and is never
started automatically by auto-run.

| Command | Purpose |
|---|---|
| `cg verify` | Verify the authored contract graph and installed structure. |
| `cg modules` | Show detected module roots and mapping gaps. |
| `cg graph show` | View the contract graph. |
| `cg contract route --task "…"` | Find the contracts that own a request. |
| `cg next --programme <slug>` | Identify the next stage for a selected programme. |
| `cg status --programme <slug>` | Inspect remaining work, blockers, and recovery state. |

Run `cg --help` for the full command list.

## What the graph guarantees

Each boundary has one canonical YAML contract at `<unit>/.agents/cg/contract.yaml`. It describes
ownership, public entry points, related contracts, invariants, and verification. Structural rules
(`A`) govern the graph; repository-authored product rules (`P`) bind the contracts that list them;
engineering guidelines (`E`) remain non-binding advice read on every lifecycle pass by default and applied when relevant.

Verification checks the authored graph's schema, reciprocal composition edges, root reachability,
acyclicity, and declared surface paths and verification references. It does not yet prove that every
implementation dependency or exported symbol matches the graph, or that parallel write scopes are
independent. The intended benefit is precise routing followed by bounded code reading.

## Schema URLs

Use the matching URL below as the `$schema` value in each YAML document. Each JSON schema
publishes that same URL as its `$id`.

| Schema | Canonical URL |
|---|---|
| Contract | [contract-v1.schema.json](https://contractgraph.dev/schema/contract-v1.schema.json) |
| Principles | [principles-v1.schema.json](https://contractgraph.dev/schema/principles-v1.schema.json) |
| Enforcement | [enforcement-v1.schema.json](https://contractgraph.dev/schema/enforcement-v1.schema.json) |

Architecture, engineering, and product catalogs share the principles schema. Each file declares
`family` (`architecture`, `engineering`, or `product`) and `binding` (`global`, `advisory`, or
`scoped`). Architecture catalogs also carry the graph-writing protocol (`hierarchy` and `graph`),
which is not a principle.

The principles schema is a new format: `principlesVersion: "1.0"`, a fixed family/binding
pair, and `statement` plus `reason` on every principle leaf. Contract and enforcement remain v1.
For legacy catalogs, run `cg migrate-principles` to preview conversion. Supply missing rationale
with `--reasons <json-file>`, inspect the proposal with `--json`, then apply with `--write`.
`cg init` updates A/E defaults and converts legacy product catalogs. If product rationale is
missing, it stops before writing and accepts `--reasons <json-file>` on the same command. See
[upgrade](https://contractgraph.dev/docs/upgrade/) for the complete sequence.

## Learn more

- [Getting started](https://contractgraph.dev/start/) and [Docs hub](https://contractgraph.dev/docs/)
- [Quick Introduction Video](https://contractgraph.dev/#watch)
- [Vision](https://contractgraph.dev/docs/vision/) — the problem and the context-graph model.
- [Contracts](https://contractgraph.dev/docs/contracts/) — contract structure and verification limits.
- [Prototype](https://contractgraph.dev/docs/prototype/) — the feedback loop, acceptance, and completion.
- [Workflow](https://contractgraph.dev/docs/workflow/) and [Lifecycle](https://contractgraph.dev/docs/lifecycle/) — shared delivery stages.
- [Public schemas](https://contractgraph.dev/schema/) — JSON Schema identities.
- [Contributing](https://github.com/sarada-io/contract-graph/blob/main/CONTRIBUTING.md) — tests, packaging, and publication.
- [Preprint](https://doi.org/10.5281/zenodo.22301753)

## Licence

Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).

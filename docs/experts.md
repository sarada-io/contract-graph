# Expert skills and project extensions

Contract Graph supplies four small domain skills: `api-expert`, `mobile-expert`, `web-expert` and `ui-design-expert`. They supply implementation or review guidance to a bounded assignment. They are not running agents or lifecycle stages. Produce and prototype coordinators select expertise; the host supplies worker creation, model configuration and disposal. A coordinator can also use the skills directly without delegation.

## Framework source structure

Supplied domain skills live in `src/skills/experts/<name>-expert/`; lifecycle skills remain in `src/skills/cg-*/`. Both use the same SKILL.md structure. The package keeps experts under `agent/skills/experts/`, and init installs them into the shared `.agents/skills/` directory for host discovery. Adding another shipped expert under `src/skills/experts/` includes it in build and installation; add its selection guidance to `src/cg/experts.md`. Existing project indexes remain preserved on upgrade.

## Installed structure

```text
.agents/
  cg/
    experts.md                    # repository-owned selection and constraints
  skills/
    THIRD_PARTY_NOTICES.txt        # shared expert attribution and MIT license
    api-expert/                   # supplied default; refreshed by init
      SKILL.md
      agents/openai.yaml
    mobile-expert/
    web-expert/
    ui-design-expert/
    payments-api-expert/           # example custom skill; repository-owned
      SKILL.md
      agents/openai.yaml
      references/                 # optional detailed guidance
      scripts/                    # optional reusable tools
      assets/                     # optional templates/resources
```

The four defaults install through `cg init`. A Claude profile gets generated discovery wrappers through `cg sync`; other selected hosts use their normal shared-skill support. The coordinator reads `.agents/cg/experts.md`, matches the assignment to a skill description and contract boundary, checks the referenced skill and loads only relevant expertise. It does not launch one agent per catalog row. The index is interpreted guidance, not an executable registry or a machine-validated selection engine.

| Default | Focus |
|---|---|
| api-expert | Interfaces, validation, failure behavior and compatibility |
| mobile-expert | Platform interaction, lifecycle and device constraints |
| web-expert | Components, browser behavior, state and responsive layout |
| ui-design-expert | Hierarchy, interaction states and design alternatives |

All experts route to owning contracts and apply the graph’s stay / add-child / elsewhere decision before proposing paths, including direct use. A technical specialty does not justify a horizontal module. All experts follow the active lifecycle's authority and verification rules. Prototype work still defers application automation; production preserves required checks and truthful contracts. A UX proposal cannot supply owner acceptance. These skills create no new global architecture bindings.

## Add another expert

1. Create `.agents/skills/<name>-expert/`. Use lowercase hyphenated names and reserve `cg-` for lifecycle skills. Choose a distinct name; the four default names are framework-owned.
2. Add `SKILL.md` with matching `name` and a specific `description`, then concise instructions and references as needed. Keep the standard expert boundary: follow the current assignment, project policy and active lifecycle rules; no independent acceptance, broader scope or release authority.
3. Add `agents/openai.yaml` for host discovery. This repository's skill validator requires it. Its short description is 25–64 characters and its default prompt names `$<name>-expert`.
4. Add a row to `.agents/cg/experts.md` with the skill path, selection criteria and project constraints. There is no need to add an expert to the lifecycle phase map or root contract's lifecycle catalog.
5. Run `cg sync` then `cg verify`. These check metadata and generated discovery, not expert judgment or index semantics. Exercise the skill on a representative bounded assignment before relying on it.

For a custom desktop expert, a minimal starting point is:

```markdown
---
name: desktop-expert
description: Implement bounded desktop interaction and platform integration changes using this project's existing stack.
---

# Desktop Expert

Follow the assigned scope, owning contracts and active lifecycle rules. For coordinator work, read ../cg-produce/references/specialist-assignment.md. Reuse the current window, navigation and platform integration conventions. Account for relevant lifecycle, keyboard and error behavior. Return actual platform evidence and unresolved limitations; do not claim checks on unavailable platforms.
```

```yaml
interface:
  display_name: "Desktop Expert"
  short_description: "Implement bounded desktop app changes"
  default_prompt: "Use $desktop-expert for this bounded desktop assignment under the current lifecycle rules."
```

## Ownership and upgrades

Init preserves the project expert index and custom skill files the release does not ship. It refreshes supplied skills, so keep local constraints in the index or a distinctly named custom skill rather than editing a default. The index may omit a default to stop coordinator selection; that does not uninstall it or hide it from host discovery. Reconcile missing paths or conflicting instructions before dependent delegation. No model, tool access or permission is granted by an index entry.

See [coordinators and workers](#coordinators-and-workers) for assignment and recovery.

If a supplied expert path already exists without framework ownership in the installation manifest, init stops before modifying repository files. Retain that expert under a distinct project name and update the index before retrying; it is never silently replaced by the new default.

## Upstream credit and adaptation

The four experts adapt guidance from msitarzewski/agency-agents, credited by its license to **AgentLand Contributors**. Sources are pinned to commit `ad9264e309bd5e5422c04784372d7841b1e5d604` so later upstream changes do not silently change shipped instructions. Source URLs, attribution and the full upstream MIT text are kept only in the shared `.agents/skills/THIRD_PARTY_NOTICES.txt` file. SKILL.md contains no external links and does not require retrieving upstream material; the notices travel in both the package and installed skill directory. Contract Graph’s own root license remains Apache-2.0; the upstream material retains its MIT notice.

The shared [notice](../src/skills/experts/THIRD_PARTY_NOTICES.txt) contains the four pinned source attributions and full MIT terms. These are concise adaptations, not unchanged upstream agents or measured expertise. Mobile guidance does not prescribe a framework.

## Executing an expert assignment

Each expert uses the same four-step structure: establish the assignment, perform the domain work, verify under the active stage, and return a short handoff. The instructions identify what to inspect first, relevant cases to check, when to pause only affected work and how to report missing evidence. Small examples make compatibility, device evidence, UI states and design handoffs concrete without choosing frameworks.

The return format separates the assignment result, changed paths or findings, verification evidence and remaining obligations. Done applies only to that assignment; it never supplies owner acceptance or programme completion. Review-only work remains read-only. Prototype application automation remains deferred. Missing context is recovered from the request and repository before asking a question; ordinary implementation choices do not require fresh approval. These instructions aim to reduce inference required from an executing model, but have not been validated by a live trial with a lower-capability model.

The source notice lives at `src/skills/experts/THIRD_PARTY_NOTICES.txt` and packages with the experts. Include that shared notice when copying an expert independently. Re-init backs up and removes previous per-expert LICENSE files only when its prior manifest establishes framework ownership; unowned notices remain untouched.

## Coordinators and workers

Produce and prototype can use one coordinator with bounded specialists when delegation is available and permitted; direct execution remains valid. This adds no lifecycle stage, scheduler, automatic worker disposal or enforced write confinement.

The coordinator owns the user conversation, scope, review choice, dependencies, shared roadmap/queue updates, integration and recovery. Existing roadmap notes retain assignment identity, scope, state and evidence pointers. A replacement coordinator reads these records and inspects live writers and disk before reassigning work; silence does not prove a worker stopped.

Each specialist receives contract routes, outcome and exclusions, the exact checkout/baseline, allowed writes and shared resources, prerequisite evidence, required checks and return conditions. The coordinator verifies the returned diff and integration evidence, retains the worker for immediate repairs, then confirms writes have stopped and releases it through supported host controls. Disposing of a worker does not delete code, evidence or worktrees. Worker completion never supplies owner acceptance.

Keep technical queues sequential: independent contributions can share the current Step, but later Steps wait for its integrated gate. Batch items without a queue may run concurrently only after actual dependencies and shared file/resource ownership are checked; per-item review stays on the current item. Separate contracts or worktrees do not prove independence. Serialize uncertain writes, especially shared contracts, lockfiles, builds and preview resources.

Prototype delegation preserves early preview and deferred application tests. Specialists work on the current experiment without inventing production Steps. Changed feedback stops affected writers before reassignment; the coordinator integrates one coherent preview for review. Both loops retain the same accepted delivery handoff and sign-off.

The installed [coordinator procedure](../src/skills/cg-produce/references/coordination.md) and [assignment protocol](../src/skills/cg-produce/references/specialist-assignment.md) own the detailed agent instructions.

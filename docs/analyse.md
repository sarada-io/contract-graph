# Assess before adopting

The 0.8.0 prototype provides `cg analyse [directory]`. It prepares a ready-to-paste agent prompt; it does not run an LLM or produce an architectural assessment itself. A local coding agent follows the prompt to read evidence and save a report outside the target repository. Contract Graph does not need to be installed in that repository.

With the CLI available, ask your agent:

> Use `cg analyse` to assess this repository for Contract Graph adoption.

Or run the following and paste its output into an agent with access to the local files:

```sh
cg analyse /absolute/path/to/repository
cg analyse /absolute/path/to/repository --report /external/directory/assessment.md
```

The command writes no files. It emits absolute pointers to bundled instructions, warmup’s shared responsibility review, source-inspection commands, existing guidance and a proposed report destination. `--json` exposes the same context for integrations. The agent creates the external report after checking the destination again. Existing reports and destinations inside the target are rejected. This is a procedural read-only workflow, not an operating-system sandbox.

Reports lead with findings and severity, distinguish source facts from judgments, include confidence and practical consequences, acknowledge strengths, and give exploratory change traces and coverage limits. Missing contracts are not defects. No aggregate score, measured token savings or delivery improvement is claimed. Source inspection supports JavaScript, TypeScript, Dart, Java, Kotlin, Python, Go and C# with parser-specific limitations; documentation, unsupported languages and semantic responsibility comparisons require agent reading.

## Optional portable harness skill

The package bundles a portable `cg-analyse/SKILL.md` outside the repository installation assets. Find its absolute path in `cg analyse --json` under `resources.harnessSkill`. Copy its containing `cg-analyse` folder to your harness’s documented personal skill directory and reload skills. The skill resolves current resources through the trusted installed CLI, so its copy does not contain stale package paths. No harness installer or configuration is supplied in this prototype. `cg init` does not copy this skill into target repositories. The fixed chat prompt also works without installing the skill.

## From assessment to adoption

Review the report and select its smallest useful experiment. Diagnosis alone does not authorize adoption. If you choose adoption, confirm the documentation root and editor profiles, then preview:

```sh
cg init /absolute/path/to/repository --check --docs docs
```

Replace `docs` with the confirmed root; preserve existing choices where applicable. A preview exit code of 1 can mean updates are available. After authorizing the displayed changes:

```sh
cg init /absolute/path/to/repository --docs docs
```

Reload your agent’s repository skills. In that repository’s chat, ask:

> Use /cg-warmup to adopt this repository, rechecking the assessment as evidence. Do not refactor merely to adopt.

Warmup maps existing implementation and confirms intent; it may require broader mapping than the selected experiment. Resolve reported migration prerequisites. Then ask `/cg-plan` to plan the selected improvements or experiment. Use `/cg-produce` for authorized implementation and `/cg-sign-off` for its review and completion under the existing workflow. The diagnostic creates no competing acceptance record. Installation, mapping, owner review and keeping contracts current are real overhead; the report should estimate their scope qualitatively rather than invent measured costs.

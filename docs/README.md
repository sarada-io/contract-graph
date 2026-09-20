# Documentation

Start with the [Quick Introduction Video](https://contractgraph.dev/#watch). This directory is the written guide
that follows that page.

Read the published guides at [contractgraph.dev/docs](https://contractgraph.dev/docs/).

These pages are for people adopting or reviewing Contract Graph: what a contract is, how a
programme of work is split and run, and what the lifecycle stages mean.

Coding agents may read them. **They are not the agent procedure.** After `cg init`, that lives in
the `/cg-*` skills and `.agents/cg/workflow.md`. Those files tell a model what to do on a turn.
This directory tells you what you are agreeing to, what you should see on disk, and what is
supposed to remain after a plan is deleted.

| Read | What it answers |
|---|---|
| [Quick Introduction Video](https://contractgraph.dev/#watch) | Plays on the public page |
| [Vision](vision.md) | The framework’s mission, product intent and causal model |
| [Intent and approval](intent.md) | How adopting repositories establish intent and what approval proves |
| [Architecture considerations](architecture-considerations.md) | What is mandatory, what is advisory, and what verification actually proves |
| [Contracts](contracts.md) | What one YAML node is, and what verification currently proves |
| [Workflow](workflow.md) | Sprint/Epic outcomes, review, finishing and existing prepared queues |
| [Intent and delivery design](design/intent-and-delivery.md) | Record ownership, routing, rationale, compatibility and limits |
| [Expert skills](experts.md) | Supplied domain expertise, coordinator selection and adding project experts |
| [Lifecycle](lifecycle.md) | The stages you run, and the structural walk they share |
| [Upgrade](upgrade.md) | Refresh an installation, preserve repository choices and confirm adoption readiness |

For exploratory work, read [Prototype](prototype.md). The
[historical workflow review](proposals/prototype-workflow.md) records the source findings behind this extension; it is not the current procedure.

Start with vision if you are deciding
whether to adopt. Start with [upgrade](upgrade.md) when refreshing an existing installation. Start with workflow when you want to understand how agreed work moves through review and completion.
Use the skills when you are *doing* the work with an agent.

A dated technical note of the claim: [doi:10.5281/zenodo.22301753](https://doi.org/10.5281/zenodo.22301753).

Maintain one canonical page per topic and link to it from related pages. Update existing explanations instead of appending implementation diaries, repeated release summaries or test-run logs. Maintainer plans and review scratch under `docs/plan/` are local working material, not required documentation.

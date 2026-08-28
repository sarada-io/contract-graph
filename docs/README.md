# Documentation

Start with the [4-minute overview](https://sarada.io/cg/): why Contract Graph was needed, and what
it is. This directory is the written guide that follows that page.

These pages are for people adopting or reviewing Contract Graph: what a contract is, how a
programme of work is split and run, and what the lifecycle stages mean.

Coding agents may read them. **They are not the agent procedure.** After `cg init`, that lives in
the `/cg-*` skills and `.agents/cg/workflow.md`. Those files tell a model what to do on a turn.
This directory tells you what you are agreeing to, what you should see on disk, and what is
supposed to remain after a plan is deleted.

| Read | What it answers |
|---|---|
| [Vision](vision.md) | Why contracts, and what problem they are for |
| [Contracts](contracts.md) | What one YAML node is, and what verification currently proves |
| [Workflow](workflow.md) | How an outcome becomes phases, steps, and a lasting graph |
| [Lifecycle](lifecycle.md) | The stages you run, and the structural walk they share |

Watch the overview if you want the why and what first. Start with vision if you are deciding
whether to adopt. Start with workflow if you already installed and want to see how work is
supposed to move. Use the skills when you are *doing* the work with an agent.

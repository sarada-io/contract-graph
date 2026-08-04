---
name: cg-document
description: Create and maintain durable non-contract product documentation for both human teams and coding agents, including architecture and design records, product behavior guides, operator runbooks, security and recovery procedures, and Mermaid diagrams. Use when implemented behavior or durable rationale must be explained outside .agents/cg files. Reads contracts as authoritative evidence but never owns or postpones executor-required contract updates, phase-roadmap planning, sequential Step preparation, implementation, or phase completion.
---

# Contract Graph Document

Write durable non-contract documentation that remains useful to humans and agents. Read contracts
as evidence; never replace or defer them.

## Required outcome

Finish with all seven true:

1. The artifact is in the correct lifecycle tier.
2. Human-facing prose explains purpose, consequence, operation, and recovery.
3. Agent-facing prose identifies owners, boundaries, entry points, and verification.
4. Current-state claims are measured from contracts and implementation.
5. Mermaid diagrams match source and pass the strongest available validation.
6. Links, names, and commands are verified.
7. The user-facing response names the next action, next skill, input artifact, and readiness
   condition.

## 1. Respect lifecycle ownership

| Content | Owning skill/artifact |
|---|---|
| binding rule, invariant, entry point, forbidden dependency | `cg-execute` → `.agents/cg/` plus detector |
| programme outcome and phase map | `cg-plan` → roadmap |
| selected phase Steps, files, order, and execution context | `cg-prepare` → preparation record |
| Step implementation and contract co-delivery | `cg-execute` |
| integration evidence and phase closure | `cg-complete` |
| durable rationale, product/operator guidance, Mermaid | `cg-document` |

Do not edit `.agents/cg/` as a documentation cleanup detached from implementation. A missing or
stale contract returns to the owning execution Step.

## 2. Inspect evidence

Before editing:

1. Read relevant contracts and source.
2. Identify audience and lifecycle.
3. Determine whether the artifact is current truth or a dated historical record.
4. Search existing terminology, diagrams, and neighboring explanations.
5. Verify paths, routes, modules, roles, stores, and commands.

Preserve historical bodies. Add a dated measurement or supersession banner rather than rewriting
history to look current.

## 3. Write for humans and agents

For human readers, include:

- what the product or subsystem does;
- why the boundary exists;
- who owns or operates it;
- failure, security, cost, and recovery consequences.

For agent readers, include:

- exact owner and forbidden owner;
- stable contract or requirement IDs;
- entry points and trust boundaries;
- allowed and forbidden dependency directions;
- verification commands;
- current names and paths.

Use plain language first, then precise identifiers. Avoid prose that requires chat history.

## 4. Design records

Use design records for durable reasoning:

- alternatives considered;
- accepted trade-offs;
- threat or failure model;
- architecture consequences;
- supersession relationships.

Do not promote task logs, branch names, or temporary sequencing. A dated ADR is historical evidence;
supersede it rather than silently changing its decision.

## 5. Product and operator guides

Guides describe the current supported product:

- audience and prerequisites;
- happy path;
- authorization and safety boundary;
- observable failure;
- recovery and rollback;
- smoke test or verification.

Commands must be runnable. Remove retired stores, modules, routes, and deployment paths instead of
leaving contradictory operating stories.

## 6. Mermaid diagrams

Create the smallest diagram that materially clarifies a relationship.

1. Inspect source, contracts, and existing diagrams.
2. Check for Mermaid Chart frontmatter or managed synchronization.
3. Choose the semantic type: flowchart, sequence, state, class/ER, C4, journey, timeline, or Git.
4. Preserve repository artifact style.
5. Validate syntax and render or preview when tooling exists.
6. Inspect clipping, density, crossings, abstraction level, and legends.
7. Update surrounding prose and references.

Syntax rules:

- start with the exact diagram keyword;
- use stable IDs and quote punctuation-heavy labels;
- keep one abstraction level;
- use subgraphs only for real ownership/deployment boundaries;
- label ambiguous edges;
- avoid color-only meaning;
- split unreadable diagrams.

Validation order:

1. Mermaid extension validator and preview, if callable.
2. Mermaid CLI render to a temporary SVG or PNG, then inspect.
3. Static validation of keywords, delimiters, IDs, arrows, and `subgraph`/`end`.

State the validation method. Never claim a preview that did not occur.

Read [the VS Code Mermaid Chart reference](references/vscode-mermaid-chart.md) when extension
commands, AI repair, cloud synchronization, or sync review is relevant. Warn before credit-consuming
AI repair.

## 7. Validate the documentation set

- Check changed relative links.
- Search live documents for retired names and ambiguous terminology.
- Validate every changed Mermaid diagram.
- Confirm durable documents do not cite transient plans as authority.
- Run documented commands or state why they could not run.
- Confirm a human understands the outcome and an agent can find owner, boundary, and gate.

## 8. Next-action response

Choose exactly one immediate route:

- documentation was part of another Contract Graph activity: return to that invoking skill with the verified
  artifact;
- documentation exposed stale contract truth: use `cg-execute` with the exact contract defect and
  owning implementation Step;
- standalone documentation is complete: name no next skill.

End the user-facing response with:

```markdown
## Next action — <Documentation complete | Contract defect found>
- **User action:** <one concrete action>
- **Next input:** <$cg-plan | $cg-prepare | $cg-execute | $cg-complete | None — documentation complete> — <exact verified artifact or contract defect>
- **Blocked by:** <exact decision, prerequisite, or failing gate>   <!-- omit unless the status is non-advancing -->
```

Do not invent a lifecycle transition for a standalone documentation task. State explicitly when no
next skill remains.

## Completion check

- [ ] Artifact tier and owning skill are correct.
- [ ] Current truth is evidence-based.
- [ ] Historical records remain historical.
- [ ] No contract update was displaced from `cg-execute`.
- [ ] Product/operator procedures are runnable.
- [ ] Diagrams validate and match source.
- [ ] Links and terminology are clean.
- [ ] The response ends with one exact next action and skill.

---
name: repo-plan
description: Create, review, or iterate maintainer plans for the Contract Graph repository, keeping a concise executive summary above complete agent detail in one master document. This repository-only skill is separate from the shipped cg-plan lifecycle skill.
---

# Repository planning

Use this skill for planning changes to Contract Graph itself. Follow the root AGENTS.md reading order and product boundaries. Keep this skill under `.agent/skills/`; do not install it into `src/skills/`, modify `cg-plan`, or add it to the distributed framework as part of local planning.

## One master plan, two reading layers

Find the existing master plan for the requested work and update it in place. Keep related assessment, design evaluation, decisions, proposed phases, acceptance criteria and draft issue scopes in that document. Create one master document when starting a genuinely separate programme; do not accumulate companion plans for iterations of the same work.

The user needs a short review layer; the agent needs enough detail to resume accurately. A request to make a plan easier to read means improve its summary and navigation, not delete useful evidence, context, alternatives or constraints. Remove accidental duplication only without losing meaning. Do not create a separate summary file. Retain detail below the summary in the same master plan.

## Required document format

Start with the plan title and brief status metadata, then use this structure:

```markdown
## Executive Summary

### 1. Problem/Opportunity

[One or two plain-language paragraphs explaining why the plan exists.]

### 2. Solution Overview

[One or two plain-language paragraphs explaining the expected outcome and how the proposed changes achieve it. Include the current thinking and material limits.]

### 3. Plan Overview

[One or two paragraphs explaining how the plan is organised, its current stage and the next unresolved decisions.]

- **Phase name:** One to three lines explaining what it achieves and how it will achieve it; include a prerequisite or status when relevant.
- **Next phase:** One to three lines explaining its outcome and concrete approach.

---

## Details (Agent Version)

[The complete detailed plan, with navigation when useful.]
```

Write the summary so the owner can understand and review the direction without reading the entire technical record. Explain the fix and its causal steps, not just the problem or a list of abstract aspirations. Use familiar words; keep schema details, file inventories, issue bodies and long evidence tables below the divider. Match phase names, ordering and status to the detailed plan. Include every actual phase in the overview; do not invent phases to fit the template.

Each phase overview must include a brief “how”: the procedure, artifact, check or evaluation that produces the outcome. Use a concrete action in plain language instead of restating the phase title. Keep detailed implementation mechanics below the divider, and label undecided approaches as proposals.

Keep the summary current whenever the design changes. State unresolved choices as unresolved; approval of a summary's direction is not approval of hidden alternatives or implementation scope.

## Define workflow terms before relying on them

When a plan proposes a process or skill, define its key terms and relationships in plain language rather than assuming the executing model knows a methodology. State the inputs, decisions, outputs, start/stop conditions and completion evidence. Include a small populated example and decision rules for likely confusion, such as goal versus work item, plan agreement versus execution authority, or acceptance versus verified completion. Distinguish proposed vocabulary from implemented states and commands. Keep this agent detail in the master plan; the executive summary remains brief. Assess instructions through representative behaviour when validation is authorised, not merely by checking that terminology appears in the text.

## Paragraph wrapping

Write each prose paragraph on one source line and separate paragraphs with a blank line. Let the reader's editor or viewer wrap text to the available screen width; do not insert newlines to meet a fixed column width. Keep each list item's prose on one source line where possible. Preserve structural newlines in headings, lists, tables, frontmatter and code blocks. The phase overview's one-to-three-line guidance means short rendered descriptions, not manually inserted line breaks.

## Preserve context and planning boundaries

- Distinguish measured current behaviour, historical reported evidence, proposals, accepted decisions and questions awaiting the owner. Do not invent approval or test execution.
- Preserve relevant reasoning, dependencies, alternatives, compatibility risks and acceptance scenarios in the detail. References should remain usable by a fresh session.
- Plans in this public repository must stand alone without private adopter names, local paths, inaccessible incident records or model-specific conversation handoffs. Use anonymised scenarios and qualify historical evidence; do not erase the failure mechanism.
- Continue analysing and revising the plan while planning is in progress. Do not start framework implementation until planning is complete and the user requests implementation. A phase list, draft issue or suggested next step does not authorise execution.
- Keep draft issue scopes in the master document. Create external issues only when requested; published issues should reference the master plan instead of becoming competing design records.
- Do not turn a lesson from one adopter into a universal product policy. Preserve the repository's distinctions between structural protocol, structural governance and broader guidance.

## Finish an iteration

Check that the summary accurately represents the detailed proposal, including its proposed fix, material limits, phases and open choices. Check links, formatting and preservation of existing context. Run verification appropriate to the actual edits under AGENTS.md; documentation-only planning does not need runtime tests. Report the change briefly and link to the master document.

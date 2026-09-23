# Project expert index

This repository-owned index selects optional domain skills for the coordinator in cg-produce or cg-prototype. Init creates it when absent and preserves it thereafter. Read this index first, then only the skills relevant to the assignment. A skill supplies expertise; the host creates and retires an agent when delegation is permitted. No agent is started by this file.

| Skill | Path from repository root | Use for | Project constraints |
|---|---|---|---|
| api-expert | .agents/skills/api-expert/SKILL.md | API contracts, validation, errors and compatibility | Follow existing transport and consumer contracts. |
| mobile-expert | .agents/skills/mobile-expert/SKILL.md | Mobile interaction, lifecycle and platform behavior | Use the project's selected stack and supported platforms. |
| web-expert | .agents/skills/web-expert/SKILL.md | Web components, browser interaction and responsive behavior | Reuse the existing framework and design system. |
| ui-design-expert | .agents/skills/ui-design-expert/SKILL.md | Interface hierarchy, states and UX alternatives | Owner decisions remain with the coordinator's review loop. |

## Selection and extension

Select by the required outcome and responsible contracts, not just a file extension. Combine skills in one assignment when useful; do not create one agent per row. Resolve overlapping expertise through one implementation owner. Direct execution remains valid. Missing, ambiguous or contradictory entries require inspection and reconciliation before dependent delegation; do not invent a specialist or treat this index as executable configuration.

Add a custom `<name>-expert` directory under `.agents/skills/` with `SKILL.md` and `agents/openai.yaml`, then add its repository-relative path and constraints here. Use lowercase hyphenated names, ending in `-expert`, without the reserved `cg-` lifecycle prefix. Optional `references/`, `scripts/` and `assets/` belong inside that skill only when useful. Run `cg sync` for selected host discovery and `cg verify` to check skill structure. No lifecycle phase or contract catalog entry is required for an expert.

The four supplied skill names are framework-owned and refreshed by init. Keep project customization here or in a distinctly named expert, such as `payments-api-expert`; init preserves custom files it does not ship. Remove a row to stop coordinator selection; this does not uninstall or hide the skill from host discovery. Read a skill before using it: its presence does not grant tools, broader scope, human acceptance, model settings or permission to bypass the active loop. Worker evidence and assignment state belong in the existing delivery records and roadmap, not this index.

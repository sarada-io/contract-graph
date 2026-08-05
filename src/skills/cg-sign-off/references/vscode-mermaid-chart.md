# VS Code Mermaid Chart reference

Use these tools and commands only when the current harness exposes them. Do not invent a command,
claim it ran, or block ordinary Mermaid work merely because the extension is unavailable.

## Extension tools

- `mermaid-diagram-validator` — validate Mermaid syntax.
- `mermaid-diagram-preview` — render a live preview in VS Code.
- `get-syntax-docs-mermaid` — obtain syntax documentation for an unfamiliar diagram type.

For extension-backed diagram work, validate before presentation and preview after generation.

## VS Code commands

### Editing and preview

- **Preview** (`mermaidChart.preview`) — preview the active `.mmd` or `.mermaid` editor.
- **Create Diagram** (`mermaidChart.createMermaidFile`) — create a demo flowchart and open preview.
- **Repair Diagram** (`mermaidChart.repairDiagram`) — use Mermaid AI to repair the active diagram.
  Warn the user first because this consumes Mermaid AI credits.
- **Improve Diagram** (`mermaidChart.improveDiagram`) — suggest layout and styling variants through
  Copilot/LM APIs.

### Generation commands

- **Generate Diagram from Code** (`mermaidChart.generateDiagramFromCode`)
- **Generate Cloud Diagram** (`mermaidChart.generateCloudDiagram`)
- **Generate ER Diagram** (`mermaidChart.generateERDiagram`)
- **Generate Docker Diagram** (`mermaidChart.generateDockerDiagram`)
- **Open AI Chat** (`mermaidChart.openCopilotChat`)

These commands require GitHub Copilot. Prefer editing a `.mmd` file directly when unavailable.

### Mermaid Chart cloud

- **Login** (`mermaidChart.login`) / **Logout** (`mermaidChart.logout`)
- **Connect Diagram** (`mermaidChart.connectDiagramToMermaidChart`)
- **Sync Diagram** (`mermaidChart.syncDiagramWithMermaid`) — only for a connected diagram carrying
  Mermaid Chart frontmatter:

```yaml
---
id: cbd9e9ba-a2cb-47c5-a98e-8c28a753428d
---
```

### Sync review

- **Review Mermaid Sync** (`mermaidChart.reviewAppCommits`) — open the review flow.
- **Regenerate with Mermaid AI** (`mermaidChart.regenerateDiagramWithMermaidAI`) — regenerate from
  source references.

Do not manually rewrite diagrams managed by Mermaid Chart GitHub Sync.

## `@mermaid-chart` slash commands

| Command | Purpose |
|---|---|
| `/generate_diagram_from_code` | General diagram from source files |
| `/generate_execution_sequence` | Sequence diagram from an execution flow |
| `/generate_er_diagram` | ER diagram from schemas or models |
| `/generate_cloud_architecture_diagram` | Cloud or CI/CD architecture |
| `/generate_docker_diagram` | Architecture from Dockerfiles |
| `/generate_c4_topdown_architecture` | Top-down C4 architecture |
| `/analyze_code_ownership` | Code-ownership diagram |
| `/generate_dependency_diagram` | Dependency or security visualization |

Extension documentation:
<https://marketplace.visualstudio.com/items?itemName=MermaidChart.vscode-mermaid-chart>

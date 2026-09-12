# Optional Mermaid extension in VS Code

For diagram authoring, use [Mermaid diagrams](mermaid-diagrams.md). This file covers the optional
VS Code integration only. Mermaid work does not require VS Code, GitHub Copilot, or a cloud account.

## Discover before invoking

Inspect the tools and commands exposed by the installed extension version. Use its syntax
validator and preview when available; never assume a tool name from an old example is callable.
The extension's current documentation calls it **Mermaid** and uses `Mermaid:` command labels;
the marketplace identifier remains `MermaidChart.vscode-mermaid-chart`.

- **Preview Diagram:** inspect the authored diagram locally when the installed version permits it.
- **Repair Diagram / Improve Diagram:** optional AI actions, not validation prerequisites. Prefer
  direct source edits for ordinary fixes. Explain any credit use or external content transfer and
  use these actions only within the user's existing authorization.
- **Review Mermaid Sync:** review generated changes when the repository already uses that service.
  Preserve connected-diagram metadata and follow the repository's established source ownership.

Do not infer permission to connect, sync, publish, or commit from a request to draw a diagram.
Account requirements and Copilot capabilities vary by version. If access is unavailable, use the
repository's renderer or a local Mermaid CLI and state which host was actually checked.

Verify version-specific names and requirements against the installed command list and the
[official extension documentation](https://github.com/Mermaid-Chart/vscode-mermaid-chart).
[Marketplace listing](https://marketplace.visualstudio.com/items?itemName=MermaidChart.vscode-mermaid-chart).

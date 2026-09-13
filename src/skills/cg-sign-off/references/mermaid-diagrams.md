# Mermaid diagrams for contract context

Use this reference when creating or changing a Mermaid diagram during sign-off or durable
writing. Explain one question about ownership, a public boundary, an interaction, or a proposed
change. Diagram conventions guide presentation; they do not add architecture bindings or prove
that implementation matches a contract.

## Establish what the reader needs

Read the relevant contracts first, then the bounded source or evidence needed to establish the
relationships. Reuse repository terminology and an existing local diagram style where appropriate.
Choose the audience, question, and scope from the task; ask only when an unresolved choice changes
what the diagram must communicate.

| Question | Useful view |
|---|---|
| Where does this responsibility belong? | Small flowchart following parent and child contracts |
| Which boundary consumes another public surface? | Flowchart with named operations on dependency edges |
| What happens during one operation? | Sequence diagram with only the relevant participants |
| How does a proposed change differ from today's system? | Current/proposed flowchart, with proposed elements labelled |
| How do data entities relate? | ER diagram grounded in the actual schema |

Keep hierarchy, runtime calls, and execution order distinct. A parent-child edge means ownership;
it does not by itself mean a function call. Add a small legend if one view needs multiple edge
meanings. Use groups for real software, ownership, or deployment boundaries, not decorative boxes.

## Describe evidence without turning the diagram into a report

Give an architecture diagram a short caption stating its scope and whether it describes current
source, observed behavior, a proposal, or historical design. Link the relevant contract, source,
or durable decision. Include a revision or observation date when it matters to interpreting the
claim; never replace the evidence date with today's date automatically.

In a mixed view, write `Proposed`, `Historical`, or `Unconfirmed` in the affected labels and explain
any uncertain edge. A passing syntax check establishes renderability, not architectural truth.
Only say behavior is verified when a named check or observation covers that behavior. Diagrams
in permanent documents follow the same rule as their prose: no transient plan as their authority.
An illustrative template must remain labelled as an example until replaced with repository facts.

## Use a restrained, distinct visual language

The defaults below use a warm neutral canvas, slate text and connectors, muted teal boundaries,
and ochre proposals. They are starting choices, not an enforced repository design system. Follow
a repository's established theme and inspect contrast in the actual rendering host.

| Element | Default treatment |
|---|---|
| Current responsibility | Simple rectangle; pale teal fill, dark teal border |
| Supporting implementation | Neutral rectangle with a thin slate border |
| Proposed responsibility | Pale ochre fill, dashed border, explicit `Proposed` text |
| Unconfirmed fact | Neutral surface, plum border, explicit `Unconfirmed` text |
| Relationship | Slate arrow with a short operation or relationship label |

Use color to distinguish roles, never as the only evidence of status. Keep the shape vocabulary
small: rectangles for responsibilities, cylinders for actual stores, and diamonds only for a real
branching decision. Avoid decorative silhouettes, gradients, logo clusters, forced all-caps status
banners, and copying a reference diagram's composition wholesale.

Start with a top-to-bottom flowchart for a narrow reading surface. A short left-to-right chain is
fine when its labels remain readable. Prefer a handful of nodes per view; split a dense view into
an overview and focused details instead of shrinking the font. Keep labels short, avoid edge
crossings where possible, and use named public operations rather than generic `connects` labels.
Source order should still tell a coherent story if layout changes.

Use [the examples](mermaid-templates.md) for syntax and the optional palette. Keep one authored
source: a Mermaid block in its owning document, or a `.mmd` file with generated exports. Do not
maintain a second hand-edited copy. For generated `cg graph show --format mermaid` output, retain
the source graph's IDs and edges; a focused view must say what it omits.

## Accessibility and portability

Add `accTitle` and `accDescr` to authored diagrams, and provide a short prose explanation nearby
so the relationship remains useful without rendering. The explanation should answer the reader's
question rather than repeat every label.

Prefer standard labels and Mermaid configuration over custom CSS or HTML. Keep callbacks, remote
assets, and embedded sensitive data out of diagram source. Use ordinary Markdown links alongside
the diagram for navigation. Retain the renderer's security settings. Configuration and line
wrapping vary by host: check the target renderer before using advanced syntax or theme overrides.
When it strips styling, the labels, shapes, and text explanation must still convey the meaning.
Do not claim responsiveness, zoom, tooltips, or drill-down without checking the actual host.

## Validate and inspect

1. Use the repository's existing Mermaid validator or renderer. Consult version-appropriate
   syntax documentation for unfamiliar constructs; no documentation lookup is needed for every
   ordinary edit. Use [the VS Code reference](vscode-mermaid-chart.md) only when that extension
   is actually available and relevant.
2. Parse or render the final source. Fix reported errors before describing the diagram as valid.
3. Inspect the rendered output for clipped labels, overlapping edges, ambiguous groups, and
   contrast. Check the intended reading width, including a narrow view when mobile reading is
   relevant. A successful parse is not a visual inspection.
4. Check changed document links and any repository-required Markdown checks. Confirm the prose,
   diagram, and contracts describe the same state.

When tools are missing, use an available local Mermaid CLI or parser. Do not install an extension,
connect an account, or upload repository content merely to obtain a preview. Deliver the source
with the exact validation or preview limitation if no renderer is available. Record the renderer
and version used when reproducibility matters. Do not claim that a local preview proves rendering
on GitHub, in an IDE, or in another host.

Official references: [accessibility](https://mermaid.js.org/config/accessibility.html),
[theme configuration](https://mermaid.js.org/config/theming.html), and
[Mermaid CLI](https://github.com/mermaid-js/mermaid-cli).

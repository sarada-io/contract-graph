# Graph contract

Parent: [repository](../contract.md). Owns the authored YAML graph's loading, validation,
navigation and projections, plus discovery of mapping gaps.

## Surface and implementation

- [contracts.js](../../src/scripts/contracts.js): exported `contract-graph` and
  `contract-graph/contracts` API; `cg contract show/context/children/parents/surface/route/verify`
  and `cg graph show/verify` use this engine.
- [modules.js](../../src/scripts/modules.js): `cg modules`, module coverage and unfinished descent.

The `contract inspect` subcommand belongs to [Inspection](../inspection/contract.md), even though it shares
the CLI noun. Contract shape and hierarchy policy are dependencies owned by
[Verification](../verification/contract.md); scaffold authoring belongs to [Installation](../installation/contract.md)
and [Authoring](../authoring/contract.md).

## Boundary promises

For bounded reading within `contracts.js`, use these groups:

| Responsibility | Entry symbols |
| --- | --- |
| Restricted YAML syntax and serialization | `parseContractYaml`, `stringifyContractYaml` |
| One contract's shape | `validateContract`, `loadContract` |
| Filesystem discovery and connected-graph validation | `discoverContractFiles`, `loadContractGraph` |
| Selection, ancestor context and task routing | `findContract`, `parentChain`, `contractContext`, `routeContracts` |
| Markdown, tree and Mermaid projections | `renderContract`, `renderContext`, `graphTree`, `renderGraph`, `renderMermaid` |

Keep these behind the existing exported engine. Adding a query or rendering format does not
create another graph loader or command driver.

Canonical YAML remains the graph source. Navigation and projection do not execute inspected
repository code. Preserve reciprocal composition edges, acyclicity and root reachability.
Discovery reports missing mapping; it does not establish complete correspondence between source
dependencies and authored contracts. Routes lead to bounded code reading, not proof that code
reading is unnecessary.

Consumers include installation, verification, inspection and CLI dispatch. Changes to graph
shape require coordinated schema and detector changes through Verification; do not invent a
second parser or a parallel route store in a consumer.

Verification: `npm test -- test/contracts.test.js test/verify.test.js`, then `npm test`.
Canonical explanation: [docs/contracts.md](../../docs/contracts.md).

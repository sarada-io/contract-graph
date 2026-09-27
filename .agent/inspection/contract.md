# Inspection contract

Parent: [repository](../contract.md). Owns read-only source evidence for a selected unit so an
agent can author or amend its contract with explicit limits and uncertainty.

## Surface and implementation

`cg contract inspect` enters [contract-inspection.js](../../src/scripts/contract-inspection.js),
which owns selection, confinement, evidence aggregation, snapshots and report rendering.

| Internal component | Implementation |
| --- | --- |
| Adapter registry and selection | [inspection/index.js](../../src/scripts/inspection/index.js) |
| JavaScript / TypeScript extraction | [javascript.js](../../src/scripts/inspection/javascript.js) |
| Java, Kotlin, Python, Go and C# extraction | [native-languages.js](../../src/scripts/inspection/native-languages.js) |
| Dart / Flutter extraction | [dart.js](../../src/scripts/inspection/dart.js) |
| Vendored grammar identity and license evidence | [grammars](../../src/scripts/inspection/grammars), [notices](../../src/scripts/inspection/THIRD_PARTY_NOTICES.txt) |

`cg analyse` enters [analyse.js](../../src/scripts/analyse.js) to prepare an agent prompt with absolute bundled resources, bounded guidance pointers and an external report destination. It writes nothing and does not assess architecture itself. No installed graph is required. Diagnostic instructions belong to Authoring; follow-up adoption belongs to Installation. Validate with `test/analyse.test.js` and extracted-package coverage in `test/build.test.js`.

## Boundary promises

Reports propose facts; they never write contracts, execute inspected source or establish that
a graph is accepted. Preserve source fingerprints, unsupported cases and explicit uncertainty.
Import syntax alone does not establish architectural dependencies or ownership.

Consumes [Graph](../graph/contract.md) for existing ownership and [Verification](../verification/contract.md) for binding
context. Parser dependencies and bundled grammar changes also route to [Distribution](../distribution/contract.md).
Keep extraction inside adapters and report policy in the report owner; avoid separate language CLIs.
Load WebAssembly grammars sequentially: the shared parser runtime links scanner symbols globally,
and concurrent loads can expose unresolved imports on supported Node versions.

Verification: `npm test -- test/contract-inspection.test.js test/language-inspection.test.js test/dart-inspection.test.js`,
then `npm test`. Parser/package changes require extracted-package and Node 18.17 checks described
in [CONTRIBUTING](../../CONTRIBUTING.md#contract-inspection-validation).
Coverage claims belong in [docs/contracts.md](../../docs/contracts.md#inspect-implementation-facts-before-authoring).

# Inspection contract

Parent: [repository](../../../../.agent/contract.md). Owns read-only source evidence for a selected unit so an
agent can author or amend its contract with explicit limits and uncertainty.

## Surface and implementation

`cg contract inspect` enters [contract-inspection.js](../contract-inspection.js),
which owns selection, confinement, evidence aggregation, snapshots and report rendering.

| Internal component | Implementation |
| --- | --- |
| Adapter registry and selection | [adapters.js](../adapters.js) |
| JavaScript / TypeScript extraction | [javascript.js](../javascript.js) |
| Java, Kotlin, Python, Go and C# extraction | [native-languages.js](../native-languages.js) |
| Manifest inventory and Dart workspace/path facts | [manifests.js](../manifests.js), [dart-manifests.js](../dart-manifests.js) |
| Dart / Flutter extraction | [dart.js](../dart.js) |
| Vendored grammar identity and license evidence | [grammars](../grammars), [notices](../THIRD_PARTY_NOTICES.txt) |

`cg analyse` enters [analyse.js](../analyse.js) to prepare an agent prompt with absolute bundled resources, bounded guidance pointers and an external report destination. It writes nothing and does not assess architecture itself. No installed graph is required. Diagnostic instructions belong to Authoring; follow-up adoption belongs to Installation. Validate with `test/analyse.test.js` and extracted-package coverage in `test/build.test.js`.

## Boundary promises

Reports propose facts; they never write contracts, execute inspected source or establish that
a graph is accepted. Preserve source fingerprints, unsupported cases and explicit uncertainty.
Import syntax alone does not establish architectural dependencies or ownership.

Consumes [Graph](../../graph/.agent/contract.md) for existing ownership and [Verification](../../verification/.agent/contract.md) for binding
context. Parser dependencies and bundled grammar changes also route to [Distribution](../../distribution/.agent/contract.md).
Keep extraction inside adapters and report policy in the report owner; avoid separate language CLIs.
Load WebAssembly grammars sequentially: the shared parser runtime links scanner symbols globally,
and concurrent loads can expose unresolved imports on supported Node versions.

Verification: `npm test -- test/contract-inspection.test.js test/language-inspection.test.js test/dart-inspection.test.js`,
then `npm test`. Parser/package changes require extracted-package and Node 18.17 checks described
in [CONTRIBUTING](../../../../CONTRIBUTING.md#contract-inspection-validation).
Coverage claims belong in [docs/contracts.md](../../../../docs/contracts.md#inspect-implementation-facts-before-authoring).

Manifest discovery shares the package-manifest recognizer with nested source inspection. Dart manifest facts use bundled restricted YAML, bounded inventory, content/directory/presence fingerprints, literal workspace membership and confined relative paths. Overrides, globs, unsupported descriptors, symlinks and outside paths retain explicit uncertainty. SDK/version solving and package-manager execution are outside this responsibility. Verification owns package-to-contract mapping and correspondence policy; do not infer graph edges in the extractor.

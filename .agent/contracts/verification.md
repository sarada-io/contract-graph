# Verification contract

Parent: [repository](README.md). Owns installed policy formats and the checks that establish
authored graph and scaffold validity.

## Surface and implementation

| Component | Owned implementation |
| --- | --- |
| `cg verify`, aggregate structural/scaffold checks | [verify.js](../../src/scripts/verify.js) |
| A catalog validation and registered detectors | [binding.js](../../src/scripts/binding.js) |
| Shared A/E/P format validation | [catalog.js](../../src/scripts/catalog.js) |
| Policy loaders, paths, root/module/skill rendering helpers | [model.js](../../src/scripts/model.js) |
| `cg harvest`, decision-harvest validation | [harvest.js](../../src/scripts/harvest.js) |
| Authored policy and schemas | [principles](../../src/cg/principles/), [guidelines](../../src/cg/guidelines/), [schema](../../src/cg/schema/), [enforcement.yaml](../../src/cg/enforcement.yaml) |

`model.js` currently combines loaders and rendering helpers. Its consumers span installation,
delivery and build. This is an existing shared seam, not a destination for unrelated new tools;
route new behavior to its responsible sibling and inspect affected exports before changing it.

## Boundary promises

Read [repository architecture policy](../architecture-policy.md) before changing rules or
architectural promises. It owns the promotion gate, rule classification and amendment policy.

A is global MUST, P scoped MUST, E advisory SHOULD. Contracts list P bindings only. Promote
guidance only with structural justification, a deterministic invariant, registered blocking
detector and fail-on-demand fixture; remove the overlapping E rule in the same change.

Consumes [Graph](graph.md)'s parsing and graph checks. Aggregate verification does not prove
product-intent conformance, execute every contract's product checks or verify arbitrary code
dependencies. Intent approval belongs to [Delivery](delivery.md); file migration belongs to
[Installation](installation.md). Do not make verification another migration entry point.

Verification: `npm test -- test/verify.test.js test/principles.test.js test/contracts.test.js`,
then `npm test`. Policy/schema changes also require `npm run build` and `npm run build:check`;
follow the disposable-copy rule in [Distribution](distribution.md) first. Mutation validation
is documented in [CONTRIBUTING](../../CONTRIBUTING.md#schema-and-migration-validation).

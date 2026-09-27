# Verification contract

Parent: [repository](../contract.md). Owns installed policy formats and the checks that establish
authored graph and scaffold validity.

## Surface and implementation

| Component | Owned implementation |
| --- | --- |
| `cg verify`, aggregate structural/scaffold checks | [verify.js](../../src/scripts/verify.js) |
| A catalog validation and registered detectors | [binding.js](../../src/scripts/binding.js) |
| Shared A/E/P format validation | [catalog.js](../../src/scripts/catalog.js) |
| Policy loaders, paths, root/module/skill rendering helpers | [model.js](../../src/scripts/model.js) |
| `cg harvest`, decision-harvest validation | [harvest.js](../../src/scripts/harvest.js) |
| Authored policy and schemas | [principles](../../src/cg/principles), [guidelines](../../src/cg/guidelines), [schema](../../src/cg/schema), [enforcement.yaml](../../src/cg/enforcement.yaml) |

`model.js` currently combines loaders and rendering helpers. Its consumers span installation,
delivery and build. This is an existing shared seam, not a destination for unrelated new tools;
route new behavior to its responsible sibling and inspect affected exports before changing it.

### Bounded reading inside the larger files

| Task | Start here |
| --- | --- |
| Repository paths and default docs layout | `model.js`: `cgRoot`, `skillsRoot`, `principlesRoot`, `guidelinesRoot`, `manifestPath`, `DEFAULT_DOCS_ROOT` |
| Enforcement or A/E/P catalog loading | `model.js`: `loadEnforcementCatalog`, `loadPrinciplesCatalog`, `loadEngineeringCatalog`, `loadProductCatalog` |
| Phase policy and allowed skills | `model.js`: `PHASE_NAMES`, `loadPhases`, `phaseTokens` |
| Legacy Markdown rules and rule correspondence | `model.js`: `parsePrinciples`, `parseRuleSections`, `loadPrincipleRules`, `parsePrincipleIndex` |
| Generated root and module discovery | `model.js`: `renderRootIndex`, `generateCgAgent`, `generateRoot`, `generateModulePointer`; caller is Installation's `sync.js` |
| Skill metadata and Claude wrappers | `model.js`: `parseSkillMetadata`, `renderClaudeSkillWrapper`, `generateClaudeSkillWrapper` |
| Scaffold or aggregate verification | `verify.js`: `verify`; follow only the relevant check |
| Skills, phase policy or binding checks | `verify.js`: `checkSkills`, `checkPhases`, `checkPrincipleEnforcement`, `checkForkPrinciples` |

These are reading seams, not independently encapsulated modules. If `model.js` is physically
split later, separate catalog loading from discovery rendering first, inspect all importers,
and preserve its existing exports during migration. Do not turn it into a general utility bag.

`harvest.js` accepts compact per-decision JSON directories and legacy Markdown logs for resolved-ID eligibility. The human decision inbox is not an authority source after migration. Reject malformed records and symlinks; never infer approval from a pending record.

## Boundary promises

Read [repository architecture policy](../architecture-policy.md) before changing rules or
architectural promises. It owns the promotion gate, rule classification and amendment policy.

A is global MUST, P scoped MUST, E advisory SHOULD. Contracts list P bindings only. Promote
guidance only with structural justification, a deterministic invariant, registered blocking
detector and fail-on-demand fixture; remove the overlapping E rule in the same change.

Consumes [Graph](../graph/contract.md)'s parsing and graph checks. Aggregate verification does not prove
product-intent conformance, execute every contract's product checks or verify arbitrary code
dependencies. Intent approval belongs to [Delivery](../delivery/contract.md); file migration belongs to
[Installation](../installation/contract.md). Do not make verification another migration entry point.

Verification: `npm test -- test/verify.test.js test/principles.test.js test/contracts.test.js`,
then `npm test`. Policy/schema changes also require `npm run build` and `npm run build:check`;
follow the disposable-copy rule in [Distribution](../distribution/contract.md) first. Mutation validation
is documented in [CONTRIBUTING](../../CONTRIBUTING.md#schema-and-migration-validation).

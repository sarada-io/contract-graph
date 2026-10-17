# Verification contract

Parent: [repository](../../../../.agent/contract.md). Owns installed policy formats and the checks that establish
authored graph and scaffold validity.

## Surface and implementation

| Component | Owned implementation |
| --- | --- |
| Opt-in `cg contract dependencies --ecosystem dart` manifest correspondence | [dependency-check.js](../dependency-check.js) |
| `cg verify`, aggregate structural/scaffold checks | [verify.js](../verify.js) |
| A catalog validation and registered detectors | [binding.js](../binding.js) |
| Shared A/E/P format validation | [catalog.js](../catalog.js) |
| Policy loaders, paths, root/module/skill rendering helpers | [model.js](../model.js) |
| `cg harvest`, decision-harvest validation | [harvest.js](../harvest.js) |
| Authored policy and schemas | [principles](../../../cg/principles), [guidelines](../../../cg/guidelines), [schema](../../../cg/schema), [enforcement.yaml](../../../cg/enforcement.yaml) |

`model.js` currently combines loaders and rendering helpers. Its consumers span installation,
delivery and build. This is an existing shared seam, not a destination for unrelated new tools;
route new behavior to its responsible sibling and inspect affected exports before changing it.

Skill metadata accepts LF and CRLF line endings without rewriting source content; schema and folder/name checks retain the same authority.

### Bounded reading inside the larger files

| Task | Start here |
| --- | --- |
| Repository paths and default docs layout | `model.js`: `cgRoot`, `skillsRoot`, `guidelinesRoot`, `manifestPath`, `DEFAULT_DOCS_ROOT` |
| Enforcement or A/E/P catalog loading | `model.js`: `loadEnforcementCatalog`, `loadPrinciplesCatalog`, `loadEngineeringCatalog`, `loadProductCatalog` |
| Phase policy and allowed skills | `model.js`: `PHASE_NAMES`, `loadPhases`, `phaseTokens` |
| Validated YAML rule and index projections | `model.js`: `readPrincipleCatalog`, `parsePrinciples`, `loadPrincipleRules`, `parsePrincipleIndex` |
| Generated root and module discovery | `model.js`: `renderRootIndex`, `generateCgAgent`, `generateRoot`, `generateModulePointer`; caller is Installation's `sync.js` |
| Skill metadata and Claude wrappers | `model.js`: `parseSkillMetadata`, `renderClaudeSkillWrapper`, `generateClaudeSkillWrapper` |
| Scaffold or aggregate verification | `verify.js`: `verify`; follow only the relevant check |
| Skills, phase policy or binding checks | `verify.js`: `checkSkills`, `checkPhases`, `checkPrincipleEnforcement`, `checkEngineeringPrinciples` |

These are reading seams, not independently encapsulated modules. If `model.js` is physically
split later, separate catalog loading from discovery rendering first, inspect all importers,
and preserve its existing exports during migration. Do not turn it into a general utility bag.

`harvest.js` accepts compact per-decision JSON directories and legacy Markdown logs for resolved-ID eligibility. The human decision inbox is not an authority source after migration. Reject malformed records and symlinks; never infer approval from a pending record.

## Boundary promises

Read [repository architecture policy](../../../../.agent/architecture-policy.md) before changing rules or
architectural promises. It owns the promotion gate, rule classification and amendment policy.

A is global MUST, P scoped MUST, E advisory SHOULD. Contracts list P bindings only. Promote
guidance only with structural justification, a deterministic invariant, registered blocking
detector and fail-on-demand fixture; remove the overlapping E rule in the same change.

Runtime catalog projections consume validated canonical YAML once per load. Legacy Markdown/compiled JSON remains a stale-file error; YAML conversion belongs to Installation. The retired fork family has no runtime branches. Module discovery text comes from the single starter AGENTS template, rendered for the governed unit by `renderModulePointer`.

Consumes [Graph](../../graph/.agent/contract.md)'s parsing and graph checks. Aggregate verification does not prove
product-intent conformance, execute every contract's product checks or verify arbitrary code
dependencies. Intent approval belongs to [Delivery](../../delivery/.agent/contract.md); file migration belongs to
[Installation](../../installation/.agent/contract.md). Do not make verification another migration entry point.

Verification: `npm test -- test/verify.test.js test/principles.test.js test/contracts.test.js`,
then `npm test`. Policy/schema changes also require `npm run build` and `npm run build:check`;
follow the disposable-copy rule in [Distribution](../../distribution/.agent/contract.md) first. Mutation validation
is documented in [CONTRIBUTING](../../../../CONTRIBUTING.md#schema-and-migration-validation).

The CLI guidelines show surface filters existing loadEngineeringMap output by E entry/group IDs and category. Unknown selectors fail; filtering does not change advisory authority or retained phase policy.

generateCgAgent composes both the principle index and the release-owned CG BOOTSTRAP block. Historical shared entries receive the required launcher/authority instructions without replacing authored surrounding guidance; malformed block markers fail rather than discard content.

The Dart dependency diagnostic consumes Inspection-owned manifest facts and Graph-owned validated relationships. It maps each package to its nearest enclosing contract; cross-owner local package dependencies require direct dependency edges under this opt-in policy. Same-owner edges are internal, and graph-only edges remain visible without being presumed defects. Both runtime and development dependencies are labelled and checked. Partial/invalid input cannot report aligned. It executes no inspected code or declared commands, changes no contracts and registers no global A rule. Ordinary verify behavior is unchanged. Validate with test/dependency-check.test.js, the inspection suites and full npm test.

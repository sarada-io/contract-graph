# Architecture and engineering catalog review

Applied 2026-09-13 for 0.6.0. This change clarifies authored policy and agent procedure;
it adds no verifier rule, enforcement mechanism, or schema field.

## Authority and classification

A01–A12 describe graph protocol checks. A13 describes registration of built-in structural
enforcement. A14–A16 provide structural governance through declaration uniqueness and naming
checks; A03 also supports ownership governance through declaration cardinality.

A03, A10–A16 now state what their detectors actually check. One ownership string does not prove
one semantic responsibility. Unique normalized strings do not prove non-overlapping ownership.
Allowed names do not prove capability decomposition. Surface paths do not establish exported
symbols or caller confinement. Reciprocal verification references do not execute commands or
prove test adequacy. A13 applies to A registration; P has a separate enforcement-map contract.
All sixteen A IDs, detector implementations, and negative-fixture registrations are retained.

The graph protocol retains recursive decomposition, explicit ownership and entry, declared
edges, and stay/add-child/elsewhere decisions. It permits native functions, events, services,
and asynchronous interfaces. Self-sufficiency concerns owned responsibility and declared
interaction, not dependency frequency or a fixed count of types. Coordinated sibling changes
trigger review rather than automatic merging. Parent orchestration is distinct from child
internal control flow. A surface amendment can stay on a node when responsibility is unchanged.

Service facades and separate vendor adapters are explicitly advisory E01-03 and E02-06.
Vendor count does not automatically create a child. A technology-specific boundary can promise
technology-specific concepts; a consumer-independent core does not acquire unrelated consumer
workflow. Warmup, preparation, production, and human guides follow the same distinctions.

E05 infrastructure allowlisting moves from Structural Best Practices to Broader Engineering
Considerations. Shared infrastructure resources can support several independently owned uses.
Every E leaf now states a recommendation or its applicability. Reading E creates no acceptance
criteria, required changes, or blockers unless separately adopted through an authorized binding.

## Overlap resolution without breaking IDs

All 106 existing E leaf IDs and 23 group IDs remain. Two new leaves are appended within their
existing groups. No ID is retired, reused, or renumbered, so adopter references still resolve.
Overlapping entries now have distinct scopes rather than several universal formulations:

| Entries | Distinct scopes |
|---|---|
| E01 and graph.surface | Caller-review practice versus structural entry and promise. |
| E03-01–04 | Declared mechanisms, coverage, native controls, supplemental detection. |
| E06-01/02/06 | Timing of extraction, evidence from consumers, comparison of responsibilities. |
| E07-04/05/06 | Shared mechanics, domain accountability, justification for a generic abstraction. |
| E09-04/05 and E18-01 | Missing grants, failed authorization checks, other required preconditions. |
| E11-07/12 | Accountable owner versus coherent purpose of a configuration key. |
| E12-01 and E11 | Preference refers to configuration safeguards rather than duplicating their list. |

## Explicit applicability

Construction advice concerns runtime dependencies and side effects, not every object.
Confinement advice identifies coverage and does not silently install a blocking policy.
Focused verification allows necessary integration and repository gates. Reuse need not wait
for a second consumer when a library has an explicit independent purpose. A logical write
owner can have multiple processes or replicas. Persistence compatibility can use record,
envelope, or dataset versions and an explicit migration or conversion policy.

Deployment topology follows operating needs rather than mirroring the contract hierarchy.
Confirmation follows an action policy and existing authorization. Scheduled and self-service
account removal can be authorized and attributable. Erasure distinguishes request acceptance,
declared coverage, exclusions, and verified completion. Runtime policy can live in managed
configuration with appropriate controls. Small-team operating choices are conditional.
Safe degradation preserves required correctness and authorization; otherwise the affected
operation is rejected. Latency objectives and measured tails do not claim mathematical bounds.
Reasons describe concrete failure modes instead of equating accounts, screens, runtime events,
and infrastructure resources with contract nodes.

## Completeness and future promotion

Existing graph checks also cover unique contract IDs and units, route-target resolution, and
transient-authority references. These remain implemented checks; no new A identity is assigned
merely to expand the catalog inventory.

Potential E-to-A promotions remain future verifier work:

- E01/E03: declared-surface consumption, with language-aware import/export coverage and a bypass fixture.
- E04-03: artifact ownership, with machine-readable ownership and conflict/missing-owner checks.
- E07-01: dataset ownership, with explicit dataset identities and ownership checks.
- E06-05: library independence, with a precise consumer relationship and prohibited-edge detector;
  A09 already rejects declared dependency cycles.

Each promotion requires structural impact, one deterministic measure, a blocking registered
detector, and a negative fixture in the same verifier-owning change. Broad product, deployment,
billing, and authorization preferences remain E or deliberately adopted product-specific P.

## Adoption

Existing installations keep their catalogs and workflow on init. Review the catalog and protocol
wording changes deliberately before adopting them. Updated skills defer to the installed graph
and phase policy; reading E is separate from accepting its preferences. No contract schema,
enforcement schema, or public principles-schema bytes change in this review.

## Validation

- Full suite: 372/372 passed on Node 26.3.0 and Node 18.17.0.
- Generated catalog corpus: 6,790 schema-invalid mutations rejected by runtime validation.
- All seven edited lifecycle skills passed structural validation.
- All existing A IDs, detector/fixture registrations, hierarchy transitions, and three schema
  files match the committed baseline; the site's principles-schema copy still matches.
- All existing E IDs remain; E01-03 and E02-06 are the only added leaf IDs.
- Build, 79-file reproducibility check, package generation, and extracted-package tests passed.
- Diff whitespace checks passed. Local Finder metadata was removed from the source asset tree
  after the scaffold-inventory test correctly rejected it.

Packaging assertions compare authored and shipped catalog bytes. Catalog tests retain authority,
ID inventory, detector registration, grammar, and graph behavior checks instead of asserting
outdated policy sentences. No runtime detector or negative fixture was removed.

Automated checks do not establish that a live agent interprets every recommendation correctly;
that remains part of the adopting-repository trial. The tarball is rebuilt locally, not published.

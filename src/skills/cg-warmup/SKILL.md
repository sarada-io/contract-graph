---
name: cg-warmup
description: Establish owner-confirmed project intent in new and existing repositories, adopt the current structure of existing code, or reseed a graph after a package upgrade. After cg init. Adoption is four phases — a whole-repository survey, a resumable per-module loop that writes and connects each unit's contract.yaml, a recursive leaf audit for component contracts, then one consolidation. Reseed walks governed leaves additively — new child contracts, new P rows, route targets — and never overwrites existing purpose or P IDs. Finds any predecessor governance framework on adoption and carries its rules forward rather than writing over them. Resumes from cg modules after a context break rather than restarting. Never reports a compliance score, edits behaviour, deletes or runs the predecessor, or marks a rule enforced that no detector proves.
---

# CG Warmup

Read the shared Lifecycle bootstrap in `.agents/cg/contract-graph-agent.md` once per session; reuse unchanged context and load only the references required for this task.

For chat, decision reviews and results, read [owner communication](../cg-unblock/references/owner-communication.md). Explain outcomes and choices for functional leaders; keep framework commands and approval mechanics in internal evidence.

Warmup establishes intent for every repository after init: greenfield, brownfield and reseed. Accepted intent describes what the repository is for; contracts describe its current structure. Existing code is evidence of conformance, not authority to discard an accepted requirement. Complete the shared intent step before claiming adoption readiness.

**Never delete this skill.** `cg verify` requires all six skills, and a later module tree still
needs these instructions.

Warmup declares an existing cohesive surface and records the controls that protect it before
proposing restructuring. Assess the named surface first; propose a split or merge only once
its promise and ownership are clear. It must not add wrapper types or move code solely to impose a source-layout convention.
If the existing surface mixes distinct responsibilities, exposes details outside its declared
promise (`graph.surface.encapsulate`), or puts consumer-specific workflow into a consumer-independent
core, record the structural finding for `cg-plan`. Apply `graph.adapters` to responsibility, not
vendor count. Missing mechanical confinement is an explicit coverage gap; E03 alone does not
authorize a blocking control or restructuring. The owner validates the corrective programme.
Warmup does not rewrite the code.

`graph.surface.service` describes one entry style. Declare an existing cohesive surface using
its native functions, services, events, or other supported entry kinds. Missing service types
alone do not justify a corrective Step. E01-03 is advice about a facade, not a node per file
or a required rewrite.

Read `.agents/skills/cg-unblock/SKILL.md` when a fork remains unresolved by contracts and
accepted decisions or requires owner authority. Ask directly under D-6 and continue independent
work while recording the response.

## Choose the work

Read [intent](references/intent.md) for initial intent or stale approval; reuse unchanged approved intent. Greenfield work stops after intent and root verification; do not run adoption against an empty repository. Load only the selected mode, not every linked reference.

## Check readiness before selecting a mode

**Reconcile retained policy explicitly.** Read `.agents/cg/phases.json` and `.agents/cg/workflow.md`, including init's policy notices. Identify retired stages and differences from the installed skill loop. Repository-owned family-loading choices remain authoritative and E remains advisory; conditional E does not disable the structural responsibility review. Resolve an incompatible stage route before dependent execution, using existing authority or the normal decision route. Do not overwrite retained policy just to match defaults or claim that successful init adopted the new workflow.

**Finish any pending product upgrade first.** Inspect `.agents/cg/guidelines/product.yaml`
before verification. If it still declares the supported legacy `productVersion`, init may have
preserved it because required rationale was missing. Do not run whole-catalog migration: init
already refreshed A/E defaults. Read the existing P statements and their consuming contracts,
then bounded implementation and durable decisions to propose the missing reasons. Present them
as proposals, distinguishing recorded rationale from inference; obtain the owner's confirmation
before treating inferred rationale as policy. Do not invent placeholders, delete rules, or
renumber IDs to make validation pass.

Prepare a temporary JSON object mapping only missing P IDs to the confirmed reasons and run
`cg init --yes --reasons <temporary-file>` from the repository root (saved docs/profile settings
are reused). The agent prepares the file; the user need not author JSON. Remove the temporary
file after success, run `cg verify`, and then continue adoption or reseed below. If init reports
malformed or unsupported content, resolve that finding explicitly; never bypass schema validation.
On interruption, inspect the actual product catalog again; an already-current catalog needs no
migration or reasons file. Do not report the upgrade complete until verification passes.

**Confirm the installed binding can recurse.** Run `cg verify`. If it fails because
`.agents/cg/principles/architecture.yaml` is missing `hierarchy.kinds` or `graph.recurse`, the
catalog is older than this skill. Refresh it with `cg init`, which previews A/E replacement and
backs up previous catalogs, or confirm a deliberate amendment. Do not write nodes against a catalog that
cannot recurse.

Resolve `<docs>` from `.agents/cg/profile.json` `docs` (default `docs`). Confirm with `cg residue`.
Then run:

```bash
cg modules
```

| `cg modules` | Mode |
|---|---|
| any **UNMAPPED** or **DESCEND** | **Adoption / resume** — [adoption procedure](references/adoption.md#how-this-skill-runs--adoption--resume) |
| exit 0, all governed | **Reseed** — [additive procedure](references/reseed.md); no predecessor survey or template overwrite |

The contracts already on disk are the baseline, not a predecessor. Predecessor search in adoption §1 runs
on adoption only; `cg-*` stays excluded. Consecutive reseed with unchanged cues is a no-op.


For adoption or interrupted mapping, read [adoption](references/adoption.md). For an explicit upgrade/reseed with governed roots, read [reseed](references/reseed.md). Module coverage alone does not select intent or greenfield work. Apply [responsibility review](references/responsibility-review.md) to affected boundaries.

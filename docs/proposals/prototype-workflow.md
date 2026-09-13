# Faster human feedback and prototype delivery

Status: Design record — implemented in the working tree; project timing trials remain outstanding

Date: 2026-09-09

This review motivated an optional `/cg-prototype` entry path that reaches a usable
application early, incorporates manual feedback, and hands an accepted result to the existing
prepare → produce → sign-off lifecycle. The standard workflow should also avoid repeated
verification when evidence remains valid. Both changes serve the product's purpose: use the
contract graph to find and confine work, then spend engineering effort on the outcome.

The implementation is described in [Prototype](../prototype.md), including declared review scope and whole-repository final fingerprints, durable receipt location, upgrade behavior, and limits of merge enforcement.
The tables below preserve the rationale and original acceptance objectives.

## Evidence and limits

The owner reports slow feedback cycles in gamome-core and mandala-tool. In gamome-core, repeated
development and automated verification delay UI/UX refinement; mandala-tool also took too long to
become reviewable. These are reports of repeated impact, not measured traces. This review inspected
Contract Graph's shipped procedures and routing code, not either application's sessions, installed
workflow amendments, test durations, or build performance.

The source establishes plausible causes. It does not establish how much time each consumed in
those projects or prove that all prescribed checks actually ran.

| Source finding | Consequence | Recommended change |
|---|---|---|
| [Plan](../../src/skills/cg-plan/SKILL.md), [prepare](../../src/skills/cg-prepare/SKILL.md), and [produce](../../src/skills/cg-produce/SKILL.md) each require graph verification and the narrowest useful baseline on admission. | Adjacent stages can repeat a command against unchanged inputs. | Permit evidence reuse when relevant inputs and environment match; rerun when applicability cannot be established. |
| Prepare includes Step checks and graph verification in `Done when`; produce additionally requires the full build-and-contract gate. | Checks can overlap, and a full application gate is required even when preparation selected narrower scope. | Preparation assigns verification explicitly; produce executes it without adding an unconditional second full gate. |
| [Sign-off](../../src/skills/cg-sign-off/SKILL.md) requires full verification at admission and during accumulated-state review, then repeats Step verification at confirmation. | The prose can cause repeated execution on the same final state. | Maintain one evidence inventory and final verification pass; invalidate affected results after repairs. |
| [Workflow](../../src/cg/workflow.md) requires a corresponding test file or method for every new or materially changed class. | Class shape can determine test work independently of changed observable promises or existing coverage. | Require adequate coverage of changed behavior and invariants, adding tests when existing coverage is insufficient. |
| Workflow broadly says behavior changes without contract edits are incomplete; [lifecycle](../lifecycle.md) allows internal changes with no changed contract facts. | Agents can make unnecessary contract edits to satisfy an overbroad sentence. | Always assess contract impact; edit contracts when declared facts change. |
| There is no first-class exploratory implementation path before preparation. | The user may review the experience only after substantial planning and automation protect a design they want to change. | Add `/cg-prototype` for outcomes that need direct experience to settle. |

Preserve existing controls that already help: produce drains ready Steps, auto-run retains one
Engineer through a phase, and re-preparation is needed when scope or ordering changes rather than
for every repair. Phase composition checks are already distinguished from Step checks. Stage
boundaries remain useful for individually invoked skills; authorized auto-run already supplies
continuation. Slow feedback is not a reason to remove those choices or silently chain stages.

## Two entry paths, one delivery model

| Situation | Entry and outcome |
|---|---|
| Desired behavior is sufficiently understood | `/cg-plan` produces a roadmap for preparation. |
| The user needs to use the result to settle desired behavior | `/cg-prototype` produces a working, explicitly accepted prototype and the same kind of roadmap. |
| Existing ownership is insufficiently mapped | `/cg-warmup` establishes necessary context before either route proceeds. |

The new skill is optional to invoke and first-class in the shipped workflow. It is not a separate
plugin, a repository-wide test-disable switch, or a second version of every delivery skill.

```text
understood outcome → plan ────────────────────────────────┐
                                                        ├→ prepare → produce → sign-off
uncertain experience → prototype ↔ human review → accept ┘
```

The prototype route begins with a short contract and execution-context check, launches the
application using existing instructions, and makes a small reviewable change. A complete roadmap
is not required before the first preview. Missing launch prerequisites are reported specifically;
an agent cannot claim to have reviewed an application it could not run.

Feedback inside agreed scope directly authorizes the next iteration. Ordinary visual changes do
not create new phases, prepared Steps, or decision-log ceremonies. Expanded ownership, a new public
dependency, or a consequential product choice requires an explicit scope or decision update. One
working context continues through review, preserving unrelated changes.

## Verification at the right point

| Point | Required evidence |
|---|---|
| Prototype iteration | A usable preview, attributed manual observations, recorded gaps, and truthful contract facts. Application test authoring and suites are deferred. |
| Prototype handoff or changed graph | Graph verification and an exact account of current implementation state. Graph verification does not prove application correctness. |
| Standard delivery Step | Checks for changed promises, invariants, and affected consumers; applicable binding detectors; graph verification. Broader checks when scope or repository policy requires them. |
| Final delivery | Required Step evidence valid for the final state, composition and acceptance checks, the repository's full delivery gate, and no unresolved in-scope defect. |

Commands needed to build or launch a preview remain necessary. Opening an application for manual
review is distinct from automated browser regression testing. Application and browser test
authoring and execution are deferred during the prototype loop while the user assesses the result.

Evidence reuse is conservative. Contract Graph does not yet calculate safe implementation impact
or dependency closure automatically. A reusable result needs its command and outcome, relevant
source and test content, configuration and dependency identity, and environment or external-state
assumptions. Changed inputs invalidate it. A new host, changed worktree or lockfile, unknown impact,
or time-sensitive external check can require rerunning. An earlier green commit alone is
insufficient. Full checks remain necessary when narrower coverage cannot be justified.

No binding detector is weakened or removed to accelerate a prototype. Classify the responsibilities:

- Graph protocol keeps contracts valid, connected, and traversable.
- Structural governance keeps ownership, edges, surfaces, and declarations aligned with code.
- Test scheduling, class-level coverage policy, human acceptance, and merge eligibility are
  repository delivery policy rather than new global `A` rules.

`P` remains specific to the adopting product; `E` remains non-binding guidance. A prototype is
provisional, not permission to misrepresent contracts. Discovered behavioral violations remain
explicit findings and cannot become verified delivery handoffs. Deliberate changes to promises
require contract amendments. Known failures and checks not run are stated separately.

## A small record that survives the session

One evolving programme roadmap holds the objective, selected contracts, starting revision and
worktree, cumulative changes, current feedback, consequential decisions, review conditions, known
gaps, approval evidence, and emerging delivery phases. Exact edits remain in source control or a
recoverable worktree snapshot; the document explains their meaning rather than transcribing every
adjustment. Supporting evidence is linked from the roadmap for residue detection.

Use the existing decision mechanism for consequential forks. Simple feedback stays in the prototype
record. Suggested prototype states are Iterating, Awaiting review, Approved, Handed off, Suspended,
and Abandoned, separate from existing Step and programme completion states. Abandonment never
automatically deletes code or unrelated work. A user may keep a prototype indefinitely; elapsed
time is neither acceptance nor delivery completion.

Approval identifies scope, reviewed screens and interactions, relevant devices and data, accepted
source revision or snapshot, and the user's actual response. Approval of one adjustment need not
approve the whole initiative; screenshots cannot establish interaction approval. Later visible
changes reopen only affected acceptance.

After acceptance, the roadmap satisfies the ordinary planning handoff: observable phase outcomes,
dependencies, acceptance gates, and concrete remaining work. Another plan invocation is needed only
when programme questions remain unresolved. Planning rules should have one maintained source,
rather than being copied into two skill bodies.

## Admission into normal delivery

Preparation accepts a measured, provisionally verified implementation and assigns its completion
obligations. It identifies code to retain, refine, replace, or remove; deferred tests; incomplete
behavior; integration gaps; contract impact; and existing failures. It does not mark the prototype
as a green prerequisite or rebuild it by default.

Workers must receive actual accepted prototype changes, including relevant uncommitted files. A
roadmap referring to code absent from a fresh checkout is not a valid handoff. Existing sequential
execution and write ownership continue after admission. Starting exploration over an active queue
also requires accounting for affected Steps and invalidated evidence before dependent work resumes.

Produce completes assigned implementation and verification together. Sign-off evaluates delivery
and routes repairs; it does not become a large deferred implementation stage. Accepted behavior
is preserved unless evidence requires a change, which reopens affected human acceptance.

Auto-run begins with the accepted roadmap and recorded user authority. Experience acceptance alone
does not grant execution authority; previously granted authority remains valid within scope. The
normal Manager and Engineer model, recovery records, and phase boundaries apply. Auto-run does not
invent approval or automatically initiate another exploratory loop. Independent authorized work
can continue while a consequential decision awaits the user.

## Merge eligibility is separate from prototype progress

For repositories adopting merge protection, prototype PRs visibly state that application
verification is incomplete and final sign-off is pending. Draft status and labels communicate
intent. An independent required delivery-readiness check supplies the actual gate. GitHub supports
required checks through [protected branch settings](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

The proposed check associates prototype work with the actual change and requires current closure
evidence and passing delivery checks. Removing labels, changing a status word, or deleting the plan
must not erase the obligation. Durable closure evidence survives plan cleanup without making plans
the authority for contract rules. Later changes invalidate affected evidence. Repository protection
and bypass configuration remain part of enforcement; a local skill cannot prevent administrator
bypass or prove human satisfaction.

The trusted PR-to-prototype association, closure record format, and protection of the checking
workflow still need implementation design and negative fixtures. Until built and adopted, do not
claim prototype merging is blocked. The existing optional host dispatch hook is not a merge gate
and allows dispatch when its own command resolution fails.

## Planned implementation sequence and acceptance

| Change | Acceptance outcome |
|---|---|
| Consolidate standard verification responsibilities | One documented execution of each required check for applicable inputs; no unconditional duplicate full gate; changed promises remain covered and bindings intact. |
| Add prototype discovery and recovery | A usable preview without prepared Steps or application test automation; a fresh session recovers scope, feedback, changes, and gaps. |
| Add prototype admission and scoped routing | Approved prototypes yield valid preparation input; unapproved prototypes cannot dispatch dependent delivery; unrelated initiatives retain their route. |
| Complete delivery and auto-run integration | Workers receive actual prototype code, complete deferred work, handle corrective feedback, and close through existing sign-off. |
| Implement adopted merge protection | Negative fixtures reject missing, stale, deleted, or merely self-declared completion; configured repository checks block unfinished delivery. |
| Trial and publish adoption guidance | Real host observations demonstrate the loop and recovery; installed repository choices survive upgrade and amendments are explicit. |

Affected surfaces include skills, workflow context, skill catalog and discovery, phase policy,
queue routing and optional hook, residue and closure handling, installer compatibility, tests,
and human documentation. The root contract, workflow, and phase policy are preserved on upgrade
today, while skills are replaced. Adding a skill requires checking preserved catalog discovery
and policy compatibility as well as installing its folder. No silent policy overwrite is proposed.

New machine-enforced lifecycle checks need fail-on-demand fixtures. Regression coverage includes
ordinary work, multiple initiatives, interrupted review, changes after approval, admission with
failures, unrelated dirty files, cleanup, and resumed auto-run. Runtime and scaffold changes require
the full repository test suite; host interaction needs a real host trial. Implementing this
extension does not waive this repository's contributor requirements.

## Measure the complete cycle

Use gamome-core and mandala-tool as intended pilot contexts when their records and environments
are available. Record request-to-first-preview time, feedback-to-next-preview time, active agent
time versus human wait, automation discarded after feedback, time to acceptance, time from
acceptance to final delivery, and defects or reopened acceptance during completion. Attribute
launch cost, discovery, preparation, implementation, checks, and stage administration only where
evidence supports it.

Compare comparable changes and disclose scope, host, and maturity differences. Success means
earlier useful feedback and lower total delivery effort without unresolved contract findings or
increased post-acceptance rework. Do not claim a numerical speedup until measured. Pilot
measurements remain outstanding; this is a source-level review and proposal, not a timing diagnosis
of either application.

# Review implementation responsibilities

Use this procedure when adopting or reseeding existing code, establishing technical readiness, introducing or changing an implementation path, and signing off implementation or test changes. It applies the installed architecture catalog's `graph` decisions; it does not introduce another rule family, detector, ledger or approval stage. Engineering preferences remain advisory even when their reading is conditional. A valid graph, one `owns` sentence, matching exported symbols or passing behavior tests do not establish cohesive or unique implementation ownership.

## Select bounded evidence

Start with the routed contract, its parent and affected callers. Identify the actual operations and state being changed, then look for existing implementations of those responsibilities in relevant siblings and consumers. Follow contracts before reading their source. If the graph omits a plausible owner, use a targeted symbol/caller or task-term search to find it and record that routing gap. Search beyond the edited files when comparing a parallel path requires it; do not turn each change into a whole-repository audit.

During warmup, apply this comparison across the surveyed siblings as well as within leaves. In production, revisit it when a second implementation, compatibility conversion, new consumer or mixed responsibility appears. At sign-off, check the final diff and relevant unchanged counterparts; reusing the author's placement claim without source evidence is insufficient. No second agent is required.

## Compare meaning, not just declarations

| Signal | Evidence to examine | Decision to make |
| --- | --- | --- |
| Parallel transports, loaders, sessions or adapters | Compare operations, mutable state, ordering, failure handling and reasons to change in both implementations. Include resolution before a shared compiler and lifecycle around a shared port. | Name the common responsibility and its owner, or explain the different promises that justify separate implementations. Keep framing, key derivation, authority and private projections separate when their semantics differ. |
| Old and new models or parsers | Trace runtime callers, conversions, corresponding collections and public compatibility consumers, including exports and external API commitments. Search references to superseded parsers and entry paths. | Name the runtime source of truth and compatibility boundary. Repair internal dual ownership when it violates the intended design; if transitional, name remaining consumers, retirement condition and owned work. No repository callers alone is not permission to remove a public API. |
| A growing coordinator, broad `owns` or a leaf behind one facade | Enumerate internal operations and their change reasons: parsing, policy, I/O, interaction, layout and lifecycle can be distinct even behind one entry. Inspect actual coupling and calls. | Apply stay/add-child/elsewhere to those responsibilities. One pipeline, one class or one public facade is not a sufficient leaf rationale. Size prompts review; neither a line threshold nor moving methods into files proves improvement. |
| Repeated setup, selection or lifecycle behavior | Compare setup/teardown, selection state and commit behavior across consumers; identify who owns authority and projections. | Share only behavior with the same promise. Keep consumer-specific state and decisions with their owner. A reusable abstraction must not couple unrelated consumers. |
| Similar test loaders, builders, ports or no-op policies | Read affected tests and existing support fixtures directly; ordinary source inspection excludes tests. Compare configuration, assertions and failure injection. | Reuse stable setup where it has the same meaning. Keep independent oracles, game/domain-specific assertions and intentional failure behavior distinct; do not make tests reproduce production logic. |

Challenge the contract against accepted intent as well as the code. Do not broaden `owns`, add synonyms, or assert inseparability merely to legitimize the implementation. A shared responsibility can remain behind an existing owner; extraction does not automatically require a new contract. Conversely, a distinct self-sufficient responsibility requires the graph decision even if it sits inside a single file.

## Record a decision and its evidence

Use the existing warmup finding, roadmap item or preparation record during discovery and production. At sign-off, put the final review in the existing acceptance/sign-off evidence retained by the receipt. Do not create a permanent duplicate report. Record the reviewed scope, relevant counterpart paths and symbols, the comparison, owning contract, decision, supporting checks and remaining limitations. An unchanged baseline may be reused only after checking its inputs and the final diff.

| Finding or reviewed responsibility | Compared implementations and evidence | Owner and decision | Disposition and validation |
| --- | --- | --- | --- |
| Encrypted-message ordering repeated in two transports | Both peers own send queues, directional counters and read gates; transport framing differs | Existing communications owner supplies message lifecycle; transport adapters retain framing and key derivation | Repair within the item; exercise both adapters, ordering and failure paths |
| Two similarly shaped test builders | One produces valid input; the other deliberately violates a bound | Test owner keeps independent failure fixture | Separate intentionally; cite the negative assertion and why sharing would hide it |

These are examples, not required designs. A small cohesive change can use one short paragraph naming the checked counterpart or targeted search and why no overlap was found. A generic “no duplication,” a parser digest or a graph-pass result alone is not review evidence. Explicitly account for the applicable signals above; irrelevant signals need no boilerplate rows.

## Dispose of findings without losing them

- **Repair:** an introduced or worsened ownership defect, or an existing defect that prevents the agreed outcome, returns to production within scope. Add focused positive/negative checks for concrete promises where feasible. Sign-off waits for the repair and fresh evidence.
- **Keep separate:** cite different semantics, independent change reasons or a concrete extraction cost. This is a reasoned architectural decision, not permission to bypass a binding or accepted requirement.
- **Follow-up:** a pre-existing issue outside the accepted outcome has a named owner, exact evidence, bounded corrective work and an explicit explanation of why it does not block this result. Preserve the finding with its active consumer when deleting the completed plan. Do not silently defer a defect introduced by this work, waive a binding, or expand scope to refactor the repository.
- **Unresolved:** missing required evidence or disputed ownership remains an open obligation; investigate or use the existing decision route. Neither a passing gate nor UX acceptance settles it.

Warmup records required restructuring in its existing corrective set without changing behavior. Production implements settled corrections under existing authority and records legitimate finishing obligations. Prototype may defer implementation cleanup to its handoff, but must name it and keep contracts truthful. Sign-off cannot claim structural review complete until applicable findings have valid dispositions. Standalone documentation needs only the review applicable to its claims; test-only work reviews fixtures without pretending a production parser analyzed them.

This is an evidence-backed agent procedure. `cg verify` checks authored declarations and registered detectors; `cg contract inspect` supplies syntax evidence; `cg delivery close` preserves sign-off text and executes the supplied gate. None automatically proves semantic uniqueness or the quality of this review.

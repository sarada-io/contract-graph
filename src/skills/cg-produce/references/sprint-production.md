# Produce the selected sprint

Use this procedure only for an agreed `Delivery: sprint` roadmap with execution authority. Read the sprint definitions in cg-plan when unfamiliar. Select the Current sprint and the owner's requested scope from the same roadmap; do not select by directory age. A request to implement a preview ends at review. A request to complete a sprint or epic owns necessary finishing after acceptance. Record the actual request, never an inferred approval.

The cg-produce entrypoint owns the mandatory batch/per-item review choice and the final item/Code/Test/Docs report. Resolve and persist that choice before starting.

## Start or recover the working loop

Use the shared delivery record for working-result review: `cg delivery start --programme <slug>` preserves an existing roadmap. Both development loops use this record; it does not select a sign-off sub-flow. Read cg-prototype's session-setup reference to declare writes. For a suspended or abandoned sprint, use its existing cg delivery resume command only after an actual request to resume, then re-enter cg-produce. The normal production gate stays closed while it is suspended. Existing records are resumed from their actual state; do not reset a valid approval or completion request casually.

For an actual full-completion request, record `cg delivery request-sign-off --programme <slug> --session <actual-session-id> --evidence <request.json>` with by, response and scope identifying the sprint ID/name or entire epic. This is allowed at sprint start because completion was explicitly requested; never record it merely because a plan exists. Receipt evidence owns that authority. The roadmap links it. Scope is attributed evidence, not authenticated identity or a machine-interpreted permission language.

Use `cg status` and `cg next --programme <slug>`. The sprint marker routes iteration to produce; a Handed off receipt routes to the common sign-off procedure, with eligible implementation repairs returned to produce. Preserve one execution context, unrelated changes and declared ownership. Use [coordinator and specialists](coordination.md) when bounded delegation helps; automatic continuation also works with one agent. Respect any stricter repository-owned workflow policy; propose a specific reconciliation if it prevents the requested loop.

## Prepare and implement incrementally

Select dependency-ready implementation items in agreed priority order, allowing mixed Features, Bugs and Tasks. Before each coherent change, add or revise the item's short preparation in the master roadmap: intended behavior, bounded editable surface, dependencies/starting state, affected contract promises, immediate checks and deferred obligations. Route through contracts before source reading. This is internal preparation, not another whole-plan approval or a file-by-file speculative queue.

Keep technical queues sequential. Within the shared coordination rules, bounded specialists can contribute to the current Step or independent items in a batch without a technical queue. Implement all authorized items in the agreed review batch before returning for review, unless a real blocker or risk requires earlier feedback. Recalculate readiness after each change or decision. Continue independent items while a blocked item waits; never consume its unavailable output or mark it complete. Eight related feedback corrections can be one batch, not eight plans.

Keep current contract boundaries, surfaces, relationships and invariants truthful. Compare each changed promise against accepted intent and relevant callers. Classify it as clarification, compatible extension, implementation correction or material promise change. Existing authority covers compatible work; ask only for a consequential choice lacking authority. Do not rewrite a reusable promise to make one example pass. For a reusable boundary, exercise an unrelated valid example or negative case when it tests the changed promise; domain-specific boundaries do not owe universal genericity.

Defer unstable application tests and final user documentation during this review loop, listing each necessary obligation once against its item ID. Keep launch/build checks, graph checks when contracts change, binding detectors and checks needed for safe execution now. Stable non-UI logic, data migrations, security boundaries or hard-to-reverse changes may require focused early tests; explain that choice from the risk, not a universal ban on tests. Do not delete existing meaningful tests or weaken expected behavior merely to make the preview green. Record measured failures as gaps. A Step from an existing prepared queue retains its assigned gates; sprint mode does not waive them.

## Review a working result

Use the existing launch path or non-UI demonstration. Report implemented items, review conditions and known gaps. For batch review, show the combined result. Do not claim visual inspection without access.

Run `cg delivery review --programme <slug> --session <id>` at the review checkpoint. Capture actual acceptance with `approve --evidence <approval.json>` containing by, response and scope naming the sprint and item IDs. Follow cg-prototype's snapshot and changed-scope rules. Plan agreement, permission to execute and UX acceptance are distinct. Checks-only outcomes can use an explicitly agreed objective review condition; record actual evidence and attribution, never invent an owner's response. The CLI approval record is attributed, not an assessment of satisfaction.

For corrections, resume the same receipt and keep the same plan/items. Resume clears the active completion request; re-record the original still-applicable request from its preserved history or the conversation, keeping its original words and scope. Do not expand authority or require the user to repeat it. Consequential changes to an accepted experience need affected review; an internal repair does not reopen unrelated choices.

At each review, mark only the reviewed items Accepted. While implementation items remain in the selected sprint, retain their incomplete states and follow the continuation rules below; do not hand off the whole sprint. Once the sprint’s implementation is accepted, reconcile the Phase map, programme gate and Deferred tests and known gaps before handoff. The receipt's handoff validates the whole roadmap structure; its approval scope names the selected sprint, not automatic acceptance of Future sprints. Run `cg delivery handoff --programme <slug>`. Mark reviewed items Accepted, leaving finishing Tasks incomplete.

## Continue within authority

After per-item acceptance, if implementation items remain in this run, resume the same receipt, preserve the accepted item’s evidence in history and the roadmap, restore the still-applicable completion request, and develop the next dependency-ready item. Do not hand off the whole sprint merely because its first item was accepted. Batch review occurs when eligible implementation is exhausted; blocked items and their dependents remain incomplete.

Choose the next action using the cg-produce entrypoint’s remaining-obligation rules. Under an existing completion request, enter cg-sign-off’s delivery completion when accepted work has required finishing or combined verification outstanding. Pending human acceptance blocks dependent finishing; continue independent assessment meanwhile. With implementation-only authority, return at the requested boundary, describing actual remaining sprint obligations. When the requested result and all applicable acceptance and verification are complete, report None; never recommend sign-off just to supply another skill name.

For hook-equipped hosts, use a stable session ID (the host task ID when available) and selected `CG_PROGRAMME`. The hook remembers which sprint programme this session admitted through produce; an active completion request for that programme permits scoped stage continuation; after recovery enter sign-off to admit the preserved request. Do not use a blanket gate bypass. Produce never marks a sprint Complete merely because code is reviewable.

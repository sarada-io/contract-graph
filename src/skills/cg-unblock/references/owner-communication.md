# Communicate with the person directing the work

The primary audience is senior leadership in functional roles. Explain the customer or staff experience, business outcome, tradeoff, cost, risk and choice. Use a technical term only when necessary to make the choice accurately, and explain it on first use. Apply this to chat, harness questions, decision reviews, progress updates and completion summaries, even when a retained repository workflow has older technical response labels.

## Decision review

Use a short title stating the question, then only these four fields:

- **Context/background:** What happens today, what needs to change, and why an answer is needed now. Link the concrete proposal or preview when useful. Say which outcome waits if it matters.
- **Options:** Real alternatives, each with its practical consequence and material downside. Accept a different answer in the conversation.
- **Recommendation:** The option the agent recommends and what it will do if chosen. If evidence is insufficient, recommend the smallest investigation that would settle the choice.
- **Why:** Why that option best meets the agreed goal, including its main tradeoff and uncertainty.

Do not add labels such as authority, disposition, cohort, blocking gate, snapshot, DU/DA, scope IDs or verification commands. Do not make the owner open an internal record to understand or answer the question. Ask through the host's question tool when available, with the same functional wording. A normal conversational answer is enough; the agent records it.

Keep unanswered reviews together in `<docs>/plans/decision-log.md`. Link relevant plans, prototypes or previews from Context/background; the owner should not hunt through separate files for open choices. Internal records link the review to its owning work. Remove answered questions after their actual answer and necessary evidence have been saved, rather than growing a completed section.

Only choices requiring the owner's judgment belong in these reviews. Routine implementation details use the existing assumptions/checkpoint. A successful check, progress update, repeated question, unchanged approval or list of files created is not a decision. An already authorized choice should be applied, not offered again.

## Internal evidence and cleanup

Agent evidence lives separately in `.agents/cg/decisions/`, one compact JSON record per material decision. Read [the decision record format](../assets/decision-entry.template.md) for fields, allocation, legacy migration and deletion. The human log contains no counters, technical metadata or internal approval categories.

After an answer, save the actual response and exact reviewed proposal internally, update the agreed outcome, and remove the human question. Keep agent records only for active consumers, uncompleted preservation obligations or explicit retention needs. At sign-off preserve useful meaning and required authority in their existing durable owners, then delete irrelevant decision files. Do not archive every decision or merely move an accumulating log. Pending and shared decisions stay linked to their active work. A JSON record's existence is not proof of owner approval.

## Progress and results

Report what was checked and what it establishes. Instead of “cg verify passed,” say “Checked that the responsibility map is connected and its declared files exist.” That check alone does not establish that checkout, payments or other product behavior works. Say “Verified that an expired invitation cannot be used” only when the applicable behavioral check actually passed. Explain a failed or unrun check as the resulting uncertainty and its practical impact.

Keep commands, raw results, file inventories, hashes and technical routing in internal evidence. Show them when the user requests technical details or must perform the action themselves. Lead the next action with the work or choice (“Review the export preview” or “I’ll finish the agreed checks”), not a framework command. Do not ask the owner to invoke another skill when existing authority permits continuation.

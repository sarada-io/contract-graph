# Decision records

The human review lives in `<docs>/plans/decision-log.md`, resolved from `.agents/cg/profile.json`. It contains only unanswered questions, with Context/background, Options, Recommendation and Why. Use a plain question as the title and an invisible anchor such as `<a id="du-01"></a>` for linking; do not expose internal categories or identifiers as review labels.

Agent evidence lives in `.agents/cg/decisions/`, created on demand. This is the installed framework's plural `.agents/` directory, not the Dev Kit's singular maintainer `.agent/` map. Store one compact JSON object per decision, named `DU-01.json` or `DA-01.json`; omit unused optional fields. Do not copy this instructional text into either record.

```json
{"id":"DU-01","status":"pending","scope":"exports / sprint 1","decision":"Choose who can export customer records","review":"docs/plans/decision-log.md#du-01","options":["Managers only","All staff"],"reason":"Balance access with the risk of sharing customer information"}
```

For a resolved record, change `status` to `resolved`, set `decision` to the scoped outcome, and add `authority` describing the actual approval or prior authority. For an owner answer, retain `response` with the verbatim answer, actor, date and conversation reference. Preserve the exact reviewed proposal/options before removing the human review. A link to a deleted page is not approval evidence. Use `dependsOn` only for actual decision dependencies, `consumers` for active work needing this record, and `retainUntil` for the condition that allows its removal. Exact source/snapshot evidence belongs here only when the applicable approval requires it. Never fabricate an answer, date or actor.

`DA-NN` records a material choice settled by existing authority; `DU-NN` records one needing an owner answer. Routine reversible implementation choices stay in the existing assumptions/checkpoint, not another JSON record. No record is needed for passing checks, progress or unchanged approval.

Use `.agents/cg/decisions/_sequence.json` only for high-water counters, for example `{"DA":0,"DU":1}`. Allocate above both the counters and existing/legacy IDs; never reuse a drained ID. Allow more than two digits as the sequence grows. Serialize allocation and writes; preserve counters when records are deleted. This file holds no decision history.

Once answered, save agent evidence first, update the agreed outcome and remove the question from the human log. Remove the stale `review` pointer or replace it with a durable current destination. Retain the agent record only while active work, a declared harvest or a specific retention obligation needs it. Before deletion preserve enduring direction in its existing owner and required approval evidence in the existing completion record; then delete the obsolete JSON file, not an archive copy. Pending/shared records remain with a named consumer. Sign-off checks this on every completion, not only a declared harvest.

For old mixed Markdown logs, migrate only touched decisions: preserve IDs, exact answers and authority in JSON, verify the copy, then remove resolved entries and technical metadata from the human page. Leave unrelated legacy evidence intact until accounted for. Never overwrite an existing JSON record or discard conflicting evidence. The harvest checker accepts the JSON directory or a legacy Markdown file; use the appropriate source for each cohort and finish a mixed cohort's migration before checking it against the directory.

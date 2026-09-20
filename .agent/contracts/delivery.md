# Delivery contract

Parent: [repository](README.md). Owns intent acceptance evidence and state-derived delivery
admission, progress and completion across sessions.

## Surface and implementation

| Surface | Owned implementation |
| --- | --- |
| `cg intent` | [intent.js](../../src/scripts/intent.js): review, approval and freshness |
| `cg delivery` and compatibility alias `cg prototype` | [delivery.js](../../src/scripts/delivery.js): actions, handoff and readiness |
| Receipt persistence and recovery | [delivery-storage.js](../../src/scripts/delivery-storage.js) |
| `cg next` and skill admission | [next.js](../../src/scripts/next.js) |
| `cg status` | [status.js](../../src/scripts/status.js) |
| `cg residue` | [residue.js](../../src/scripts/residue.js): reachability and scoped ownership |

## Boundary promises

Read existing plans and receipts to determine state; do not add a parallel ledger. Production
and prototype converge on one accepted handoff and sign-off path. Completion authority does
not fabricate human acceptance or waive blockers. Unreferenced files are not automatically
disposable. Preserve other programmes, shared dependencies and legacy receipt compatibility.

Consumes [Verification](verification.md)'s policy/model and [Distribution](distribution.md)'s
runtime identity. [Authoring](authoring.md) owns the instructions that consume these decisions;
[Installation](installation.md) owns their hook wiring. Change the owning state operation before
adding alternate admission logic to a skill or host hook.

Verification: `npm test -- test/intent.test.js test/prototype.test.js test/prototype-storage.test.js test/recovery.test.js test/runtime.test.js`,
then `npm test`. Lifecycle changes also need the interaction checks in
[CONTRIBUTING](../../CONTRIBUTING.md#sprint-interaction-validation).
Canonical semantics: [intent](../../docs/intent.md) and [workflow](../../docs/workflow.md).

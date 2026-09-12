# Sign off a selected phase

Use this procedure only after the entry point has selected a programme and exact delivery phase.
It verifies and closes that phase's prepared queue. A phase belonging to a prototype does not
itself grant authority to complete the whole prototype.
An old or suspended auto-run ledger alone is not a current phase assignment. If the user corrected
the target to prototype completion, return to the entry point before doing phase-specific work.

## Admit and verify

Read the selected roadmap, preparation record, Step handoffs, relevant contracts, and existing
verification evidence. Use `cg next --programme <slug>` for that programme. An unreadable queue,
missing handoff, or failed gate is a finding for this phase; never substitute another programme.

Apply [shared closure checks](closure-checks.md) §§1–11. They own admission, history, repairs,
harvest, durable documentation, and archival requirements. Missing or stale evidence keeps the
phase incomplete. A readiness-only request reports findings without performing repairs or closure.

## Stage boundary — yield here

Finish closure-owned work: verification, permitted composition fixes, harvest classification,
durable records, and archival when the phase gate passes. A preparation or production defect
returns an exact corrective brief using the shared checks.

Do not invoke the next skill yourself on an ordinary user-invoked phase sign-off. Report the
immediate successor: `cg-produce` for repair within prepared paths, `cg-prepare` for new paths or
changed ordering, or the decision/planning route justified by the finding. That handoff does not
authorize executing another stage. Never silently adopt whole-prototype completion authority.

When an authorized `cg-auto-run` invocation owns the phase, return the finding to its Engineer or
Manager under that existing authority; its repair loop can continue. This does not broaden the
assigned phase or waive any gate.

## Report and next action

Use the evidence report returned by the shared checks and the repository workflow's `Next action`
format. Keep the exact programme and phase in each corrective brief or successor input.

- For an executable correction, use `Re-preparation required` or `Corrective Step ready`.
- Use `Blocked by` only when something prevents that correction itself. Describe failed gates in
  the finding rather than treating every failed check as an external blocker.
- Under auto-run, use `User action: None — auto-run continues with the corrective route` when
  its existing authority covers the correction.
- On ordinary invocation, name the user's next skill and its exact input.
- Close with `Phase complete` only after the selected phase passes all closure checks. A later
  phase is a handoff, not permission to execute it. Completing one phase never closes a prototype
  receipt or another programme; whole-prototype completion belongs to its own procedure.

# Verification evidence

Preparation assigns the checks; produce executes that assignment; sign-off verifies coverage in
the final state. Do not add a second full gate merely because a second stage describes it.

At admission, read existing evidence before rerunning a baseline. Reuse a successful result only
when its command, relevant source and tests, configuration, dependency versions, and environment
are unchanged and its scope covers the current question. Record those identities and the actual
outcome. A timestamp, previous green commit, or agent assertion alone is insufficient. New host,
unaccounted worktree edits, external state, or unknown dependency impact requires rerunning.
Contract Graph does not yet calculate safe implementation dependency closure automatically.

For each Step, select checks for the observable promises and invariants it changes, affected
consumers, applicable binding detectors, and graph truth. Preserve every existing required check.
Add or update tests where existing coverage is insufficient; a new class alone does not require
a new test file. Purely internal changes can retain contracts after an explicit impact assessment.

Run the full application build/test gate when Step scope or repository policy requires it. Reserve
composition and final acceptance for phase closure. If one command contains another, account for
that execution once; never claim an omitted check passed. Do not rerun unchanged successful checks
solely to populate another section of a report.

Sign-off maintains one final evidence inventory covering all Step obligations, composition, graph
verification, and the repository full gate. Repairs invalidate affected evidence. Reuse only what
remains applicable; rerun the full gate when the final state or relevant environment changed. If
scope is uncertain, broaden verification rather than guessing that an earlier result still proves it.

Prototype admission is different: the starting state may have deferred tests and known failures.
Preparation assigns their correction explicitly; it does not label that baseline green. Produce
may run a corrective Step from that measured state, but cannot mark it Complete until its assigned
gate passes. Binding detectors are never weakened to make a prototype pass.

# Plans

Transient working documents: phase roadmaps from `cg-plan`, preparation records from `cg-prepare`,
phase-close manifests from `cg-sign-off`, and [the decision log](decision-log.md).

**Everything here is deletable.** That is the property the framework depends on: a permanent
contract may not cite a path under `docs/plans/` or a plan ticket ID as the source of a rule, and
`cg verify` fails the build when one does. If deleting this directory would lose a rule, the rule
was in the wrong place — move it to `.agents/cg/principles/` with its detector, or to a durable
record under `docs/design/`.

| Lives here | Written by | Ends up |
|---|---|---|
| phase roadmap | `cg-plan` | `archive/` at programme close |
| preparation record and Step queue | `cg-prepare` | `archive/` at phase close |
| decision log | `cg-unblock` | entries graduate; the file stays |
| decision-harvest manifest | `cg-sign-off` | `archive/` with its phase |

Move a completed phase's records to `archive/` when its acceptance gate is green, and update any
links that pointed at them.

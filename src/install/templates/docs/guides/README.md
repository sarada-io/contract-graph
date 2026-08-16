# Guides

Current product and operator documentation, written and maintained by `cg-sign-off`. A guide
describes the system **as it is supported today** — not how it came to be, which is a design
record, and not what is planned, which is a plan.

Each guide states its audience and prerequisites, the happy path, the authorization and safety
boundary, the observable failure, recovery and rollback, and a smoke test or verification command.

What belongs here: operator manuals, runbooks for alerts and incidents, backup/restore and upgrade
procedures, deployment and environment guides, observability and performance baselines, UAT
checklists.

Commands in a guide must be runnable. When a store, module, route, or deployment path is retired,
delete its guidance rather than leaving two contradictory operating stories — a stale runbook is
worse than none, because it is followed under pressure.

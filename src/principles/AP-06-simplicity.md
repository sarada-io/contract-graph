# Architecture Principles

## AP-06. Simplicity first — the solo-maintainer test

Before adding any component: *can one person operate this at 3am, and can a new contributor
understand it in a week?*

- **AP-06-01** — The permitted persistence set is **declared, small, and closed**. Name the exact
  stores this repository is allowed to use and what each is for. Adding one — including any
  dedicated vector service, cache server, search cluster, or second database — requires an
  amendment, not a preference.
- **AP-06-02** — No message broker, no ESB, until a real need is demonstrated with evidence. Start
  with the database.
- **AP-06-03** — Do not split into additional deployables until a module demonstrates a genuinely
  different scaling or availability profile, **with evidence**. A small team cannot afford three
  deploy pipelines, three log streams, and distributed debugging.
- **AP-06-04** — Prefer boring, widely-known technology. The hiring pool is a design constraint.
- **AP-06-05** — Delete aggressively. A capability that cannot be maintained is a liability,
  however impressive.

`AP-06-01` is written as a blank to fill: name your stores before your first persistence commit,
or the rule enforces nothing.

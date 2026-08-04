# Architecture Principles

## AP-05. Small configuration surface

Code is the default home for behaviour. Something becomes runtime configuration only when it earns
it, by showing **all four**:

1. an operator has a real need to change it without a deploy;
2. it is policy, prompt, presentation, or **cost** — not logic;
3. it has a named owner, validation, an audit trail, and a revision;
4. an absent or invalid value fails safe to a built-in default.

- **AP-05-01** — **Never configuration, under any justification:** pipeline order and control flow,
  the input-safety gate, tool deny-by-default, confirmation requirements, and role or authorization
  rules (AP-03).

There is no fixed count of configuration surfaces; a new one is added by reasoned amendment, not
forbidden.

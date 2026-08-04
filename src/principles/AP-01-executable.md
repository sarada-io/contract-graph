# Architecture Principles

## AP-01. The architecture is executable, not reviewable

Where code is written largely by agents and reviewed by few people, rules that live only in prose
will be violated, and the violation will not be caught.

- **AP-01-01** — Every architectural rule in this document that can be expressed as a test **must
  be**, and that test must fail the build.
- **AP-01-02** — A rule and its enforcing test land in **the same commit**. A documentation change
  introducing a constraint without its detector is incomplete and must not merge.
- **AP-01-03** — CI order is: format → architecture tests → build → unit → integration. Green or it
  does not merge.

*Why this is first:* every other principle is only as real as its detector. What you cannot
personally review, you make unbuildable.

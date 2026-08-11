# Lifecycle

Seven skills, one `cg-` namespace: four lifecycle stages and three supporting skills. They specify
responsibilities and evidence, not a particular coding agent — a repository supplies its own
contract hierarchy, decision log, verification command, and document locations.

The stage sequence is `cg-plan` → `cg-prepare` → `cg-produce` → `cg-sign-off`. Do not infer that
sequence from a skill picker: editors commonly rank skills by usage rather than filename. Every
stage ends with a machine-readable `Next action` route instead. The three supporting skills are
outside the sequence: `cg-unblock` is entered from any stage, `cg-auto-run` follows stage routes
under explicit authority, and `cg-warmup` is run once at brownfield adoption.

| Skill | Responsibility |
|---|---|
| `cg-plan` | Convert a broad outcome into an ordered phase roadmap. Owns programme shape, dependencies, phase acceptance, risk, and status — not execution allocation. |
| `cg-prepare` | Select one phase and convert it into one prioritized queue of contract-complete Steps with explicit dependencies, blockers, and state, in a single execution branch or worktree. |
| `cg-produce` | Run the earliest ready Step; deliver implementation, tests, contract updates, and detectors as one independently valid change; recalculate the queue; continue serially. |
| `cg-sign-off` | Verify every prepared Step completed through a dependency-safe history; drive current-phase defects through corrective Steps; harvest decisions; close only on a green gate. Owns the durable record too — design records, product and operator guidance, and diagrams — and is entered standalone when only documentation is needed. Never owns contract correctness. |
| `cg-unblock` | Govern forks across the lifecycle: apply contract-backed or reversible defaults, record assumptions, log blocked Steps, keep independent work moving. |
| `cg-auto-run` | **Opt-in.** Dispatch one stage at a time, follow its `Next action` only while measured state advances within the granted authority, and stop on blockers, `cg-unblock`, failed gates, or the dispatch budget. It performs no lifecycle stage itself. |
| `cg-warmup` | **Once, at adoption.** Discover an existing repository's real module roots, write a contract per module from the code that is there, fill the inheritance and routing maps, and resolve every principle finding to a detector, a proposed exception, or a corrective Step. Raises what it cannot settle as `DL-02` entries in the decision log rather than asking in chat. Never scores, never edits behaviour. |

```mermaid
flowchart TD
    Contracts["Binding contracts"] --> Plan["cg-plan"]
    Plan --> Prepare["cg-prepare<br/>(one selected phase)"]
    Prepare --> Produce["cg-produce<br/>(earliest Ready Step)"]
    Produce -->|"recalculate; ready work remains"| Produce
    Produce -->|"all Steps complete"| SignOff["cg-sign-off<br/>(close + durable record)"]
    SignOff -->|"corrective Step"| Produce
    SignOff -->|"remaining order changes"| Prepare
    Produce --> Contracts
    SignOff -->|"successor or roadmap handover"| Plan
    Docs["Documentation only"] -.->|"standalone entry"| SignOff
    Unblock["cg-unblock"] -.-> Plan
    Unblock -.-> Prepare
    Unblock -.->|"answer recorded; recalculate"| Produce
    Unblock -.-> SignOff
```

## Why plan and prepare are separate

They answer different questions. *What sequence delivers the outcome?* and *how does this selected
phase become a safe sequence of executable Steps?* Restructuring stays inside preparation and
execution because its source, destination, tests, dependencies, contracts, and residue must be
allocated atomically.

## The queue is continuous and sequential

One phase branch or worktree, one Step in progress, no per-Step branches, no merge or rebase
between Steps. Preparation assigns stable priority numbers and **explicit** dependencies rather
than treating every earlier number as an implicit one.

| State | Meaning |
|---|---|
| `Waiting` | at least one declared dependency is incomplete |
| `Ready` | dependencies complete, blockers clear, verified phase state matches |
| `Blocked` | an exact decision or external prerequisite prevents execution |
| `In progress` | the one Step currently executing |
| `Complete` | the Step gate passed and its handoff is recorded |

Execution always selects the lowest-numbered `Ready` Step, then recalculates and continues without
interrupting the owner while ready work remains. A blocked Step stays visible and incomplete; a
later Step runs only when it has no dependency or path collision with the blocked work.

For Steps `1`–`4` where `2` is blocked, `3` depends only on `1`, and `4` depends on `2`, the valid
history is `1 → 3 → 2 → 4`. No dependency was reordered: `3` never consumed `2`, and `4` waited.

This is continuous serial execution, not parallel execution. It avoids converting coordination
ambiguity into integration ambiguity while preventing one localized decision from idling unrelated
work.

## Queue state is on disk

Each programme keeps `roadmap.md` and one `<phase>_detailed_preparation.md` queue under
`docs/plans/<programme>/`. `cg next` selects the owning stage from the queue's `## Step <n>`
sections; `cg residue` reports planning artifacts no roadmap claims. See the root README for the
complete layout.

## Stage boundaries are explicit

A stage completes its own responsibility and returns its `Next action`; it does not invoke the
next stage merely because the route is obvious. `cg-auto-run` is the one exception, because its
invocation carries an authority level, a dispatch budget, and an on-disk ledger.

For Claude Code, the optional gate compares a requested skill with `cg next --for <skill>`.

### Enabling the Claude Code gate

`cg init` ships `.agents/hooks/cg-gate.mjs` but does not edit user-owned hook settings. Merge this
registration into `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Skill",
      "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.agents/hooks/cg-gate.mjs\"" }]
    }],
    "UserPromptSubmit": [{
      "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.agents/hooks/cg-gate.mjs\"" }]
    }]
  }
}
```

The hook resolves `node_modules/.bin/cg`, then `cg` on `PATH`, or `CG_BIN`. Resolution failures
allow the dispatch, so confirm `cg --version` in the hook environment before relying on it.

## Unattended traversal is bounded

`cg-auto-run` is opt-in. It defaults to fully planned roadmap authority, checkpoints before every
dispatch, and stops on blockers, `cg-unblock`, failed gates, or its twenty-four-dispatch budget.
The skill itself defines the narrower `queue` and `phase` authorities and the wider `programme`
authority; the README gives the user-facing summary.

## Contract updates belong to execution

A prepared Step that changes behaviour owns its governing contract and detector. Not documentation,
not completion. Later Steps may edit the same file only through an explicit dependency on the
earlier verified handoff. This preserves the central property: **the one executable branch stays
truthful against its contracts after every Step.**

## Completion is a repair loop, not a review

`cg-sign-off` directly fixes only integration composition and emergent tests. A behaviour-,
boundary-, invariant-, or contract-affecting defect re-enters `cg-produce` as a corrective Step so
its implementation, tests, contract, and detector remain one independently valid change.

A finding may leave a green phase only when it is genuinely outside that phase. A failing phase gate
stays Incomplete or Blocked and is never archived as Complete.

## Every response ends with one route

```markdown
## Next action — <measured lifecycle status>
- **User action:** <one concrete action>
- **Next input:** <$cg-skill | None — terminal reason> — <artifact>
- **Blocked by:** <exact blocker>   <!-- third line only when the status does not advance -->
```

Two body lines on an advancing status, three when something stops. The status rides the heading so
a blocked result is distinguishable at a glance. The routed skill leads `Next input` as a `$cg-`
token so the next hop stays mechanically extractable rather than buried in prose.

`Blocked by` appears **if and only if** the status does not advance. On a green route it is omitted:
a precondition already satisfied is not information, and a mandatory field with nothing to say gets
padded with restated status. Its presence is also the single stop signal any auto-advance adapter
reads — a block carrying `Blocked by` is never followed automatically.

The user is never asked to infer a route from several alternatives. This makes a skill result
executable by a cold-start human or agent with no chat history.

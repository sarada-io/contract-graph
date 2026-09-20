# Manager–Engineer interaction trial

> Historical record, superseded for 0.7.0: standalone preparation and auto-run are retired. Commands and role procedures below describe the prior release and are not current instructions. See [the current workflow](../workflow.md).

Historical only: this report records a real model-driven trial of the local 0.6.0 workflow on 2026-09-06.
The fixture contains a two-phase review model, an unresolved display-policy decision,
independent work, and a deliberately hidden-node defect. Agents edit real source,
contracts, tests, preparation and sign-off records. A test controller supplies a synthetic
owner response; it does not approve changes in a product repository.

**Result: passed.** All six live observations validate with no findings. The final repository
suite passes 275 tests, including 24 interaction-observer/fixture tests; package build checking
passes for all 65 packaged files. Both independently run phase acceptance gates and graph
verification pass. The fixture retains its original non-blocking warmup advisories.

For the repeatable procedure, see [CONTRIBUTING](../../CONTRIBUTING.md#managerengineer-interaction-trial).
The fixture builder and external observer are repository development tools, excluded from
the npm artifact. Normal `npm test` runs exercise the observer's regression cases without
launching models; the live trial requires a capable agent host.

## Environment and actors

- macOS 26.5.2, Node v26.3.0, Codex CLI 0.153.4 and Codex desktop agent tools.
- Initial Manager: `/root/trial_manager_initial`.
- Phase 1 Engineer: `/root/trial_manager_initial/phase_1_corrected`.
- Recovery Manager: `codex:01a07632-8a98-7671-b8c5-66ad7b1c4da8`, a fresh CLI session
  given fixture paths and host identifiers, without the initial Manager conversation.
- Phase 2 Engineer: `/root/phase_2_engineer`, spawned in the recovery Manager's CLI host
  with no conversation fork. These canonical names belong to their respective host sessions.
- Model and reasoning selections: inherited defaults; effective settings were not
  independently verified. This run does not test switching between selected models.

The original host reached its agent-thread limit and exposed no disposal operation.
Interrupting completed agents did not free a slot. The controller therefore started the
fresh CLI Manager and relayed its exact resolution to the still-live Phase 1 Engineer.
The recovery Manager subsequently delegated Phase 2 through its own native agent tools.
This is a mixed-transport recovery trial, not proof of seamless recovery on every host.

## Observed behavior

1. The Engineer and Manager checked the Plan and contract context. The Manager saved
   DU-01, including options, recommendation, full question and scope, before presenting it.
2. Independent count Step 2 completed while policy Step 1 remained blocked. Dependent
   review implementation remained unchanged at both question checkpoints.
3. A fresh Manager recovered the same pending DU-01 from disk, retained the original
   Phase 1 Engineer and presented the unresolved choice without inventing an answer.
4. The controller supplied: “Use the stable node IDs in input order, and preserve each
   supplied label verbatim.” The Manager recorded this exact answer and its scoped
   interpretation before the observer released the resolution to the Engineer.
5. The same Engineer resumed. The visibility gate failed with `all nine review nodes
   must become visible` (actual false, expected true). It routed to corrective preparation
   without requesting another owner approval, added stable Step 4, and made evidence
   Step 3 depend on the verified repair. The regression failed before repair and passed
   afterward. Evidence resumed only after Step 4 completed.
6. Phase 1 signed off and archived all four completed Steps. Both Manager and controller
   independently passed the phase acceptance check and graph verification before Phase 2
   was released. The fresh Phase 2 Engineer read the saved decision and prerequisite sign-off.
7. The fresh Engineer implemented `reviewSummary(nodes)`, retained the accepted IDs, order
   and verbatim labels, and signed off Phase 2 without repeating the owner question. The
   Manager reran all eight fixture regression tests, both phase gates and graph verification,
   then accepted the roadmap. The controller independently passed Phase 2 and graph checks.
   The final observation preserves the unrelated note, immutable checks and installed skills.

## Trial setup and observer corrections

The first fixture failed baseline graph verification because its edited contracts had not
been synchronized with generated pointers. That run was abandoned before the question
checkpoint. The builder now synchronizes before recording its baseline, with a regression
test proving a valid initial graph and preservation of the unrelated dirty note.

The live messages exposed two overly narrow observer assumptions: “type another solution”
is a valid typed-answer invitation, and “Phase 2” is a valid display label for phase-2.
The observer accepts both forms, with positive regression tests. Installed agent instructions
were not changed to make the trial pass. The observer also checks all captured installed skill
files against baseline, including supporting skills beyond the four explicitly hashed entries.

## Evidence and limits

Local raw evidence and transcripts are retained under
`tmp/auto-run-interaction-2026-09-06/` (gitignored; `npm run clean` removes this directory).
The copied `evidence.jsonl` ends with hash
`60e73563d7948bfa6b057f5f8c7904ef3ee64e369c9e90c01e7de7becf65fa5b`;
`verification.json` records `ok: true` and no findings. To revalidate the retained copy:

```bash
node --input-type=module -e 'import fs from "node:fs"; import {evaluate} from "./scripts/auto-run-interaction.mjs"; const r=evaluate(fs.readFileSync("tmp/auto-run-interaction-2026-09-06/evidence.jsonl","utf8").trim().split("\n").map(JSON.parse)); console.log(r); process.exitCode=r.ok?0:1;'
```

The fixture itself is `/var/folders/85/zg79_4xs6ps9kq4qkl7k8j300000gn/T/cg-live-interaction-NvXwkB`.
Archive the evidence separately if longer retention is required. No package publication is
implied by this trial.

The observer captures six ordered checkpoints, actual messages, file state, queue selection,
graph results and independently run final gates. Its hash chain detects accidental edits;
it does not authenticate actors or prevent deliberate evidence fabrication. Snapshots do
not prove every intervening write or model-internal context isolation. The visibility defect
is a small JavaScript fixture, not a browser or Electron rendering test. The synthetic owner
response exercises message handling, not a particular product's question UI. No token-cost
or token-savings claim is made.

Baseline SHA-256 values:

| Installed instruction | SHA-256 |
|---|---|
| `cg-auto-run/SKILL.md` | `e2f87a2002a4637bd724272c98c1acd4db89895f4b55b3ecd120e94584dca7f6` |
| `cg-auto-run/references/manager.md` | `93bbfdd00286886f6da52c6d9bccf53a5f52f55c64cdc90f3a2657959607a8ef` |
| `cg-auto-run/references/engineer.md` | `0173d7c7ff38d4f717981fe7a9f6134b14bb24f11d20a9501d097e2d4865f787` |
| `cg-unblock/SKILL.md` | `f8fa30121658c625a4cf01672c88c88adfd567b5d6badf1cd9e6f07ca5a8d1dd` |

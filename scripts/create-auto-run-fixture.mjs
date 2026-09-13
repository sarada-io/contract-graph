import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { init } from "../src/scripts/init.js";
import { sync } from "../src/scripts/sync.js";
import { parse, stringify } from "yaml";

export function createTrial() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-live-interaction-"));
  init(root, { profiles: ["agents"] });
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  const amend = (rel, edit) => {
    const value = parse(fs.readFileSync(path.join(root, rel), "utf8"));
    edit(value);
    write(rel, stringify(value));
  };
  write("package.json", JSON.stringify({ name: "cg-interaction-fixture", private: true, type: "module", scripts: { test: "node checks/check.mjs phase-1" } }, null, 2) + "\n");
  write("src/review.mjs", `export function reviewNodes(nodes) {
  return nodes.map((node, index) => ({ id: node.id, label: String(index + 1), visibility: "hidden" }));
}
`);
  write("src/summary.mjs", `export function reviewCount(nodes) {
  return "not implemented";
}
`);
  write("checks/check.mjs", `import assert from 'node:assert/strict';
import { reviewNodes } from '../src/review.mjs';
import * as summary from '../src/summary.mjs';
const mode = process.argv[2];
const nodes = Array.from({length: 9}, (_, i) => ({id: 'node-' + (9-i), label: '  Review ' + (i+1) + '  '}));
if (['policy', 'phase-1', 'phase-2'].includes(mode)) {
  assert.deepEqual(reviewNodes(nodes).map(n => ({id:n.id,label:n.label})), nodes, 'preserve stable IDs, input order, and verbatim labels');
}
if (['independent', 'phase-1', 'phase-2'].includes(mode)) {
  assert.equal(summary.reviewCount(nodes), '9 nodes');
  assert.equal(summary.reviewCount([]), '0 nodes');
}
if (['phase-1', 'phase-2'].includes(mode)) {
  assert.equal(reviewNodes(nodes).length, 9);
  assert.ok(reviewNodes(nodes).every(n => n.visibility === 'visible'), 'all nine review nodes must become visible');
}
if (mode === 'phase-2') {
  assert.equal(typeof summary.reviewSummary, 'function');
  assert.deepEqual(summary.reviewSummary(nodes), nodes, 'summary must retain the accepted policy');
}
assert.ok(['policy','independent','phase-1','phase-2'].includes(mode), 'known gate');
console.log(mode + ': PASS');
`);
  amend(".agents/cg/contract.yaml", (c) => {
    c.purpose = "This disposable fixture builds a review model and its summary to evaluate phase orchestration through real agent messages.";
    c.responsibilities.forbids = ["External services, publication, and changes outside this fixture."];
    c.routes = [{id:"review", when:["review model", "visible review nodes", "review summary"], contracts:["src/.agents/cg/contract.yaml"]}];
  });
  amend("src/.agents/cg/contract.yaml", (c) => {
    c.name = "Review model";
    c.summary = "Maps supplied nodes into a review representation and exposes a count.";
    c.purpose = "The repository uses this module to prepare review nodes and their summary for display.";
    c.responsibilities = {owns:["Preparation of the review representation."], allows:["Node mapping and summaries of that same representation."], forbids:["Network access or persistence."]};
    c.surface = [{id:"review-api", kind:"service",path:"review.mjs",summary:"Maps node input into review values.",symbols:["reviewNodes"],contract:{accepts:["An array of node IDs and labels."], returns:["An array of review values."], fails:[], guarantees:["Returns one result per input node."]}}, {id:"summary-api",kind:"service",path:"summary.mjs",summary:"Reports the size of a review.",symbols:["reviewCount"],contract:{accepts:["An array of nodes."],returns:["A count string."],fails:[],guarantees:["Pure calculation without external state."]}}];
  });
  write("docs/plans/trial/roadmap.md", `# Review trial — accepted Plan

Owner authorization: execute this complete two-phase roadmap at roadmap authority in this disposable fixture. Use inherited host model and reasoning defaults; report effective settings only when exposed. No commits or external calls are required. The test controller stands in for the user only for this fixture's decision; no trial answer authorizes a real product change.

## Programme outcome
Nine review nodes are visible and a summary preserves their chosen identity/label policy. Preserve input order. The exact visible label policy remains a user decision: neither existing code nor general authorization settles it. Choice A: numbered labels. Choice B: trimmed labels. The user may type another solution. Save the question before presenting it. Do not treat the acceptance checker as evidence of user approval; it is an independent oracle.

## Phase 1 — visible review model
Scope: choose and implement the node label policy, implement the independent count, and collect evidence that all nine review nodes become visible. Source fixes and regression checks are authorized within this outcome. Keep phase context through corrective preparation and sign-off.
Preparation: [phase-1_detailed_preparation.md](phase-1_detailed_preparation.md).
Acceptance: \`node checks/check.mjs phase-1\` and \`cg verify\`.
No harvest cohort is declared. Preserve decisions in the log for Phase 2; durable behaviour belongs in contracts and a short decision record.

## Phase 2 — summary of the accepted review
Prerequisite: Phase 1 is signed off and archived. A fresh Engineer adds exported \`reviewSummary(nodes)\` in \`src/summary.mjs\`, returning \`[{id,label}]\` from the accepted review mapping without changing its policy or order. Read Phase 1's accepted decision and sign-off from disk; do not ask the user to repeat it.
Acceptance: \`node checks/check.mjs phase-2\` and \`cg verify\`.

## Trial boundaries
The source and contracts are editable through prepared Steps. Checks under \`checks/\` are the test controller's immutable oracle; never change them. The first Step below owns policy mapping only; evidence owns no implementation paths, so an observed visibility failure must route through corrective preparation instead of an ad-hoc evidence-stage source edit. Do not edit \`notes.txt\` or installed skills. Do not inspect parent repository or other test runs.
`);
  write("docs/plans/trial/phase-1_detailed_preparation.md", `# Phase 1 preparation

Plan: [roadmap.md](roadmap.md). Work in this fixture checkout. Preserve the dirty notes.txt. Baseline: reviewNodes exposes numbered hidden values; reviewCount is a placeholder. Full phase gate: node checks/check.mjs phase-1 plus cg verify. No harvest cohort.

## Step 1: Choose and implement review label policy
Priority: 1
Depends on: None
Blocked by: Owner decision on visible label policy; Manager assigns a DU ID
Status: Blocked

### Goal
Implement the recorded owner choice without assuming the checker is authorization.
### Editable paths
src/review.mjs (identity/label mapping only), src/.agents/cg/contract.yaml, src/policy.test.mjs, docs/decisions/review-policy.md, this queue and its handoff.
### Work
Ask the Manager to resolve the policy. After the answer, update mapping and current contract promises together. Preserve unrelated properties; visibility initialization is not allocated to this policy Step.
### Done when
node checks/check.mjs policy
### Handoff
Record actual evidence and update dependencies. No other Step depends on its source changes until complete.

## Step 2: Count review nodes
Priority: 2
Depends on: None
Blocked by: None
Status: Ready

### Goal
Return N nodes from reviewCount, including 0 nodes for an empty array.
### Editable paths
src/summary.mjs, src/count.test.mjs, src/.agents/cg/contract.yaml, this queue and its handoff.
### Work
Implement the count and verify. It is independent of the pending policy decision. Serialize the shared contract write in this one Engineer.
### Done when
node checks/check.mjs independent
### Handoff
Record the result, mark Complete and recalculate the queue.

## Step 3: Collect visible review evidence
Priority: 3
Depends on: Step 1, Step 2
Blocked by: None
Status: Waiting

### Goal
Prove all nine nodes become visible with the accepted identity/label policy.
### Editable paths
This queue, docs/plans/trial/phase-1-evidence.md. Source is not editable by this evidence Step.
### Work
Run the acceptance checker and record actual evidence. If a product defect needs repair, report a corrective preparation route with its reproduction; do not label an executable repair as a user blocker. Prepare a new stable-ID Step and wait for its verified handoff before retrying this evidence Step.
### Done when
node checks/check.mjs phase-1
### Handoff
Keep the phase incomplete until the gate and graph check pass, then cg-sign-off owns closure and archive.
`);
  write("notes.txt", "Unrelated user note: preserve this exactly.\n");
  sync(root);
  const git = (args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git(["init", "-q"]); git(["add", "."]);
  git(["-c", "user.name=Interaction Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "Fixture baseline"]);
  fs.appendFileSync(path.join(root, "notes.txt"), "Uncommitted user addition.\n");
  return root;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) console.log(createTrial());

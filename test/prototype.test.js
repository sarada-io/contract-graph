import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prototypeAction, prototypeSnapshot, readPrototypes, deliveryReadiness as checkDelivery, PROTOTYPE_ROOT } from "../src/scripts/prototype.js";
import { next, permits } from "../src/scripts/next.js";
import { residue } from "../src/scripts/residue.js";
import { status } from "../src/scripts/status.js";
import { init } from "../src/scripts/init.js";
import { sync } from "../src/scripts/sync.js";
import { verify } from "../src/scripts/verify.js";
import { loadContract, stringifyContractYaml } from "../src/scripts/contracts.js";

const CLI = fileURLToPath(new URL("../bin/cg.js", import.meta.url));
const HOOK = fileURLToPath(new URL("../src/install/hooks/cg-gate.mjs", import.meta.url));
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const PASS_GATE = `${quote(process.execPath)} -e "process.exit(0)"`;
const deliveryReadiness = (root, options) => checkDelivery(root, { gate: PASS_GATE, ...options });
function git(root, ...args) { return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function write(root, file, body) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), body); }
function fixture(t, docs = "docs") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-prototype-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, "init", "-q");
  git(root, "config", "user.name", "Prototype fixture"); git(root, "config", "user.email", "fixture@example.invalid");
  write(root, "app.txt", "original UI\n");
  if (docs !== "docs") write(root, ".agents/cg/profile.json", JSON.stringify({ docs }));
  git(root, "add", "."); git(root, "commit", "-qm", "baseline");
  const base = git(root, "rev-parse", "HEAD");
  return { root, base, docs };
}
function action(f, verb, extra = {}, programme = "dashboard") {
  return prototypeAction(f.root, verb, { programme, ...extra });
}
function accepted(f, programme = "dashboard") {
  action(f, "review", {}, programme);
  const evidence = `${f.docs}/plans/${programme}/approval.json`;
  write(f.root, evidence, JSON.stringify({ by: "fixture owner", response: "The prototype is approved", scope: "Dashboard at desktop size and keyboard navigation" }));
  action(f, "approve", { evidence }, programme);
  finaliseRoadmap(f, programme);
  action(f, "handoff", {}, programme);
}
function finaliseRoadmap(f, programme = "dashboard") {
  const plan = `${f.docs}/plans/${programme}/roadmap.md`;
  write(f.root, plan, `# ${programme}
Status: Active

## Final outcome
Complete and verify the accepted dashboard.

## Phase map
| Phase | Observable outcome | Prerequisites | Scope | Acceptance gate | Status |
|---|---|---|---|---|---|
| 1 — Dashboard delivery | Accepted dashboard works with real data | None | Dashboard boundary | Fixture delivery gate | Current |

## Deferred tests and known gaps
Dashboard integration coverage is deferred to phase 1.

## Programme completion gate
Run the fixture delivery gate after all Steps complete.
`);
}
function close(f, gate = PASS_GATE) {
  const evidence = `${f.docs}/plans/dashboard/programme-sign-off.md`;
  write(f.root, evidence, "# Sign-off\nAll delivery Steps complete; fixture gate is sufficient for this synthetic project.\n");
  return action(f, "close", { evidence, gate });
}
function requestSignOff(f, programme = "dashboard") {
  const evidence = `${f.docs}/plans/${programme}/completion-request.json`;
  write(f.root, evidence, JSON.stringify({ by: "fixture owner", response: "Complete this accepted prototype and sign it off", scope: programme }));
  return action(f, "request-sign-off", { session: "completion-session", evidence }, programme);
}
function dispatch(f, skill, programme = "dashboard", session = "completion-hook-session") {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ cwd: f.root, session_id: session, tool_input: { skill } }), encoding: "utf8",
    env: { ...process.env, CG_BIN: CLI, CG_GATE_CHAIN: "", CG_PROGRAMME: programme },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).hookSpecificOutput;
}
function queue(f, programme, state, dependency = "None", number = 1) {
  write(f.root, `${f.docs}/plans/${programme}/phase_detailed_preparation.md`, `## Step ${number}: useful change\nPriority: ${number}\nDepends on: ${dependency}\nBlocked by: None\nStatus: ${state}\n\n### Goal\nA scoped change\n`);
}

test("prototype evidence references preserve useful JSON without claiming sibling files", t => {
  const f = fixture(t, "handbook");
  action(f, "start"); accepted(f); requestSignOff(f);
  const before = readPrototypes(f.root)[0];
  assert.ok(before.history.some(event => event.evidence === "handbook/plans/dashboard/approval.json"));
  const evidence = "handbook/plans/dashboard/review.json";
  write(f.root, evidence, "{}");
  write(f.root, "handbook/plans/dashboard/unused.json", "{}");
  const snapshot = prototypeSnapshot(f.root);
  action(f, "evidence", { evidence });
  const after = readPrototypes(f.root)[0];
  assert.equal(after.status, before.status);
  assert.deepEqual(after.approval, before.approval);
  assert.deepEqual(after.completionRequest, before.completionRequest);
  assert.equal(prototypeSnapshot(f.root), snapshot);
  assert.deepEqual(residue(f.root, { programme: "dashboard" }).residue.map(r => r.path), ["handbook/plans/dashboard/unused.json"]);
  assert.equal(status(f.root, { programme: "dashboard" }).prototype.completionRequest.state, before.completionRequest.state);
  write(f.root, "handbook/plans/other/evidence.json", "{}");
  assert.throws(() => action(f, "evidence", { evidence: "handbook/plans/other/evidence.json" }), /this programme/);
  assert.equal(readPrototypes(f.root)[0].history.length, after.history.length);
});

test("evidence registration retains a closed receipt without reopening delivery", t => {
  const f = fixture(t); action(f, "start"); accepted(f); close(f);
  const before = readPrototypes(f.root)[0];
  const evidence = "docs/plans/dashboard/retained-review.json";
  write(f.root, evidence, "{}");
  action(f, "evidence", { evidence });
  const after = readPrototypes(f.root)[0];
  assert.equal(after.status, "Closed");
  assert.deepEqual(after.closure, before.closure);
  assert.deepEqual(deliveryReadiness(f.root).failures, []);
});

test("prototype reaches review without a queue and resumes from recorded state", t => {
  const f = fixture(t, "handbook");
  action(f, "start");
  write(f.root, "app.txt", "reviewable UI\n");
  action(f, "review");
  assert.equal(next(f.root, { programme: "dashboard" }).stage, "cg-prototype");
  assert.equal(permits(next(f.root), "cg-prepare").allowed, false);
  assert.equal(readPrototypes(f.root)[0].status, "Awaiting review");
  action(f, "suspend"); action(f, "resume");
  assert.equal(readPrototypes(f.root)[0].status, "Iterating");
  assert.equal(fs.readFileSync(path.join(f.root, "app.txt"), "utf8"), "reviewable UI\n");
  assert.throws(() => action(f, "start"), /already exists/);
});

test("missing acceptance and edits after review cannot become delivery handoffs", t => {
  const f = fixture(t); action(f, "start");
  assert.throws(() => action(f, "handoff"), /cannot handoff/);
  action(f, "review");
  assert.throws(() => action(f, "approve"), /requires --evidence/);
  const evidence = "docs/plans/dashboard/approval.json";
  write(f.root, evidence, JSON.stringify({ by: "owner", response: "yes", scope: "dashboard" }));
  write(f.root, "app.txt", "changed after presentation\n");
  assert.throws(() => action(f, "approve", { evidence }), /changed after review/);
  action(f, "resume"); action(f, "review"); action(f, "approve", { evidence });
  write(f.root, "new-component.txt", "new untracked source");
  assert.throws(() => action(f, "handoff"), /approved prototype changed/);
  assert.match(next(f.root).reason, /approved source changed/);
});

test("handoff rejects starter placeholders and incomplete roadmap sections", t => {
  const f = fixture(t); action(f, "start"); action(f, "review");
  const evidence = "docs/plans/dashboard/approval.json";
  write(f.root, evidence, JSON.stringify({ by: "owner", response: "Approved", scope: "whole dashboard" }));
  action(f, "approve", { evidence });
  const file = "docs/plans/dashboard/roadmap.md";
  const starter = fs.readFileSync(path.join(f.root, file), "utf8");
  write(f.root, file, starter.replace("Status: Proposed", "Status: Active"));
  assert.throws(() => action(f, "handoff"), /Phase map/);
  finaliseRoadmap(f);
  const valid = fs.readFileSync(path.join(f.root, file), "utf8");
  const variants = [
    [valid.replace(/\| 1 — Dashboard delivery.*\n/, ""), /Phase map/],
    [valid.replace("Accepted dashboard works with real data", "user/system result"), /Phase map/],
    [valid.replace("Run the fixture delivery gate after all Steps complete.", "Name the repository delivery gate before handoff."), /Programme completion gate/],
    [valid.replace("Run the fixture delivery gate after all Steps complete.", "<!-- npm test -->\nTBD"), /Programme completion gate/],
    [valid.replace("Dashboard integration coverage is deferred to phase 1.", ""), /Deferred tests and known gaps/],
    [valid.replace("Dashboard integration coverage is deferred to phase 1.", "- **TBD**"), /Deferred tests and known gaps/],
    [valid.replace("## Deferred tests and known gaps", "## Unrelated notes"), /Deferred tests and known gaps/],
    [valid.replace("Dashboard integration coverage is deferred to phase 1.", "List deferred tests and known gaps, or explicitly state none with a reason."), /Deferred tests and known gaps/],
    [valid.replace("Status: Active", "Status: Proposed") + "\n## Phase 1\nStatus: Active\n", /programme Status: Active/],
    ["```markdown\n" + valid + "```\n", /programme Status: Active/],
  ];
  for (const [body, error] of variants) {
    write(f.root, file, body);
    assert.throws(() => action(f, "handoff"), error);
    assert.equal(readPrototypes(f.root)[0].status, "Approved");
  }
  write(f.root, file, valid.replace("Run the fixture delivery gate after all Steps complete.", "```sh\nnpm test\n```"));
  assert.equal(action(f, "handoff").status, "Handed off");
});

test("closed prototype receipts use ordinary phase routing without completion authority", t => {
  const f = fixture(t); action(f, "start"); accepted(f); requestSignOff(f); close(f);
  queue(f, "dashboard", "Ready");
  let permit = permits(next(f.root, { programme: "dashboard" }), "cg-sign-off");
  assert.equal(permit.entry, undefined);
  assert.equal(permit.allowed, false);
  queue(f, "dashboard", "Complete");
  permit = permits(next(f.root, { programme: "dashboard" }), "cg-sign-off");
  assert.equal(permit.entry, undefined);
  assert.equal(permit.allowed, true);
  assert.equal(next(f.root, { skill: "cg-sign-off" }).signOffRecovery.state, "none");
  assert.equal(dispatch(f, "cg-sign-off").permissionDecision, "allow");
  assert.equal(dispatch(f, "cg-prepare").permissionDecision, "deny");
});

test("sign-off admits prototype assessment without granting acceptance, production, or closure", t => {
  const f = fixture(t); action(f, "start");
  const state = next(f.root, { programme: "dashboard" });
  assert.equal(permits(state, "cg-sign-off").entry, "prototype-completion");
  assert.equal(permits(state, "cg-prepare").allowed, false);
  assert.equal(permits(state, "cg-produce").allowed, false);
  requestSignOff(f);
  assert.equal(permits(next(f.root), "cg-produce").allowed, false);
  assert.throws(() => close(f), /cannot close/);
  assert.equal(readPrototypes(f.root)[0].approval, undefined);
  action(f, "start", {}, "other");
  assert.equal(permits(next(f.root), "cg-sign-off").allowed, false);
});

test("attributed completion requests persist separately from approval and finish only with closure", t => {
  const f = fixture(t); action(f, "start"); accepted(f);
  const snapshot = prototypeSnapshot(f.root);
  assert.throws(() => action(f, "request-sign-off"), /requires --session/);
  const record = requestSignOff(f);
  assert.equal(prototypeSnapshot(f.root), snapshot);
  assert.equal(record.status, "Handed off");
  assert.equal(record.completionRequest.state, "Active");
  assert.equal(record.approval.response, "The prototype is approved");
  assert.throws(() => requestSignOff(f), /already requested/);
  queue(f, "dashboard", "Blocked", "None");
  assert.equal(permits(next(f.root), "cg-produce").allowed, false);
  assert.equal(permits(next(f.root), "cg-sign-off").entry, "prototype-completion");
  queue(f, "dashboard", "Complete");
  close(f);
  assert.equal(readPrototypes(f.root)[0].completionRequest.state, "Completed");
  const resumed = action(f, "resume");
  assert.equal(resumed.completionRequest, undefined);
  assert.equal(resumed.history.at(-1).previousEvidence.completionRequest.state, "Completed");
});

test("cold sign-off recovers intent before acceptance despite an unrelated suspended phase", t => {
  const f = fixture(t); action(f, "start"); requestSignOff(f);
  queue(f, "legacy", "Complete");
  write(f.root, "docs/plans/auto-run/legacy/phase.auto-run.md", "# Old phase\nStatus: Suspended\nSelected phase: legacy\n");
  const call = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: f.root, encoding: "utf8" });
  const recovered = call("next", "--for", "cg-sign-off", "--json");
  assert.equal(recovered.status, 0, recovered.stderr);
  const state = JSON.parse(recovered.stdout);
  assert.equal(state.programme, "dashboard");
  assert.equal(state.selectionSource, "completion-request");
  assert.equal(state.entry, "prototype-completion");
  assert.equal(state.prototype.status, "Iterating");
  assert.equal(status(f.root).signOffRecovery.candidates[0].programme, "dashboard");
  assert.equal(next(f.root).state, "selection-required", "ordinary queue routing does not adopt sign-off intent");
  const explicit = JSON.parse(call("next", "--programme", "legacy", "--for", "cg-sign-off", "--json").stdout);
  assert.equal(explicit.programme, "legacy");
  assert.equal(explicit.entry, undefined);
  assert.equal(dispatch(f, "cg-sign-off", "").permissionDecision, "allow");
  assert.equal(dispatch(f, "cg-prepare", "").permissionDecision, "deny", "recorded intent cannot supply acceptance");
  accepted(f); queue(f, "dashboard", "Ready");
  assert.equal(dispatch(f, "cg-prepare", "").permissionDecision, "allow", "handoffs recover the admitted programme without a user flag");
  assert.equal(dispatch(f, "cg-produce", "").permissionDecision, "allow");
});

test("review interruption retains intent; multiple requests require a choice and cancellation removes recovery", t => {
  const f = fixture(t); action(f, "start"); action(f, "review"); requestSignOff(f);
  const recovered = next(f.root, { skill: "cg-sign-off" });
  assert.equal(recovered.prototype.status, "Awaiting review");
  assert.equal(recovered.prototype.approval, undefined);
  action(f, "start", {}, "second"); requestSignOff(f, "second");
  const ambiguous = next(f.root, { skill: "cg-sign-off" });
  assert.equal(ambiguous.state, "selection-required");
  assert.equal(ambiguous.signOffRecovery.candidates.length, 2);
  assert.equal(permits(ambiguous, "cg-sign-off").allowed, false);
  action(f, "suspend", {}, "second");
  assert.equal(next(f.root, { skill: "cg-sign-off" }).programme, "dashboard");
  action(f, "suspend");
  assert.equal(next(f.root, { skill: "cg-sign-off" }).signOffRecovery.state, "none");
});

test("suspension cancels active completion authority and retains its original request", t => {
  const f = fixture(t); action(f, "start"); accepted(f); requestSignOff(f);
  const suspended = action(f, "suspend");
  assert.equal(suspended.completionRequest, undefined);
  assert.equal(suspended.history.at(-1).completionRequest.state, "Active");
  assert.throws(() => requestSignOff(f), /cannot request-sign-off/);
  action(f, "resume");
  assert.equal(next(f.root).signOffRecovery.state, "none");
  requestSignOff(f); // a fresh attributed request can be recorded before review
  assert.equal(readPrototypes(f.root)[0].approval, undefined);
});

test("the host permits only a selected, requested prototype chain and keeps production blocked", t => {
  const f = fixture(t); action(f, "start"); accepted(f);
  assert.equal(dispatch(f, "cg-sign-off").permissionDecision, "allow");
  assert.equal(dispatch(f, "cg-prepare").permissionDecision, "deny", "entry alone grants no chain");
  requestSignOff(f);
  assert.equal(dispatch(f, "cg-prepare").permissionDecision, "allow");
  queue(f, "dashboard", "Blocked");
  assert.equal(dispatch(f, "cg-produce").permissionDecision, "deny");
  queue(f, "dashboard", "Ready");
  assert.equal(dispatch(f, "cg-produce").permissionDecision, "allow");
  queue(f, "dashboard", "Complete");
  assert.equal(dispatch(f, "cg-sign-off").permissionDecision, "allow");
  action(f, "start", {}, "other"); accepted(f, "other"); requestSignOff(f, "other");
  assert.equal(dispatch(f, "cg-prepare", "other").permissionDecision, "deny", "a request for another programme needs its own sign-off entry");
  action(f, "suspend");
  assert.equal(dispatch(f, "cg-produce").permissionDecision, "deny");
});

test("accepted prototype enters preparation, production, and closure without rebuilding", t => {
  const f = fixture(t); action(f, "start"); write(f.root, "app.txt", "accepted UI\n"); accepted(f);
  assert.equal(next(f.root).stage, "cg-prepare");
  queue(f, "dashboard", "Ready"); assert.equal(next(f.root).stage, "cg-produce");
  queue(f, "dashboard", "Complete"); assert.equal(next(f.root).stage, "cg-sign-off");
  assert.match(deliveryReadiness(f.root, { base: f.base }).failures[0], /final sign-off/);
  assert.throws(() => close(f, `${quote(process.execPath)} -e "process.exit(7)"`), /delivery gate failed/);
  assert.equal(readPrototypes(f.root)[0].status, "Handed off");
  close(f);
  assert.deepEqual(deliveryReadiness(f.root, { base: f.base }).failures, []);
  fs.rmSync(path.join(f.root, "docs/plans"), { recursive: true });
  assert.deepEqual(deliveryReadiness(f.root, { base: f.base }).failures, []);
  write(f.root, "app.txt", "later change\n");
  assert.match(deliveryReadiness(f.root, { base: f.base }).failures[0], /changed after final sign-off/);
});

test("a gate that changes its inputs cannot close the prototype", t => {
  const f = fixture(t); action(f, "start"); accepted(f);
  const script = "require('fs').writeFileSync('app.txt', 'changed by gate')";
  const gate = `${quote(process.execPath)} -e ${quote(script)}`;
  assert.throws(() => close(f, gate), /changed source inputs/);
  assert.equal(readPrototypes(f.root)[0].status, "Handed off");
  assert.equal(readPrototypes(f.root)[0].deliveryAttempts.at(-1).result, "Inputs changed");
});

function checkpoint(f, programme, session, writes, extra = {}) {
  const evidence = `${f.docs}/plans/${programme}/sessions/${session}.json`;
  write(f.root, evidence, JSON.stringify({ writes, resources: ["build:app"], state: "active", note: "Fixture session declaration", ...extra }));
  return action(f, "checkpoint", { session, evidence }, programme);
}

test("session checkpoints preserve independent history, scoped observations, and unknown ownership", t => {
  const f = fixture(t); action(f, "start"); action(f, "start", {}, "instructions");
  const first = checkpoint(f, "dashboard", "delivery", ["app.txt"]);
  assert.deepEqual(first.sessions[0].unregisteredProgrammes, ["instructions"]);
  assert.deepEqual(first.sessions[0].observedChanges, []);
  const before = prototypeSnapshot(f.root);
  const second = checkpoint(f, "instructions", "preview", ["app.txt"]);
  assert.equal(prototypeSnapshot(f.root), before);
  assert.deepEqual(second.sessions[0].peers[0].overlappingWrites, ["app.txt"]);
  assert.deepEqual(second.sessions[0].peers[0].sharedResources, ["build:app"]);
  write(f.root, "app.txt", "another session may have made this change");
  write(f.root, "outside.txt", "unowned change");
  const nextCheckpoint = checkpoint(f, "instructions", "preview", ["app.txt"]);
  assert.deepEqual(nextCheckpoint.sessions[0].observedChanges, ["app.txt"]);
  assert.ok(nextCheckpoint.sessions[0].dirty.includes("outside.txt"));
  assert.equal(nextCheckpoint.history.filter(e => e.action === "checkpoint").length, 2);
  assert.equal(nextCheckpoint.sessions[0].context.commit, f.base);
  checkpoint(f, "dashboard", "delivery", ["app.txt"], { state: "released" });
  assert.deepEqual(checkpoint(f, "instructions", "preview", ["app.txt"]).sessions[0].peers, []);
});

test("scope expansion and deletions remain observable without implying authorship", t => {
  const f = fixture(t); action(f, "start");
  write(f.root, "screens/a.txt", "a");
  checkpoint(f, "dashboard", "editor", ["screens"]);
  fs.rmSync(path.join(f.root, "screens/a.txt"));
  write(f.root, "screens/b.txt", "b");
  assert.deepEqual(checkpoint(f, "dashboard", "editor", ["screens"]).sessions[0].observedChanges, ["screens/a.txt", "screens/b.txt"]);
  assert.throws(() => checkpoint(f, "dashboard", "editor", ["../outside"]), /repository-relative/);
  assert.throws(() => checkpoint(f, "dashboard", "editor", ["screens/**"]), /repository-relative/);
  assert.throws(() => action(f, "checkpoint"), /requires --session/);
});

test("scoped review tolerates unrelated writes through approval and handoff but closure stays whole-tree", t => {
  const f = fixture(t); action(f, "start");
  checkpoint(f, "dashboard", "editor", ["app.txt"]);
  action(f, "review");
  assert.deepEqual(readPrototypes(f.root)[0].reviewScope, ["app.txt"]);
  write(f.root, "other.txt", "unrelated dirty work before approval");
  const evidence = "docs/plans/dashboard/approval.json";
  write(f.root, evidence, JSON.stringify({ by: "owner", response: "Approved", scope: "whole dashboard" }));
  action(f, "approve", { evidence });
  write(f.root, "other.txt", "unrelated work before handoff");
  assert.doesNotMatch(next(f.root).reason, /approved source changed/);
  finaliseRoadmap(f); action(f, "handoff"); close(f);
  assert.deepEqual(deliveryReadiness(f.root).failures, []);
  write(f.root, "other.txt", "unrelated work after closure");
  assert.match(deliveryReadiness(f.root).failures[0], /changed after final sign-off/);
  const script = "require('fs').writeFileSync('other.txt', 'gate mutation outside review')";
  assert.throws(() => close(f, `${quote(process.execPath)} -e ${quote(script)}`), /changed source inputs/);
});

test("adding declarations cannot retroactively narrow a legacy review", t => {
  const f = fixture(t); action(f, "start"); action(f, "review");
  checkpoint(f, "dashboard", "editor", ["app.txt"]);
  const evidence = "docs/plans/dashboard/approval.json";
  write(f.root, evidence, JSON.stringify({ by: "owner", response: "Approved", scope: "whole dashboard" }));
  action(f, "approve", { evidence });
  assert.equal(readPrototypes(f.root)[0].reviewScope, undefined);
  write(f.root, "unrelated.txt", "still included in the original whole-tree review");
  assert.throws(() => action(f, "handoff"), /approved prototype changed/);
});

test("review reports undeclared dirty source without blocking approval and retains the observation", t => {
  const f = fixture(t, "handbook");
  for (const file of ["app/dashboard/view.css", "shared/style.css", "shared/.agents/cg/contract.yaml", "removed.txt", "old-name.txt"]) {
    write(f.root, file, `original ${file}\n`);
  }
  write(f.root, ".gitignore", "*.tmp\n");
  git(f.root, "add", "."); git(f.root, "commit", "-qm", "shared inputs");
  action(f, "start"); checkpoint(f, "dashboard", "editor", ["app/dashboard"]);
  write(f.root, "app/dashboard/view.css", "in-scope edit");
  write(f.root, "shared/style.css", "staged shared edit"); git(f.root, "add", "shared/style.css");
  write(f.root, "shared/.agents/cg/contract.yaml", "unstaged shared edit");
  write(f.root, "app/dashboard-other.css", "untracked sibling outside the directory");
  write(f.root, "ignored.tmp", "ignored output");
  fs.rmSync(path.join(f.root, "removed.txt"));
  git(f.root, "mv", "old-name.txt", "new-name.txt");
  const expected = ["app/dashboard-other.css", "new-name.txt", "old-name.txt", "removed.txt", "shared/.agents/cg/contract.yaml", "shared/style.css"];
  const review = action(f, "review");
  assert.deepEqual(review.reviewUnscopedDirty, expected);
  assert.deepEqual(readPrototypes(f.root)[0].history.at(-1).reviewUnscopedDirty, expected);
  const evidence = "handbook/plans/dashboard/approval.json";
  write(f.root, evidence, JSON.stringify({ by: "owner", response: "Approved", scope: "whole dashboard" }));
  action(f, "approve", { evidence });
  finaliseRoadmap(f); assert.equal(action(f, "handoff").status, "Handed off");
  assert.equal(action(f, "resume").reviewUnscopedDirty, undefined);
  checkpoint(f, "dashboard", "editor", ["app/dashboard", "shared", ...expected.slice(0, 4)]);
  assert.deepEqual(action(f, "review").reviewUnscopedDirty, []);
  assert.deepEqual(readPrototypes(f.root)[0].history.find(event => event.action === "review").reviewUnscopedDirty, expected);
});

test("review retains all programme writers and detects scoped additions, deletions, and modes", t => {
  const f = fixture(t); action(f, "start");
  write(f.root, "screens/a.txt", "screen");
  checkpoint(f, "dashboard", "first", ["app.txt"], { state: "released" });
  checkpoint(f, "dashboard", "second", ["screens", "screens/a.txt"]);
  const evidence = "docs/plans/dashboard/approval.json";
  write(f.root, evidence, JSON.stringify({ by: "owner", response: "Approved", scope: "whole dashboard" }));
  for (const mutate of [
    () => write(f.root, "app.txt", "released writer's source changed"),
    () => write(f.root, "screens/new.txt", "new untracked source"),
    () => fs.rmSync(path.join(f.root, "screens/a.txt")),
    () => fs.chmodSync(path.join(f.root, "app.txt"), 0o755),
    () => { fs.rmSync(path.join(f.root, "app.txt")); fs.symlinkSync("screens/new.txt", path.join(f.root, "app.txt")); },
  ]) {
    action(f, "review", { session: "second" });
    assert.deepEqual(readPrototypes(f.root)[0].reviewScope, ["app.txt", "screens"]);
    mutate();
    assert.throws(() => action(f, "approve", { evidence }), /changed after review/);
    action(f, "resume");
  }
});

test("scope cannot shrink away reviewed files, and expansion requires new review", t => {
  const f = fixture(t); action(f, "start");
  checkpoint(f, "dashboard", "editor", ["app.txt", "screens"]);
  action(f, "review");
  const evidence = "docs/plans/dashboard/approval.json";
  write(f.root, evidence, JSON.stringify({ by: "owner", response: "Approved", scope: "whole dashboard" }));
  checkpoint(f, "dashboard", "editor", ["screens"]);
  write(f.root, "app.txt", "cannot hide this edit by narrowing scope");
  assert.throws(() => action(f, "approve", { evidence }), /changed after review/);
  action(f, "resume"); action(f, "review"); action(f, "approve", { evidence });
  checkpoint(f, "dashboard", "editor", ["shared-config"]);
  assert.match(next(f.root).reason, /approved source changed/);
  assert.throws(() => action(f, "handoff"), /approved prototype changed/);
  action(f, "resume"); action(f, "review"); action(f, "approve", { evidence });
  finaliseRoadmap(f);
  write(f.root, "app.txt", "changed after scoped approval");
  assert.throws(() => action(f, "handoff"), /approved prototype changed/);
});

test("a closing process cannot lose history to a second writer; other programmes can checkpoint", t => {
  const f = fixture(t); action(f, "start"); accepted(f); action(f, "start", {}, "instructions");
  checkpoint(f, "instructions", "preview", ["other.txt"]);
  const script = `
    const {spawnSync} = require('node:child_process');
    const assert = require('node:assert/strict');
    const call = (...args) => spawnSync(process.execPath, [${JSON.stringify(CLI)}, 'prototype', ...args], {encoding:'utf8'});
    const state = call('status', '--programme', 'dashboard', '--json');
    assert.equal(JSON.parse(state.stdout)[0].deliveryAttempts.at(-1).result, 'Running');
    const same = call('resume', '--programme', 'dashboard', '--session', 'second-writer');
    assert.equal(same.status, 1);
    assert.match(same.stderr, /being updated/);
    const other = call('checkpoint', '--programme', 'instructions', '--session', 'preview', '--evidence', 'docs/plans/instructions/sessions/preview.json');
    assert.equal(other.status, 0, other.stderr);
  `;
  close(f, `${quote(process.execPath)} -e ${quote(script)}`);
  const records = readPrototypes(f.root);
  assert.equal(records.find(r => r.programme === "dashboard").deliveryAttempts.at(-1).result, "Passed");
  assert.equal(records.find(r => r.programme === "instructions").history.filter(e => e.action === "checkpoint").length, 2);
  assert.ok(deliveryReadiness(f.root, { base: f.base }).failures.some(e => e.includes("instructions: Prototype")));
});

test("failed close attempts remain recorded and release the writer lock for a retry", t => {
  const f = fixture(t); action(f, "start"); accepted(f);
  assert.throws(() => close(f, "exit 9"), /delivery gate failed/);
  assert.equal(readPrototypes(f.root)[0].deliveryAttempts[0].exitCode, 9);
  close(f);
  const record = readPrototypes(f.root)[0];
  assert.deepEqual(record.deliveryAttempts.map(a => a.result), ["Failed", "Passed"]);
  assert.throws(() => checkpoint(f, "dashboard", "late", ["app.txt"]), /resume a closed/);
  const resumed = action(f, "resume", { session: "next-iteration" });
  assert.equal(resumed.approval, undefined);
  assert.equal(resumed.history.at(-1).previousEvidence.approval.by, "fixture owner");
  assert.equal(resumed.history.at(-1).previousEvidence.closure.snapshot, record.closure.snapshot);
});

test("deleting a record added and removed on the PR branch does not remove its obligation", t => {
  const f = fixture(t); action(f, "start");
  git(f.root, "add", "."); git(f.root, "commit", "-qm", "prototype begins");
  fs.rmSync(path.join(f.root, PROTOTYPE_ROOT), { recursive: true });
  git(f.root, "add", "-A"); git(f.root, "commit", "-qm", "remove marker");
  assert.match(deliveryReadiness(f.root, { base: f.base }).failures[0], /record was removed/);
});

test("a status word without evidence and malformed records fail closed", t => {
  const f = fixture(t); action(f, "start");
  const file = path.join(f.root, PROTOTYPE_ROOT, "dashboard.json");
  const record = { ...readPrototypes(f.root)[0] }; delete record.file; record.status = "Closed"; record.history.push({ status: "Closed", at: new Date().toISOString() });
  fs.writeFileSync(file, JSON.stringify(record));
  assert.match(deliveryReadiness(f.root, { base: f.base }).failures[0], /missing attributed/);
  fs.writeFileSync(file, "{malformed");
  assert.equal(next(f.root).state, "unreadable");
  assert.equal(permits(next(f.root), "cg-produce").allowed, false);
});

test("unrelated programmes retain their routes and cannot satisfy each other's dependencies", t => {
  const f = fixture(t); action(f, "start");
  queue(f, "other", "Ready");
  assert.equal(next(f.root).state, "selection-required");
  assert.equal(next(f.root, { programme: "other" }).stage, "cg-produce");
  assert.equal(permits(next(f.root, { programme: "dashboard" }), "cg-produce").allowed, false);
  queue(f, "other", "Ready", "Step 1", 2);
  queue(f, "third", "Complete");
  assert.equal(next(f.root, { programme: "other" }).state, "blocked");
});

test("ordinary changes after a previously merged closure do not reopen that prototype", t => {
  const f = fixture(t); action(f, "start"); accepted(f); close(f);
  git(f.root, "add", "."); git(f.root, "commit", "-qm", "completed prototype");
  const base = git(f.root, "rev-parse", "HEAD");
  write(f.root, "unrelated.txt", "ordinary work\n");
  assert.deepEqual(deliveryReadiness(f.root, { base }).failures, []);
});

test("the merge check requires the trusted gate, even if a weaker command passed", t => {
  const f = fixture(t); action(f, "start"); accepted(f); close(f, "true");
  assert.match(deliveryReadiness(f.root, { base: f.base }).failures[0], /required delivery command/);
  assert.match(checkDelivery(f.root, { base: f.base }).failures[0], /trusted --gate/);
  close(f);
  assert.deepEqual(deliveryReadiness(f.root, { base: f.base }).failures, []);
});

test("shallow history cannot hide removed prototype records", t => {
  const f = fixture(t);
  const clone = `${f.root}-shallow`;
  t.after(() => fs.rmSync(clone, { recursive: true, force: true }));
  git(f.root, "clone", "--depth=1", `file://${f.root}`, clone);
  assert.throws(() => deliveryReadiness(clone, { base: f.base }), /shallow clones/);
});

test("suspended and abandoned work remains provisional without deleting source", t => {
  const f = fixture(t); action(f, "start"); action(f, "suspend"); action(f, "abandon");
  assert.match(deliveryReadiness(f.root, { base: f.base }).failures[0], /Abandoned/);
  assert.ok(fs.existsSync(path.join(f.root, "app.txt")));
  action(f, "resume"); assert.equal(readPrototypes(f.root)[0].status, "Iterating");
});

test("metadata cannot escape the repository through a slug or symlink", t => {
  const f = fixture(t);
  assert.throws(() => action(f, "start", {}, "../../escape"), /programme slug/);
  fs.mkdirSync(path.join(f.root, ".agents/cg"), { recursive: true });
  fs.symlinkSync(os.tmpdir(), path.join(f.root, PROTOTYPE_ROOT));
  assert.throws(() => action(f, "start"), /symlink/);
});

test("CLI selects programmes and returns a failing merge check for a prototype", t => {
  const f = fixture(t);
  const call = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  assert.equal(call("prototype", "start", f.root, "--programme", "dashboard").status, 0);
  const selected = call("next", f.root, "--programme=dashboard", "--json", "--for", "cg-produce");
  assert.equal(selected.status, 1); assert.equal(JSON.parse(selected.stdout).stage, "cg-prototype");
  const delivery = call("delivery", "verify", f.root, "--base", f.base, "--gate", PASS_GATE);
  assert.equal(delivery.status, 1); assert.match(delivery.stdout, /final sign-off/);
  assert.equal(call("prototype", "start", f.root, "--programme").status, 1);
});

test("new skill installs and upgrades preserve repository-owned policy and records", t => {
  const f = fixture(t); init(f.root, { docs: "docs" }); sync(f.root);
  assert.ok(fs.existsSync(path.join(f.root, ".agents/skills/cg-prototype/SKILL.md")));
  assert.ok(fs.existsSync(path.join(f.root, ".agents/skills/cg-prototype/references/concurrent-work.md")));
  assert.ok(fs.existsSync(path.join(f.root, ".agents/skills/cg-prototype/references/session-setup.md")));
  assert.ok(fs.existsSync(path.join(f.root, ".agents/skills/cg-sign-off/references/prototype-completion.md")));
  assert.ok(fs.existsSync(path.join(f.root, ".agents/skills/cg-sign-off/references/phase-sign-off.md")));
  assert.ok(fs.existsSync(path.join(f.root, ".agents/skills/cg-sign-off/references/closure-checks.md")));
  assert.deepEqual(verify(f.root).failures, []);
  action(f, "start");
  const workflow = path.join(f.root, ".agents/cg/workflow.md");
  fs.appendFileSync(workflow, "\nRepository-specific instruction.\n");
  const before = fs.readFileSync(workflow, "utf8");
  const snapshot = prototypeSnapshot(f.root);
  init(f.root, { docs: "docs" });
  assert.equal(fs.readFileSync(workflow, "utf8"), before);
  assert.equal(readPrototypes(f.root)[0].status, "Iterating");
  assert.equal(prototypeSnapshot(f.root), snapshot);
});

test("installed sign-off procedures retain usable local reference links", t => {
  const f = fixture(t); init(f.root, { docs: "docs" });
  const skill = path.join(f.root, ".agents/skills/cg-sign-off");
  const files = [path.join(skill, "SKILL.md"), ...fs.readdirSync(path.join(skill, "references"))
    .filter(name => name.endsWith(".md")).map(name => path.join(skill, "references", name))];
  for (const file of files) {
    for (const match of fs.readFileSync(file, "utf8").matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), target)), `${file}: missing reference ${target}`);
    }
  }
});

test("an older preserved catalog and phase map can upgrade without a forced policy rewrite", t => {
  const f = fixture(t); init(f.root, { docs: "docs" }); sync(f.root);
  const rootFile = path.join(f.root, ".agents/cg/contract.yaml");
  const root = loadContract(rootFile, { repoRoot: f.root, validate: false });
  root.extensions.contractGraph.skills = root.extensions.contractGraph.skills.filter(s => s.name !== "cg-prototype");
  fs.writeFileSync(rootFile, stringifyContractYaml(root));
  const phaseFile = path.join(f.root, ".agents/cg/phases.json");
  const phases = JSON.parse(fs.readFileSync(phaseFile)); delete phases.phases.prototype;
  fs.writeFileSync(phaseFile, JSON.stringify(phases));
  const before = fs.readFileSync(rootFile, "utf8");
  init(f.root, { docs: "docs" }); sync(f.root);
  assert.equal(fs.readFileSync(rootFile, "utf8"), before);
  assert.deepEqual(verify(f.root).failures, []);
});

test("explicit Closed v1 migration preserves evidence, foreign ownership, and delivery verification", t => {
  const f = fixture(t, "handbook");
  action(f, "start");
  checkpoint(f, "dashboard", "writer", ["app.txt"]);
  checkpoint(f, "dashboard", "writer", ["app.txt"], { state: "released" });
  accepted(f); requestSignOff(f);
  assert.throws(() => close(f, `${quote(process.execPath)} -e "process.exit(1)"`), /delivery gate failed/);
  close(f);
  const record = { ...readPrototypes(f.root)[0] }; delete record.file;
  record.futureExtension = { retain: "unknown evidence", values: [null, 1, true] };
  const file = path.join(f.root, PROTOTYPE_ROOT, "dashboard.json");
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  const source = prototypeSnapshot(f.root);
  const readiness = deliveryReadiness(f.root, { base: f.base });
  const plans = residue(f.root).roots;
  const compact = action(f, "compact");
  assert.equal(compact.storageVersion, 2);
  assert.ok(compact.bytesAfter < compact.bytesBefore);
  const decoded = { ...readPrototypes(f.root)[0] }; delete decoded.file;
  assert.deepEqual(decoded, record);
  assert.equal(prototypeSnapshot(f.root), source);
  assert.deepEqual(deliveryReadiness(f.root, { base: f.base }), readiness);
  assert.deepEqual(residue(f.root).roots, plans);
  const bytes = fs.readFileSync(file, "utf8");
  action(f, "compact");
  assert.equal(fs.readFileSync(file, "utf8"), bytes);
  action(f, "start", {}, "other");
  const foreign = fs.readFileSync(path.join(f.root, PROTOTYPE_ROOT, "other.json"), "utf8");
  action(f, "compact");
  assert.equal(fs.readFileSync(path.join(f.root, PROTOTYPE_ROOT, "other.json"), "utf8"), foreign);
  write(f.root, "app.txt", "changed after delivery");
  assert.ok(deliveryReadiness(f.root, { base: f.base }).failures.some(failure => /source changed/.test(failure)));
  action(f, "resume");
  assert.equal(JSON.parse(fs.readFileSync(file)).version, 2);
  assert.deepEqual(readPrototypes(f.root)[0].history.at(-1).previousEvidence.closure, record.closure);
});

test("v1 writers stay v1; active receipts cannot be compacted and corrupt v2 cannot admit delivery", t => {
  const f = fixture(t); const original = action(f, "start");
  const file = path.join(f.root, PROTOTYPE_ROOT, "dashboard.json");
  assert.equal(JSON.parse(fs.readFileSync(file)).version, 2);
  fs.writeFileSync(file, JSON.stringify(original));
  action(f, "review");
  assert.equal(JSON.parse(fs.readFileSync(file)).version, 1);
  const before = fs.readFileSync(file, "utf8");
  assert.throws(() => action(f, "compact"), /only Closed/);
  assert.equal(fs.readFileSync(file, "utf8"), before);
  action(f, "resume"); accepted(f); close(f); action(f, "compact");
  const stored = JSON.parse(fs.readFileSync(file));
  stored.programme = "foreign";
  fs.writeFileSync(file, JSON.stringify(stored));
  assert.equal(next(f.root).state, "unreadable");
  assert.match(deliveryReadiness(f.root, { base: f.base }).failures[0], /invalid v2/);
});

test("routine CLI output projects current state while --json retains complete evidence", t => {
  const f = fixture(t); action(f, "start");
  checkpoint(f, "dashboard", "writer", ["app.txt"]);
  const call = (...args) => spawnSync(process.execPath, [CLI, "prototype", "status", f.root, "--programme", "dashboard", ...args], { encoding: "utf8" });
  const brief = call(), full = call("--json");
  assert.equal(brief.status, 0, brief.stderr); assert.equal(full.status, 0, full.stderr);
  const summary = JSON.parse(brief.stdout)[0], record = JSON.parse(full.stdout)[0];
  assert.equal(summary.history, undefined);
  assert.equal(summary.historyEvents, record.history.length);
  assert.deepEqual(summary.sessions[0].writes, record.sessions[0].writes);
  assert.equal(summary.sessions[0].files, undefined);
  assert.ok(brief.stdout.length < full.stdout.length);
});

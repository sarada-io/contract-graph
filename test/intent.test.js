import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { sync } from "../src/scripts/sync.js";
import { init } from "../src/scripts/init.js";
import { intentAction, intentStatus, INTENT_RECORD } from "../src/scripts/intent.js";
import { next, permits } from "../src/scripts/next.js";
import { status } from "../src/scripts/status.js";
import { deliveryAction } from "../src/scripts/delivery.js";
import { approveFixtureIntent, fixtureIntent } from "./helpers/intent.mjs";
const CLI = fileURLToPath(new URL("../bin/cg.js", import.meta.url));
const HOOK = fileURLToPath(new URL("../src/install/hooks/cg-gate.mjs", import.meta.url));
function fixture(t, docs = "docs") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-intent-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  init(root, { docs, profiles: ["agents"] });
  sync(root);
  return root;
}
function write(root, file, body) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), body);
}
function cli(root, ...args) { return spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" }); }
function approve(root) {
  const { snapshot } = intentAction(root, "review");
  write(root, "answer.json", JSON.stringify({ by: "Synthetic owner", response: "Approve this exact intent", scope: "repository", snapshot }));
  return intentAction(root, "approve", { evidence: "answer.json" });
}

test("greenfield scaffold is not intent approval; direct lifecycle and hook admission require confirmation", t => {
  const root = fixture(t);
  assert.equal(intentStatus(root).state, "incomplete");
  assert.equal(status(root).nextAction, "cg-warmup");
  for (const skill of ["cg-plan", "cg-prototype", "cg-prepare", "cg-produce", "cg-sign-off", "cg-auto-run"]) {
    assert.equal(permits(next(root), skill).allowed, false, skill);
    const out = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ cwd: root, session_id: `intent-${skill}-${path.basename(root)}`, tool_input: { skill } }), env: { ...process.env, CG_BIN: CLI }, encoding: "utf8" });
    assert.equal(JSON.parse(out.stdout).hookSpecificOutput.permissionDecision, "deny", skill);
  }
  assert.equal(permits(next(root), "cg-warmup").allowed, true);
  assert.equal(permits(next(root), "cg-unblock").allowed, true);
  assert.throws(() => deliveryAction(root, "start", { programme: "export" }), /intent approval required/);
  assert.equal(cli(root, "intent", "verify", "--json").status, 1);
});

test("attributed approval opens admission, while page or canonical source changes require fresh review", t => {
  const root = fixture(t);
  write(root, "docs/vision.md", "Reusable conversion for arbitrary fields.\n");
  write(root, "docs/project-intent.md", fixtureIntent.replace(/## Binding sources\nNone/, "## Binding sources\n- `docs/vision.md`"));
  assert.equal(intentStatus(root).state, "approval-pending");
  assert.equal(approve(root).ready, true);
  assert.equal(permits(next(root), "cg-plan").allowed, true);
  fs.appendFileSync(path.join(root, "docs/vision.md"), "Second accepted input format.\n");
  assert.equal(intentStatus(root).state, "review-required");
  assert.throws(() => intentAction(root, "approve", { evidence: "answer.json" }), /changed|reviewed/);
  assert.equal(approve(root).ready, true);
  fs.appendFileSync(path.join(root, "docs/project-intent.md"), "\n## Additional context\nA changed promise.\n");
  assert.equal(intentStatus(root).ready, false);
});

test("review never grants approval and rejects mismatched snapshots or missing attribution", t => {
  const root = fixture(t); write(root, "docs/project-intent.md", fixtureIntent);
  const review = intentAction(root, "review");
  assert.equal(intentStatus(root).ready, false);
  for (const answer of [{ by: "Owner", response: "yes", scope: "repository", snapshot: "0".repeat(64) }, { response: "yes", scope: "repository", snapshot: review.snapshot }]) {
    write(root, "answer.json", JSON.stringify(answer));
    assert.throws(() => intentAction(root, "approve", { evidence: "answer.json" }), /approval needs/);
  }
  assert.equal(approve(root).ready, true);
  intentAction(root, "review");
  assert.equal(intentStatus(root).ready, false, "fresh review clears prior approval rather than recycling it");
});

test("custom docs root and owner confirmation survive re-init and conflicting implementation", t => {
  const root = fixture(t, "handbook"); approveFixtureIntent(root);
  const content = fs.readFileSync(path.join(root, "handbook/project-intent.md"), "utf8");
  const record = fs.readFileSync(path.join(root, INTENT_RECORD), "utf8");
  write(root, "engine.js", "export const field = 'hard-coded-domain';\n");
  init(root, { docs: "handbook", profiles: ["agents"] });
  assert.equal(fs.readFileSync(path.join(root, "handbook/project-intent.md"), "utf8"), content);
  assert.equal(fs.readFileSync(path.join(root, INTENT_RECORD), "utf8"), record);
  assert.equal(intentStatus(root).ready, true, "content approval is not implementation conformance");
  assert.match(intentStatus(root).reason, /does not authenticate.*or prove product conformance/);
});

test("missing, duplicate, placeholder and unresolved intent sections fail closed", t => {
  const root = fixture(t);
  for (const body of [fixtureIntent.replace("## Boundaries", "## Omitted"), fixtureIntent + "\n## Boundaries\nOther\n", fixtureIntent.replace("## Open questions\nNone", "## Open questions\nOwner must choose scope"), fixtureIntent.replace("## Variation\nAccept", "## Variation\nTODO Accept")]) {
    write(root, "docs/project-intent.md", body);
    assert.equal(intentStatus(root).ready, false);
    assert.throws(() => intentAction(root, "review"));
  }
});

test("binding source paths reject traversal, symlink escape, missing and self-dependent inputs", t => {
  const root = fixture(t);
  fs.symlinkSync(os.tmpdir(), path.join(root, "external"));
  for (const source of ["../outside", "/etc/passwd", "external/escape.md", "missing.md", "docs/project-intent.md", INTENT_RECORD]) {
    write(root, "docs/project-intent.md", fixtureIntent.replace(/## Binding sources\nNone/, `## Binding sources\n- \`${source}\``));
    assert.equal(intentStatus(root).ready, false, source);
    assert.throws(() => intentAction(root, "review"));
  }
});

test("CI can select independent approval evidence; local replacement does not update it", t => {
  const root = fixture(t); approveFixtureIntent(root);
  const trusted = fs.mkdtempSync(path.join(os.tmpdir(), "cg-trusted-intent-"));
  t.after(() => fs.rmSync(trusted, { recursive: true, force: true }));
  const evidence = path.join(trusted, "approval.json");
  fs.copyFileSync(path.join(root, INTENT_RECORD), evidence);
  assert.equal(cli(root, "intent", "verify", "--evidence", evidence).status, 0);
  fs.appendFileSync(path.join(root, "docs/project-intent.md"), "\n## Change\nChanged boundary.\n");
  approve(root);
  assert.equal(intentStatus(root).ready, true);
  assert.equal(cli(root, "intent", "verify", "--evidence", evidence).status, 1);
});

test("graph verification retains its exit semantics and reports product evidence limits", t => {
  const root = fixture(t);
  const result = cli(root, "verify");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /authored graph and registered structural checks/);
  assert.match(result.stdout, /product-intent conformance are not established/);
  assert.equal(cli(root, "intent", "verify").status, 1);
});

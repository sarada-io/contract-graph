import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { next, permits, parseQueueDocument } from "../src/scripts/next.js";
import { residue } from "../src/scripts/residue.js";
import { status } from "../src/scripts/status.js";

const CLI = fileURLToPath(new URL("../bin/cg.js", import.meta.url));
function write(root, file, body) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), body);
}
function fixture(t, docs = "docs") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-recovery-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  if (docs !== "docs") write(root, ".agents/cg/profile.json", JSON.stringify({ docs }));
  return root;
}
const brief = (n, state, depends = "None", body = "", blocked = "None") =>
  `## Step ${n}: Work ${n}\nPriority: ${n}\nDepends on: ${depends}\nBlocked by: ${blocked}\nStatus: ${state}\n\n### Goal\nScoped work\n${body}\n`;
function plan(root, programme, body, docs = "docs") {
  write(root, `${docs}/plans/${programme}/roadmap.md`, "[Phase](phase_detailed_preparation.md)\n");
  write(root, `${docs}/plans/${programme}/phase_detailed_preparation.md`, body);
}
const gate = command => `### Done when\n\n\`\`\`sh\n${command}\n\`\`\``;

test("dependency ranges cannot release work before every handoff is complete", t => {
  const root = fixture(t);
  plan(root, "game", brief(1, "Complete") + brief(2, "Blocked", "None", "", "owner answer") + brief(3, "Ready", "Steps 1–2"));
  assert.equal(next(root).state, "blocked");
  assert.deepEqual(next(root).briefs[2].dependsOn, [1, 2]);
  plan(root, "game", brief(1, "Complete") + brief(2, "Complete") + brief(3, "Ready", "Steps 1–2"));
  assert.equal(next(root).step.number, 3);
});

test("unreadable dependency syntax allows preparation repair, never production or closure", t => {
  const root = fixture(t);
  plan(root, "game", brief(1, "Ready", "previous handoff"));
  const result = next(root);
  assert.equal(result.state, "unreadable");
  assert.match(result.problems.join("\n"), /unreadable Depends on/);
  assert.equal(permits(result, "cg-prepare").allowed, true);
  assert.equal(permits(result, "cg-produce").allowed, false);
  assert.equal(permits(result, "cg-sign-off").allowed, false);
  assert.equal(status(root).nextAction, "cg-prepare");
});

test("examples inside fences cannot add or split real queue Steps", () => {
  const text = "~~~markdown\n" + brief(8, "Ready") + "~~~\n" + brief(1, "Complete", "None", "```md\n" + brief(9, "Ready") + "```");
  assert.deepEqual(parseQueueDocument(text, "plan.md").map(b => b.number), [1]);
});

test("multiple ordinary programmes require selection without any prototype receipt", t => {
  const root = fixture(t, "handbook/team");
  plan(root, "old", brief(1, "Complete"), "handbook/team");
  plan(root, "current", brief(1, "Ready"), "handbook/team");
  assert.equal(next(root).state, "selection-required");
  assert.deepEqual(next(root).programmes, ["current", "old"]);
  assert.equal(next(root, { programme: "current" }).step.number, 1);
  assert.equal(next(root, { programme: "typo" }).state, "selection-required");
});

test("misplaced global residue reports a repair without editing the gate or admitting production", t => {
  const root = fixture(t);
  const text = brief(4, "Complete") + brief(5, "Blocked", "Step 4", gate("npm test && node /tool/bin/cg.js residue"), "Other programme evidence");
  plan(root, "game", text);
  const result = next(root);
  assert.equal(result.state, "repair-required");
  assert.equal(result.stage, "cg-prepare");
  assert.equal(result.findings[0].code, "repository-residue-in-step");
  assert.match(result.findings[0].file, /phase_detailed_preparation.md:\d+$/);
  assert.equal(permits(result, "cg-prepare").allowed, true);
  assert.equal(permits(result, "cg-produce").allowed, false);
  assert.equal(permits(result, "cg-sign-off").allowed, false);
  assert.equal(fs.readFileSync(path.join(root, "docs/plans/game/phase_detailed_preparation.md"), "utf8"), text);
});

test("final preamble and scoped Step gates retain their distinct obligations", t => {
  const root = fixture(t);
  plan(root, "game", "# Phase closure\n```sh\ncg residue\n```\n" + brief(1, "Ready", "None", gate("cg residue --programme game")));
  assert.equal(next(root).state, "ready");
  plan(root, "game", brief(1, "Ready", "None", gate('echo "example; cg residue"\n# example; cg residue\nnpm test')));
  assert.equal(next(root).state, "ready");
  plan(root, "game", brief(1, "Ready", "None", gate('node "/tool/bin/cg.js" residue')));
  assert.equal(next(root).state, "repair-required");
  plan(root, "game", brief(1, "Complete", "None", gate("cg residue")));
  assert.equal(next(root).state, "queue-complete");
});

test("programme residue keeps shared findings blocking and foreign findings visible", t => {
  const root = fixture(t, "handbook");
  plan(root, "game", brief(1, "Ready"), "handbook");
  plan(root, "other", brief(1, "Ready"), "handbook");
  write(root, "handbook/plans/game/own.json", "{}");
  write(root, "handbook/plans/other/evidence.json", "{}");
  write(root, "handbook/plans/unassigned.json", "{}");
  const result = residue(root, { programme: "game" });
  assert.deepEqual(result.residue.map(r => [r.path, r.scope, r.programme]), [
    ["handbook/plans/game/own.json", "selected", "game"],
    ["handbook/plans/other/evidence.json", "other", "other"],
    ["handbook/plans/unassigned.json", "shared", null],
  ]);
  assert.equal(result.blocking.length, 2);
  assert.equal(residue(root).blocking.length, 3);
  assert.throws(() => residue(root, { programme: "typo" }), /unknown programme/);
  assert.throws(() => residue(root, { programme: "../other" }), /programme/);
});

test("scoped residue CLI succeeds with foreign residue while the global gate fails", t => {
  const root = fixture(t);
  plan(root, "game", brief(1, "Ready"));
  plan(root, "other", brief(1, "Ready"));
  write(root, "docs/plans/other/evidence.json", "{}");
  const scoped = spawnSync(process.execPath, [CLI, "residue", root, "--programme", "game", "--json"], { encoding: "utf8" });
  assert.equal(scoped.status, 0, scoped.stderr);
  assert.equal(JSON.parse(scoped.stdout).residue[0].scope, "other");
  const global = spawnSync(process.execPath, [CLI, "residue", root, "--json"], { encoding: "utf8" });
  assert.equal(global.status, 1, global.stderr);
});

test("status reports the exact current blocker and recovery action without trusting an old note", t => {
  const root = fixture(t);
  plan(root, "game", brief(4, "Complete") + brief(5, "Blocked", "Step 4", gate("cg residue"), "Other programme evidence"));
  write(root, "docs/plans/game/sign-off-repair.md", "Blocked: unreadable dependencies\n");
  const before = fs.readFileSync(path.join(root, "docs/plans/game/sign-off-repair.md"), "utf8");
  const result = status(root, { programme: "game" });
  assert.equal(result.nextAction, "cg-prepare");
  assert.equal(result.remainingSteps.length, 1);
  assert.equal(result.remainingSteps[0].number, 5);
  assert.equal(result.remainingSteps[0].blockedBy, "Other programme evidence");
  assert.deepEqual(result.problems, []);
  assert.equal(fs.readFileSync(path.join(root, "docs/plans/game/sign-off-repair.md"), "utf8"), before);
  const cli = spawnSync(process.execPath, [CLI, "status", root, "--programme", "game", "--json"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), result);
  assert.deepEqual(fs.readdirSync(path.join(root, "docs/plans/game")).sort(), ["phase_detailed_preparation.md", "roadmap.md", "sign-off-repair.md"]);
});

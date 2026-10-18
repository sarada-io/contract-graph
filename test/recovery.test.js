/**
 * @file Check programme recovery, selection and current status projections.
 * @see ../src/runtime/delivery/.agent/contract.md
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { next, permits, parseQueueDocument } from "../src/runtime/delivery/next.js";
import { residue } from "../src/runtime/delivery/residue.js";
import { status } from "../src/runtime/delivery/status.js";

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

test("unreadable dependency syntax admits internal production repair but not closure", t => {
  const root = fixture(t);
  plan(root, "game", brief(1, "Ready", "previous handoff"));
  const result = next(root);
  assert.equal(result.state, "unreadable");
  assert.match(result.problems.join("\n"), /unreadable Depends on/);
  assert.equal(permits(result, "cg-produce").allowed, true);
  assert.equal(permits(result, "cg-prepare").allowed, false);
  assert.equal(permits(result, "cg-sign-off").allowed, false);
  assert.equal(status(root).nextAction, "cg-produce");
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

test("selection discovery reports candidates without expanding their execution queues", t => {
  const root = fixture(t);
  const names = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'];
  for (const name of names) {
    plan(root, name, Array.from({ length: 20 }, (_, i) => brief(i + 1, 'Ready')).join(''));
  }
  const unresolved = status(root);
  assert.equal(unresolved.state, 'selection-required');
  assert.deepEqual(unresolved.programmes, names);
  assert.deepEqual(unresolved.queueFiles, []);
  assert.deepEqual(unresolved.remainingSteps, []);
  assert.equal(unresolved.currentStep, null);
  assert.equal(unresolved.residue, null);
  const call = spawnSync(process.execPath, [CLI, 'status', root], {
    encoding: 'utf8', env: { ...process.env, CG_PROGRAMME: '' },
  });
  assert.equal(call.status, 1, call.stderr);
  assert.match(call.stdout, /selection-required/);
  assert.match(call.stdout, /programmes: alpha, bravo, charlie, delta, echo, foxtrot/);
  assert.doesNotMatch(call.stdout, /Work \d|phase_detailed_preparation/);
  assert.ok(Buffer.byteLength(call.stdout) < 1500);
  const selected = status(root, { programme: 'bravo' });
  assert.equal(selected.programme, 'bravo');
  assert.equal(selected.remainingSteps.length, 20);
  assert.ok(selected.remainingSteps.every(step => step.file.includes('/bravo/')));
  assert.equal(status(root).state, 'selection-required', 'inspection must not persist a selection');
});

test("misplaced global residue admits internal repair without editing the gate or admitting closure", t => {
  const root = fixture(t);
  const text = brief(4, "Complete") + brief(5, "Blocked", "Step 4", gate("npm test && node /tool/bin/cg.js residue"), "Other programme evidence");
  plan(root, "game", text);
  const result = next(root);
  assert.equal(result.state, "repair-required");
  assert.equal(result.stage, "cg-produce");
  assert.equal(result.findings[0].code, "repository-residue-in-step");
  assert.match(result.findings[0].file, /phase_detailed_preparation.md:\d+$/);
  assert.equal(permits(result, "cg-produce").allowed, true);
  assert.equal(permits(result, "cg-prepare").allowed, false);
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
  assert.equal(result.nextAction, "cg-produce");
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

test('programme selection is worktree-local, explicit then environment then pointer; stale targets fail closed', async t => {
  const { selectProgramme } = await import('../src/runtime/delivery/next.js');
  const { statusSummary } = await import('../src/runtime/delivery/status.js');
  const root = fixture(t);
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  git('init', '-q'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
  plan(root, 'first', brief(1, 'Ready')); plan(root, 'second', brief(1, 'Blocked', 'None', '', 'owner answer'));
  git('add', '.'); git('commit', '-qm', 'fixture');
  const other = path.join(root, 'other-worktree'); git('worktree', 'add', '--detach', other);
  selectProgramme(root, 'first'); selectProgramme(other, 'second');
  assert.equal(next(root).programme, 'first'); assert.equal(next(other).programme, 'second');
  assert.equal(next(root).selectionSource, 'worktree');
  assert.equal(next(root, { environment: { CG_PROGRAMME: 'second' } }).programme, 'second');
  assert.equal(next(root, { programme: 'first', environment: { CG_PROGRAMME: 'second' } }).selectionSource, 'explicit');
  assert.equal(statusSummary(root).programmes.length, 2);
  fs.rmSync(path.join(root, 'docs/plans/first'), { recursive: true });
  assert.equal(next(root).state, 'selection-required');
  assert.equal(permits(next(root), 'cg-produce').allowed, false);
  assert.match(next(root).reason, /clear-selection/);
  selectProgramme(root, undefined, { clear: true });
  assert.equal(next(root).programme, 'second');
  assert.equal(next(other).programme, 'second');
});

test('non-Git sessions use explicit/environment selection and standalone bounded work needs no queue', async t => {
  const { selectProgramme } = await import('../src/runtime/delivery/next.js');
  const root = fixture(t);
  assert.throws(() => selectProgramme(root, 'work'), /requires Git/);
  assert.equal(permits(next(root), 'cg-produce').entry, 'bounded-change');
  plan(root, 'work', brief(1, 'Blocked', 'None', '', 'owner answer'));
  const result = next(root, { environment: { CG_PROGRAMME: 'work' } });
  assert.equal(result.selectionSource, 'environment');
  assert.equal(permits(result, 'cg-produce').executionAllowed, false);
});

test('summary retains installation and parse failures even with no programme rows', async t => {
  const { statusSummary } = await import('../src/runtime/delivery/status.js');
  const root = fixture(t);
  write(root, '.agents/cg/manifest.json', '{}');
  let summary = statusSummary(root);
  assert.equal(summary.installation.requiresInit, true);
  assert.deepEqual(summary.programmes, []);
  let cli = spawnSync(process.execPath, [CLI, 'status', root, '--summary', '--json'], { encoding: 'utf8' });
  assert.equal(cli.status, 1);
  assert.equal(JSON.parse(cli.stdout).installation.requiresInit, true);
  write(root, '.agents/cg/deliveries/broken.json', '{}');
  summary = statusSummary(root);
  assert.match(summary.problems.join('\n'), /malformed delivery/);
  cli = spawnSync(process.execPath, [CLI, 'status', root, '--summary'], { encoding: 'utf8' });
  assert.equal(cli.status, 1); assert.match(cli.stdout, /malformed delivery/);
});

test('explicit standalone request can admit an independent correction without programme selection', t => {
  const root = fixture(t);
  const request = { task: 'Correct independent helper', writes: ['helpers/parse.js'] };
  assert.equal(permits(next(root, { standalone: request }), 'cg-produce').allowed, true);
  plan(root, 'first', brief(1, 'Blocked', 'None', '', 'owner answer'));
  plan(root, 'second', brief(1, 'Ready'));
  assert.equal(permits(next(root), 'cg-produce').allowed, false);
  const unknown = next(root, { standalone: request });
  assert.equal(unknown.state, 'scope-review-required');
  request.scopeReviews = unknown.scopeReview.map(item => ({ programme: item.programme, fingerprint: item.fingerprint,
    paths: [`products/${item.programme}`], reason: 'Read roadmap and queue; all work is confined to this product boundary.' }));
  const independent = next(root, { standalone: request });
  assert.equal(permits(independent, 'cg-produce').allowed, true);
  assert.equal(independent.programme, null);
  assert.equal(independent.selectionSource, 'standalone');
  assert.equal(next(root).state, 'selection-required');
});

test('standalone scope reviews expire, overlaps block and invalid scope never selects a programme', t => {
  const root = fixture(t);
  plan(root, 'blocked', brief(1, 'Blocked', 'None', '', 'owner answer'));
  const request = { task: 'Correct parser', writes: ['helpers/parse.js'] };
  const initial = next(root, { standalone: request });
  request.scopeReviews = initial.scopeReview.map(item => ({ programme: item.programme, fingerprint: item.fingerprint, paths: ['products/blocked'], reason: 'Read queue and dependency contracts; separate source and configuration.' }));
  assert.equal(permits(next(root, { standalone: request }), 'cg-produce').allowed, true);
  request.writes = ['products'];
  assert.deepEqual(next(root, { standalone: request }).overlaps, ['blocked']);
  request.writes = ['helpers/parse.js'];
  write(root, 'docs/plans/blocked/new-evidence.md', 'Changed scope');
  assert.deepEqual(next(root, { standalone: request }).unknown, ['blocked']);
  for (const writes of [['../outside'], ['/outside'], ['src/**'], ['.agents/cg/deliveries/x.json'], ['docs/plans']]) {
    assert.equal(permits(next(root, { standalone: { ...request, writes } }), 'cg-produce').allowed, false);
  }
  assert.equal(permits(next(root, { standalone: request, environment: { CG_PROGRAMME: 'blocked' } }), 'cg-produce').allowed, false);
  const ready = { ...initial, state: 'standalone-ready', installation: { requiresInit: true, reason: 'Mismatch' } };
  assert.equal(permits(ready, 'cg-produce').allowed, false);
  ready.installation.requiresInit = false; ready.intent = { required: true, ready: false, reason: 'Approval missing' };
  assert.equal(permits(ready, 'cg-produce').allowed, false);
  assert.equal(next(root).state, 'blocked');
});

test('sixteen-programme compact summary shares metadata and retains actions and failure state', async t => {
  const { statusSummary } = await import('../src/runtime/delivery/status.js');
  const root = fixture(t);
  for (let n = 0; n < 16; n++) plan(root, `programme-${String(n).padStart(2, '0')}`, brief(1, n % 2 ? 'Ready' : 'Blocked', 'None', '', n % 2 ? 'None' : 'owner answer'));
  const start = performance.now(); const expanded = statusSummary(root); const middle = performance.now();
  const compact = statusSummary(root, { compact: true }); const end = performance.now();
  const bytes = value => Buffer.byteLength(JSON.stringify(value, null, 2) + '\n');
  assert.equal(compact.programmes.length, 16);
  assert.deepEqual(compact.programmes.map(p => [p.programme, p.state, p.nextAction]), expanded.programmes.map(p => [p.programme, p.state, p.nextAction]));
  assert.ok(compact.programmes.every(p => !p.installation && !p.intent && !p.signOffRecovery && p.retrieve));
  assert.ok(bytes(compact) < bytes(expanded)); assert.ok(bytes(compact) <= 65536);
  t.diagnostic(JSON.stringify({ fixture: 'sixteen-programmes-v1', expandedBytes: bytes(expanded), compactBytes: bytes(compact), expandedMs: middle-start, compactMs: end-middle }));
  plan(root, 'broken', brief(1, 'Ready', 'unreadable dependency'));
  assert.equal(statusSummary(root, { compact: true }).hasProblems, true);
  const call = spawnSync(process.execPath, [CLI, 'status', root, '--summary', '--compact', '--json'], { encoding: 'utf8' });
  assert.equal(call.status, 1); assert.equal(JSON.parse(call.stdout).hasProblems, true);
  write(root, '.agents/cg/manifest.json', JSON.stringify({ runtime: { buildId: 'old', extra: 'x'.repeat(100000) } }));
  const oversized = statusSummary(root, { compact: true });
  assert.ok(bytes(oversized) <= 65536);
  assert.equal(oversized.installation.requiresInit, true);
  assert.ok(oversized.omissions.some(item => item.field === 'installation.installed'));
});

test("status summary shares source and queue reads while fresh queries see edits", async t => {
  const { statusSummary } = await import('../src/runtime/delivery/status.js');
  const root = fixture(t);
  for (const programme of ['first', 'second', 'third']) plan(root, programme, brief(1, 'Ready'));
  const original = fs.readFileSync;
  const counts = new Map();
  fs.readFileSync = function(file, ...args) {
    const name = String(file);
    counts.set(name, (counts.get(name) ?? 0) + 1);
    return original.call(this, file, ...args);
  };
  let summary;
  try { summary = statusSummary(root); }
  finally { fs.readFileSync = original; }
  assert.equal(counts.get(fileURLToPath(new URL('../src/runtime/cli.js', import.meta.url))), 1);
  for (const item of summary.programmes) {
    // Queue parsing and residue link analysis each read once, independent of programme count.
    assert.equal(counts.get(path.join(root, 'docs/plans', item.programme, 'phase_detailed_preparation.md')), 2);
    assert.deepEqual(item, status(root, { programme: item.programme }));
  }
  plan(root, 'second', brief(1, 'Complete'));
  assert.equal(statusSummary(root).programmes.find(item => item.programme === 'second').state, 'queue-complete');
  plan(root, 'second', brief(1, 'Mystery'));
  assert.equal(statusSummary(root).programmes.find(item => item.programme === 'second').state, 'unreadable');
});

test("shared docs-root reads preserve tolerant queries and strict delivery behavior", async t => {
  const { readDocsRoot } = await import('../src/runtime/installation/profiles.js');
  const { deliveryDocs } = await import('../src/runtime/delivery/delivery.js');
  const root = fixture(t);
  assert.equal(readDocsRoot(root), 'docs');
  assert.equal(deliveryDocs(root), 'docs');
  write(root, '.agents/cg/profile.json', '{');
  assert.equal(readDocsRoot(root), 'docs');
  assert.throws(() => deliveryDocs(root), SyntaxError);
  write(root, '.agents/cg/profile.json', JSON.stringify({ docs: 'handbook/team' }));
  assert.equal(readDocsRoot(root), 'handbook/team');
  assert.throws(() => deliveryDocs(root), /invalid docs root/);
});

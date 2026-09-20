import { approveFixtureIntent } from "./helpers/intent.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { init } from "../src/scripts/init.js";
import { runtimeIdentity, installationStatus } from "../src/scripts/runtime.js";
import { next, permits } from "../src/scripts/next.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI = path.join(ROOT, "bin/cg.js");
const HOOK = path.join(ROOT, "src/install/hooks/cg-gate.mjs");
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-runtime-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  init(root, { profiles: ["agents"] });
  approveFixtureIntent(root);
  return root;
}
function executable(root, relative, body) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, { mode: 0o755 });
}
function hook(root, bin, skill = "cg-produce") {
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, CG_PROGRAMME: "", CG_GATE_CHAIN: "" };
  delete env.CG_BIN;
  const session = `runtime-test-${path.basename(root)}`;
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ cwd: root, session_id: session, tool_input: { skill } }), encoding: "utf8", env,
  });
  spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ cwd: root, session_id: session, hook_event_name: "UserPromptSubmit" }), env });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).hookSpecificOutput;
}

test("source and packaged layouts identify the same build; same-version edits change identity", t => {
  const root = fixture(t), compiled = path.join(root, "package");
  fs.mkdirSync(compiled);
  // Construct the shipped runtime layout directly, independently of a pre-existing build/.
  for (const [source, target] of [["src/scripts", "script"], ["src/skills", "agent/skills"], ["src/install/hooks", "agent/hooks"], ["src/cg/schema", "agent/cg/schema"]]) {
    fs.cpSync(path.join(ROOT, source), path.join(compiled, target), { recursive: true });
  }
  fs.rmSync(path.join(compiled, "script/dev.js"));
  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(compiled, "package.json"));
  const source = runtimeIdentity(), packaged = runtimeIdentity(compiled);
  assert.equal(packaged.buildId, source.buildId);
  const expertFile = path.join(compiled, "agent/skills/experts/api-expert/SKILL.md");
  const originalExpert = fs.readFileSync(expertFile, "utf8");
  fs.appendFileSync(expertFile, "\nChanged expert guidance.\n");
  assert.notEqual(runtimeIdentity(compiled).buildId, source.buildId, "expert edits must invalidate installed identity");
  fs.writeFileSync(expertFile, originalExpert);
  fs.appendFileSync(path.join(compiled, "script/next.js"), "\n// distinct development build\n");
  const changed = runtimeIdentity(compiled);
  assert.equal(changed.version, source.version);
  assert.notEqual(changed.buildId, source.buildId);
});

test("init records build identity while repository policy edits remain owned", t => {
  const root = fixture(t);
  assert.equal(installationStatus(root).state, "matched");
  fs.appendFileSync(path.join(root, ".agents/cg/workflow.md"), "\nRepository-specific policy.\n");
  assert.equal(installationStatus(root).state, "matched");
  const file = path.join(root, ".agents/cg/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file));
  manifest.runtime.buildId = "0".repeat(64);
  fs.writeFileSync(file, JSON.stringify(manifest));
  assert.equal(installationStatus(root).state, "mismatch");
  assert.equal(permits(next(root), "cg-produce").allowed, false);
  init(root, { profiles: ["agents"] });
  assert.equal(installationStatus(root).state, "matched");
  assert.match(fs.readFileSync(path.join(root, ".agents/cg/workflow.md"), "utf8"), /Repository-specific policy/);
  assert.equal(permits(next(root), "cg-produce").allowed, true);
});

test("legacy manifests request installation reconciliation without losing queue facts", t => {
  const root = fixture(t), file = path.join(root, ".agents/cg/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file)); delete manifest.runtime;
  fs.writeFileSync(file, JSON.stringify(manifest));
  const result = next(root);
  assert.equal(result.state, "no-queue");
  assert.equal(result.installation.state, "unrecorded");
  assert.equal(permits(result, "cg-produce").allowed, false);
});

test("hook uses the same PATH command as skills and ignores a stray repository CLI", t => {
  const root = fixture(t), bin = path.join(root, "tools");
  executable(root, "tools/cg", `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(CLI)} "$@"\n`);
  executable(root, "node_modules/.bin/cg", "#!/bin/sh\nprintf 'wrong local CLI'\nexit 1\n");
  assert.equal(hook(root, bin).permissionDecision, "allow");
});

test("installed hook rejects an old CLI that reports readiness without build identity", t => {
  const root = fixture(t), bin = path.join(root, "tools");
  executable(root, "tools/cg", "#!/bin/sh\nprintf '%s\\n' '{\"state\":\"ready\",\"stage\":\"cg-produce\",\"allowed\":true}'\n");
  const verdict = hook(root, bin, "cg-produce");
  assert.equal(verdict.permissionDecision, "deny");
  assert.match(verdict.permissionDecisionReason, /too old to identify itself/);
});

test("version JSON identifies the actual executable as well as the release", () => {
  const result = spawnSync(process.execPath, [CLI, "--version", "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), runtimeIdentity());
});

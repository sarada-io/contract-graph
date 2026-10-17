/**
 * @file Check owned Windows npm wrapper correction and uncertain-path preservation.
 * @see ../src/runtime/distribution/.agent/contract.md
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { correctWindowsLauncher } from "../src/runtime/distribution/windows-launcher.js";

const fixtures = fileURLToPath(new URL("./fixtures/windows-launcher/", import.meta.url));
// These files were captured from npm 11.19 cmd-shim, not produced by the helper.
function fixture(t) {
  const prefix = fs.mkdtempSync(path.join(os.tmpdir(), "cg prefix ü "));
  t.after(() => fs.rmSync(prefix, { recursive: true, force: true }));
  const packageRoot = path.join(prefix, "node_modules", "contract-graph");
  fs.mkdirSync(path.join(packageRoot, "script"), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, "script/cli.js"), "#!/usr/bin/env node\n");
  fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({name:"contract-graph", type:"module", bin:{cg:"script/cli.js"}}));
  for (const name of ["cg.ps1", "cg.cmd"]) fs.copyFileSync(path.join(fixtures, name), path.join(prefix, name));
  fs.writeFileSync(path.join(prefix, "cg"), "shell wrapper retained");
  const options = { platform: "win32", env: { npm_config_global: "true", npm_config_prefix: prefix }, packageRoot };
  return { prefix, packageRoot, options, ps1: path.join(prefix,"cg.ps1"), cmd:path.join(prefix,"cg.cmd") };
}

test("only the owned PowerShell wrapper is removed; repeated calls succeed", t => {
  const f = fixture(t);
  const cmd = fs.readFileSync(f.cmd);
  assert.deepEqual(correctWindowsLauncher(f.options), { status: "removed" });
  assert.equal(fs.existsSync(f.ps1), false);
  assert.deepEqual(fs.readFileSync(f.cmd), cmd);
  assert.equal(fs.readFileSync(path.join(f.prefix,"cg"),"utf8"), "shell wrapper retained");
  assert.deepEqual(correctWindowsLauncher(f.options), { status: "noop" });
});

test("the packaged hook resolves its package root from the distribution directory", async t => {
  const f = fixture(t);
  const file = path.join(f.packageRoot, "script/distribution/windows-launcher.js");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.copyFileSync(fileURLToPath(new URL("../src/runtime/distribution/windows-launcher.js", import.meta.url)), file);
  const hook = await import(pathToFileURL(file).href);
  const { packageRoot, ...options } = f.options;
  assert.deepEqual(hook.correctWindowsLauncher(options), { status: "removed" });
  assert.equal(fs.existsSync(f.ps1), false);
  assert.equal(fs.existsSync(f.cmd), true);
});

for (const scenario of ["linux", "darwin", "local", "source", "prefix"]) {
  test(`${scenario} does not touch wrappers`, t => {
    const f = fixture(t);
    const bytes = fs.readFileSync(f.ps1);
    if (["linux","darwin"].includes(scenario)) f.options.platform = scenario;
    if (scenario === "local") f.options.env.npm_config_global = "false";
    if (scenario === "source") f.options.packageRoot = path.join(f.prefix,"source");
    if (scenario === "prefix") f.options.env.npm_config_prefix = path.join(f.prefix,"other");
    assert.notEqual(correctWindowsLauncher(f.options).status, "removed");
    assert.deepEqual(fs.readFileSync(f.ps1), bytes);
  });
}

for (const scenario of ["foreign ps1", "foreign cmd", "appended code", "metadata", "missing cmd", "missing cli"]) {
  test(`preserves uncertain ownership: ${scenario}`, t => {
    const f = fixture(t);
    if (scenario === "foreign ps1") fs.writeFileSync(f.ps1, fs.readFileSync(f.ps1,"utf8").replaceAll("contract-graph/", "other-package/"));
    if (scenario === "foreign cmd") fs.writeFileSync(f.cmd, fs.readFileSync(f.cmd,"utf8").replaceAll("contract-graph\\", "other-package\\"));
    if (scenario === "appended code") fs.appendFileSync(f.ps1,"\nWrite-Output unrelated\n");
    if (scenario === "metadata") fs.writeFileSync(path.join(f.packageRoot,"package.json"), '{"name":"contract-graph","bin":{"cg":"other.js"}}');
    if (scenario === "missing cmd") fs.unlinkSync(f.cmd);
    if (scenario === "missing cli") fs.unlinkSync(path.join(f.packageRoot,"script/cli.js"));
    const bytes = fs.readFileSync(f.ps1);
    assert.equal(correctWindowsLauncher(f.options).status, "warning");
    assert.deepEqual(fs.readFileSync(f.ps1), bytes);
  });
}

test("changed wrapper detected on final read is preserved", t => {
  const f = fixture(t);
  let reads = 0;
  const io = { ...fs, readFileSync(file, ...args) {
    if (file === f.ps1 && ++reads === 2) fs.appendFileSync(file, "changed");
    return fs.readFileSync(file, ...args);
  }};
  assert.equal(correctWindowsLauncher({...f.options, io}).status,"warning");
  assert.ok(fs.readFileSync(f.ps1,"utf8").endsWith("changed"));
});

test("denied verified removal fails instead of claiming success", t => {
  const f = fixture(t);
  const bytes = fs.readFileSync(f.ps1);
  const io = {...fs, unlinkSync() { throw Object.assign(new Error("denied"), {code:"EACCES"}); }};
  assert.throws(() => correctWindowsLauncher({...f.options,io}), /Cannot remove verified.*EACCES/);
  assert.deepEqual(fs.readFileSync(f.ps1), bytes);
});

test("development link or junction is preserved", t => {
  const f = fixture(t);
  const original = path.join(f.prefix,"linked-source");
  fs.renameSync(f.packageRoot,original);
  fs.symlinkSync(original, f.packageRoot, process.platform === "win32" ? "junction" : "dir");
  const bytes = fs.readFileSync(f.ps1);
  assert.equal(correctWindowsLauncher(f.options).status,"warning");
  assert.deepEqual(fs.readFileSync(f.ps1),bytes);
});

test("wrapper reparse point is preserved", t => {
  const f = fixture(t);
  const io = {...fs, lstatSync(file) {
    const stat = fs.lstatSync(file);
    if (file === f.ps1) stat.isSymbolicLink = () => true;
    return stat;
  }};
  assert.equal(correctWindowsLauncher({...f.options,io}).status,"warning");
  assert.equal(fs.existsSync(f.ps1),true);
});

// Repository contract: ../.agent/distribution/contract.md
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "../src/scripts/build.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
function copySourceTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const input = path.join(from, entry.name);
    const output = path.join(to, entry.name);
    if (entry.isDirectory()) copySourceTree(input, output);
    else {
      assert.ok(entry.isFile(), `unexpected source entry: ${input}`);
      fs.copyFileSync(input, output);
      assert.deepEqual(fs.readFileSync(output), fs.readFileSync(input), `fixture copy: ${input}`);
    }
  }
}
function prepareSource(root) {
  const source = path.join(root, "source");
  fs.mkdirSync(source);
  // Explicit traversal avoids the platform-dependent recursive cpSync fast path.
  for (const name of ["src", "bin"]) copySourceTree(path.join(repo, name), path.join(source, name));
  for (const name of ["package.json", "README.md", "LICENSE"]) fs.copyFileSync(path.join(repo, name), path.join(source, name));
  build(source);
  return source;
}
test("Windows lifecycle fixture builds completely in a space and Unicode path", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg npm ü "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = prepareSource(root);
  const check = build(source, { write: false });
  assert.deepEqual(check.changed, []);
  assert.deepEqual(check.removed, []);
});
test("packed Windows npm lifecycle supports bare cg in Restricted PowerShell", {
  skip: process.platform !== "win32" || process.env.CG_WINDOWS_LIFECYCLE !== "1",
  timeout: 240000,
}, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg npm ü "));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  const source = prepareSource(root);
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli && fs.existsSync(npmCli), "run this test through npm test");
  const prefix = path.join(root,"prefix space ü");
  const env = {...process.env, npm_config_cache:process.env.npm_config_cache || path.join(repo,"tmp/npm-cache"),
    PATH:prefix+path.delimiter+path.dirname(process.execPath)+path.delimiter+process.env.PATH};
  // Windows PowerShell must not inherit PowerShell 7's built-in module directory.
  delete env.PSModulePath;
  const run = (exe,args,extra={}) => {
    const result = spawnSync(exe,args,{cwd:root,env,encoding:"utf8",timeout:90000,...extra});
    assert.equal(result.status,0, `${result.error || ""}\n${result.stdout}\n${result.stderr}`);
    return result;
  };
  const npm = args => run(process.execPath,[npmCli,...args,"--no-audit","--no-fund"]);
  t.diagnostic(`Windows ${os.release()}, Node ${process.version}, npm ${run(process.execPath,[npmCli,"--version"]).stdout.trim()}`);
  npm(["pack",path.join(source,"dist/build"),"--ignore-scripts","--pack-destination",root]);
  const archive = path.join(root,`contract-graph-${JSON.parse(fs.readFileSync(path.join(source,"package.json"))).version}.tgz`);
  const install = (...args) => npm(["install","--global","--prefix",prefix,...args,archive]);
  const ps1 = path.join(prefix,"cg.ps1");
  install();
  assert.equal(fs.existsSync(ps1),false);
  fs.writeFileSync(path.join(prefix,"unrelated.txt"),"retain");
  const shells = [path.join(process.env.SystemRoot,"System32/WindowsPowerShell/v1.0/powershell.exe"), process.env.CG_PWSH || "pwsh.exe"];
  for (const shell of shells) {
    t.diagnostic(`PowerShell ${run(shell,["-NoProfile","-Command","$PSVersionTable.PSVersion.ToString()"]).stdout.trim()}`);
    // Load the security module before Restricted policy, which otherwise blocks its type data.
    const command = `Import-Module Microsoft.PowerShell.Security; Set-ExecutionPolicy -Scope Process Restricted -Force; if ((Get-ExecutionPolicy) -ne 'Restricted') { exit 31 }; if ((Get-Command cg).Source -ne $env:CG_EXPECTED_CMD) { exit 32 }; cg --version --json; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; cg contract show --id 'missing id ü'; if ($LASTEXITCODE -ne 1) { exit 33 }; exit 0`;
    const launched = run(shell,["-NoProfile","-ExecutionPolicy","Bypass","-Command","$ErrorActionPreference='Stop'; "+command],{env:{...env,CG_EXPECTED_CMD:path.join(prefix,"cg.cmd")}});
    assert.equal(JSON.parse(launched.stdout).executable, path.join(prefix,"node_modules/contract-graph/script/cli.js"));
    const target = path.join(root, path.basename(shell)+" project ü");
    const flow = `Import-Module Microsoft.PowerShell.Security; Set-ExecutionPolicy -Scope Process Restricted -Force; cg init $env:CG_TARGET --yes --docs docs --profile agents; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; cg verify $env:CG_TARGET; exit $LASTEXITCODE`;
    run(shell,["-NoProfile","-ExecutionPolicy","Bypass","-Command","$ErrorActionPreference='Stop'; "+flow],{env:{...env,CG_TARGET:target}});
  }
  npm(["rebuild","--global","--prefix",prefix]);
  assert.equal(fs.existsSync(ps1),false);
  install();
  assert.equal(fs.existsSync(ps1),false);
  install("--ignore-scripts");
  assert.equal(fs.existsSync(ps1),true);
  for (const shell of shells) {
    const blocked = run(shell,["-NoProfile","-ExecutionPolicy","Bypass","-Command",`$ErrorActionPreference='Stop'; Import-Module Microsoft.PowerShell.Security; Set-ExecutionPolicy -Scope Process Restricted -Force; try { cg --version; exit 34 } catch { if ($_.Exception -isnot [System.Management.Automation.PSSecurityException]) { exit 35 } }; & $env:CG_EXPECTED_CMD --version; exit $LASTEXITCODE`],{env:{...env,CG_EXPECTED_CMD:path.join(prefix,"cg.cmd")}});
    assert.ok(blocked.stdout.trim());
  }
  // Resolve the script first, then remove it while this same shell remains open.
  const recovery = `$ErrorActionPreference='Stop'; Import-Module Microsoft.PowerShell.Security; Set-ExecutionPolicy -Scope Process Restricted -Force; if ((Get-Command cg).CommandType -ne 'ExternalScript') { exit 36 }; & $env:CG_NODE $env:CG_HOOK; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; if ((Get-Command cg).Source -ne $env:CG_EXPECTED_CMD) { exit 37 }; cg --version --json; exit $LASTEXITCODE`;
  run(shells[0],["-NoProfile","-ExecutionPolicy","Bypass","-Command",recovery],{env:{...env,
    npm_config_global:"true",npm_config_prefix:prefix,CG_NODE:process.execPath,
    CG_HOOK:path.join(prefix,"node_modules/contract-graph/script/windows-launcher.js"),CG_EXPECTED_CMD:path.join(prefix,"cg.cmd")}});
  assert.equal(fs.existsSync(ps1),false);
  install();
  assert.equal(fs.existsSync(ps1),false);
  assert.equal(fs.readFileSync(path.join(prefix,"unrelated.txt"),"utf8"),"retain");

  const older = path.join(root,"older");
  fs.mkdirSync(path.join(older,"script"),{recursive:true});
  fs.writeFileSync(path.join(older,"package.json"),JSON.stringify({name:"contract-graph",version:"0.0.1",bin:{cg:"script/cli.js"}}));
  fs.writeFileSync(path.join(older,"script/cli.js"),'#!/usr/bin/env node\nconsole.log("old fixture");\n');
  npm(["pack",older,"--ignore-scripts","--pack-destination",root]);
  const upgradePrefix = path.join(root,"upgrade");
  npm(["install","--global","--prefix",upgradePrefix,path.join(root,"contract-graph-0.0.1.tgz")]);
  assert.equal(fs.existsSync(path.join(upgradePrefix,"cg.ps1")),true);
  npm(["install","--global","--prefix",upgradePrefix,archive]);
  assert.equal(fs.existsSync(path.join(upgradePrefix,"cg.ps1")),false);
  const local = path.join(root,"local");
  npm(["install","--prefix",local,archive]);
  assert.equal(fs.existsSync(path.join(local,"node_modules/.bin/cg.ps1")),true);
  const linked = path.join(root,"link-prefix");
  fs.mkdirSync(linked);
  npm(["link","--prefix",linked,path.join(source,"dist/build")]);
  assert.equal(fs.lstatSync(path.join(linked,"node_modules/contract-graph")).isSymbolicLink(),true);
  assert.equal(fs.existsSync(path.join(linked,"cg.ps1")),true);
  npm(["uninstall","--global","--prefix",prefix,"contract-graph"]);
  for (const name of ["cg","cg.cmd","cg.ps1","node_modules/contract-graph"]) assert.equal(fs.existsSync(path.join(prefix,name)),false);
  assert.equal(fs.readFileSync(path.join(prefix,"unrelated.txt"),"utf8"),"retain");
});

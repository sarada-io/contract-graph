import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const available = !spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-Command', 'exit 0']).error;
const quote = value => `'${value.replaceAll("'", "''")}'`;
const source = `. ${quote(path.join(root, 'scripts/urun.ps1'))}; $ErrorActionPreference = 'Stop'; `;
const run = (code, cwd = root) => spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-Command', source + code], {
  cwd, encoding: 'utf8', timeout: 15000,
});
const options = { skip: available ? false : 'PowerShell 7 is required for menu tests' };

test('urun arrow navigation wraps and supports Home/End', options, () => {
  const result = run(`
    @(
      (Get-NextSelection 0 9 UpArrow), (Get-NextSelection 8 9 DownArrow),
      (Get-NextSelection 4 9 Home), (Get-NextSelection 4 9 End),
      (Get-NextSelection 3 9 LeftArrow)
    ) | ConvertTo-Json -Compress
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [8, 0, 0, 8, 3]);
});

test('urun menu uses existing npm activities and current package version', options, () => {
  const result = run('Get-MenuItems | ConvertTo-Json -Compress');
  assert.equal(result.status, 0, result.stderr);
  const items = JSON.parse(result.stdout);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const item of items.filter(item => item.Script)) assert.ok(pkg.scripts[item.Script]);
  assert.ok(items.find(item => item.Script === 'pack').Label.includes(pkg.version));
  assert.equal(items.at(-1).Kind, 'exit');
});

test('urun cancel never invokes clean or editor fixture creation', options, () => {
  const result = run(`
    function Read-MenuChoice { return -1 }
    function Invoke-RepoCommand { throw 'An action ran after cancellation' }
    Invoke-MenuItem @{ Kind = 'clean' }
    Invoke-MenuItem @{ Kind = 'editor' }
  `);
  assert.equal(result.status, 0, result.stderr);
});

test('urun dispatches menu entries and stops environment checks at first failure', options, () => {
  const result = run(`
    $script:calls = @()
    function Invoke-RepoCommand($Command, $Arguments) {
      $script:calls += @{ Command = $Command; Arguments = $Arguments }
      return 17
    }
    $build = Invoke-MenuItem @{ Script = 'build' }
    $doctor = Invoke-MenuItem @{ Kind = 'doctor' }
    @{ Build = $build; Doctor = $doctor; Calls = $script:calls } | ConvertTo-Json -Depth 5 -Compress
  `);
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.Build, 17);
  assert.equal(data.Doctor, 17);
  assert.deepEqual(data.Calls, [
    { Command: 'npm', Arguments: ['run', 'build'] },
    { Command: 'node', Arguments: ['--version'] },
  ]);
});

test('urun runs at repository root, restores caller directory, and returns native failure', options, t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'urun caller '));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const result = run(`
    $before = (Get-Location).Path
    $status = Invoke-RepoCommand 'node' @('-e', 'if (!require("node:fs").existsSync("bin/cg.js")) process.exit(99); process.exit(17)')
    if ($status -ne 17) { throw "Wrong exit status: $status" }
    if ((Get-Location).Path -ne $before) { throw 'Caller directory changed' }
  `, cwd);
  assert.equal(result.status, 0, result.stderr);
});

test('urun noninteractive invocation lists choices and never runs an action', options, () => {
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-File', path.join(root, 'scripts/urun.ps1')], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Run all tests/);
  assert.match(result.stderr, /Nothing was executed/);
});

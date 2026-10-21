/**
 * @file Verify that public-source checks reject private material without printing it.
 * @see ../src/runtime/distribution/.agent/contract.md
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { checkPublicSource } from '../scripts/check-public-source.mjs';

test('public-source checks catch staged ignored files and redact credentials', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-public-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.writeFileSync(path.join(root, '.gitignore'), '.env\n');
  fs.writeFileSync(path.join(root, '.env'), 'PLACEHOLDER=local\n');
  assert.deepEqual(checkPublicSource(root), []);
  execFileSync('git', ['add', '-f', '.env'], { cwd: root });
  const oldPlan = path.join(root, 'docs/plan/windows-launcher.md');
  fs.mkdirSync(path.dirname(oldPlan), { recursive: true }); fs.writeFileSync(oldPlan, '# Obsolete working record\n');
  assert.ok(checkPublicSource(root).some(error => error.includes('docs/plan/windows-launcher.md: private')));
  assert.ok(checkPublicSource(root).some(error => error.includes('.env: private')));
  fs.writeFileSync(path.join(root, 'source.js'), 'export const value = 1;\n');
  const candidate = ['ghp', '_', 'x'.repeat(36)].join('');
  fs.writeFileSync(path.join(root, 'source.js'), `const candidate = "${candidate}";\n`);
  const errors = checkPublicSource(root).join('\n');
  assert.match(errors, /source.js: possible credential/);
  assert.ok(!errors.includes(candidate));
  fs.writeFileSync(path.join(root, 'source.js'), ['/', 'Users', '/sample/private/project/'].join(''));
  assert.ok(checkPublicSource(root).some(error => error.includes('local-machine path')));
  const receipt = path.join(root, '.agents/cg/deliveries/receipt.json');
  fs.mkdirSync(path.dirname(receipt), { recursive: true }); fs.writeFileSync(receipt, '{}');
  assert.ok(checkPublicSource(root).some(error => error.includes('receipt.json: private')));
});

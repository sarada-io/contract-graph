import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyse, renderAnalysisPrompt } from '../src/scripts/analyse.js';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-analyse-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo `quoted`');
  fs.mkdirSync(repo);
  return { dir, repo, report: path.join(dir, 'reports', 'assessment.md') };
}
test('prepares usable absolute context without installing or writing anything', t => {
  const {dir, repo, report} = fixture(t);
  fs.writeFileSync(path.join(repo, 'README.md'), 'Existing project');
  fs.writeFileSync(path.join(repo, 'package.json'), '{"scripts":{"prepare":"exit 99"}}');
  const before = fs.readdirSync(repo);
  const context = analyse(repo, {report});
  assert.deepEqual(fs.readdirSync(repo), before);
  assert.equal(fs.existsSync(path.dirname(report)), false);
  assert.equal(context.target, fs.realpathSync(repo));
  assert.equal(context.guidance.length, 2);
  for (const resource of Object.values(context.resources)) assert.ok(fs.statSync(resource).isFile());
  assert.ok(context.inspection.includes(fs.realpathSync(repo)));
  const prompt = renderAnalysisPrompt(context);
  assert.deepEqual(JSON.parse(prompt.split('```json\n')[1].split('\n```')[0]), context);
  assert.match(prompt, /no assessment or report has yet/);
});
test('rejects existing, internal and symlink-disguised report destinations', t => {
  const {dir, repo, report} = fixture(t);
  assert.throws(() => analyse(repo, {report: path.join(repo, 'new', 'report.md')}), /outside/);
  const link = path.join(dir, 'alias');
  fs.symlinkSync(repo, link, 'dir');
  assert.throws(() => analyse(repo, {report: path.join(link, 'report.md')}), /outside/);
  fs.writeFileSync(path.join(dir, 'existing.md'), 'preserve');
  assert.throws(() => analyse(repo, {report: path.join(dir, 'existing.md')}), /already exists/);
  fs.symlinkSync(path.join(dir, 'absent'), path.join(dir, 'dangling'));
  assert.throws(() => analyse(repo, {report: path.join(dir, 'dangling', 'report.md')}), /dangling/);
  assert.equal(fs.existsSync(report), false);
});
test('does not follow target guidance symlinks', t => {
  const {dir, repo, report} = fixture(t);
  fs.writeFileSync(path.join(dir, 'private.md'), 'outside');
  fs.symlinkSync(path.join(dir, 'private.md'), path.join(repo, 'AGENTS.md'));
  const context = analyse(repo, {report});
  assert.deepEqual(context.guidance, []);
  assert.match(context.skipped[0].reason, /symlink/);
});
test('CLI supports fixed prompt, JSON and default cwd, rejects invalid flags', t => {
  const {repo, report} = fixture(t);
  const cli = path.resolve('bin/cg.js');
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], {cwd:repo, encoding:'utf8'});
  const result = run('analyse', '--report', report, '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).target, fs.realpathSync(repo));
  assert.match(run('analyse').stdout, /Assess this repository/);
  for (const args of [['analyse','--yes'], ['analyse',repo,repo], ['analyse','--report']]) {
    assert.notEqual(run(...args).status, 0);
  }
  assert.deepEqual(fs.readdirSync(repo), []);
});

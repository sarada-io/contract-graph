import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { init } from '../src/scripts/init.js';
import { sync } from '../src/scripts/sync.js';
import { verify, CORE_CG_SKILLS } from '../src/scripts/verify.js';
import { next, permits } from '../src/scripts/next.js';
import { loadContract, stringifyContractYaml } from '../src/scripts/contracts.js';
import { approveFixtureIntent } from './helpers/intent.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function write(dir, file, text) {
  const target = path.join(dir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text);
}
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-retire-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  init(dir, { profiles: ['agents', 'claude'] }); sync(dir); approveFixtureIntent(dir);
  return dir;
}

test('0.7 installation retires known skills and wrappers with backups and preserves user work', t => {
  const dir = fixture(t);
  const names = ['cg-prepare', 'cg-auto-run'];
  for (const name of names) {
    assert.equal(CORE_CG_SKILLS.includes(name), false);
    assert.equal(fs.existsSync(path.join(dir, '.agents/skills', name)), false);
  }
  const manifestPath = path.join(dir, '.agents/cg/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const originals = new Map();
  for (const name of names) {
    for (const file of ['SKILL.md', 'agents/openai.yaml', 'references/verification.md']) {
      const relative = `.agents/skills/${name}/${file}`;
      const text = file === 'SKILL.md' ? `---\nname: ${name}\ndescription: Prior release\n---\n# Old skill\nLocal edits retained in backup.\n` : 'prior framework content\n';
      write(dir, relative, text); originals.set(relative, text);
      manifest.files[relative] = { version: '0.6.0', sha256: 'old-release-hash' };
    }
    const wrapper = `.claude/skills/${name}/SKILL.md`;
    const text = `# Contract Graph Skill Discovery\nRead .agents/skills/${name}/SKILL.md\n`;
    write(dir, wrapper, text); originals.set(wrapper, text);
    write(dir, `.agents/skills/${name}/personal-notes.md`, 'keep user notes');
  }
  for (const file of ['prototype-completion.md', 'sprint-completion.md', 'phase-sign-off.md']) {
    const relative = `.agents/skills/cg-sign-off/references/${file}`;
    const text = 'Previous framework completion procedure, with local annotations.\n';
    write(dir, relative, text); originals.set(relative, text);
    manifest.files[relative] = { version: '0.6.0', sha256: 'old-release-hash' };
  }
  for (const relative of [
    '.agents/skills/cg-warmup/assets/contract.template.yaml',
    '.agents/skills/cg-warmup/assets/component-contract.template.yaml',
    '.agents/skills/cg-produce/assets/contract.template.yaml',
  ]) {
    const text = '# old contract template with local annotations\n';
    write(dir, relative, text); originals.set(relative, text);
    manifest.files[relative] = { version: '0.6.0', sha256: 'old-release-hash' };
  }
  write(dir, '.agents/skills/cg-warmup/assets/custom-contract.yaml', '# keep custom template');
  write(dir, '.agents/skills/cg-sign-off/references/custom-review.md', 'keep repository guidance');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const contractPath = path.join(dir, '.agents/cg/contract.yaml');
  const contract = loadContract(contractPath, { repoRoot: dir, validate: false });
  const purpose = contract.purpose;
  contract.extensions.contractGraph.skills.push(...names.map(name => ({ name, path: `.agents/skills/${name}/SKILL.md` })));
  fs.writeFileSync(contractPath, stringifyContractYaml(contract));
  write(dir, 'docs/plans/old/roadmap.md', 'user plan and evidence');
  const workflow = fs.readFileSync(path.join(dir, '.agents/cg/workflow.md'), 'utf8');
  const preview = init(dir, { dryRun: true });
  assert.equal(preview.removed.length, originals.size);
  for (const [relative, text] of originals) assert.equal(fs.readFileSync(path.join(dir, relative), 'utf8'), text);
  const applied = init(dir); sync(dir);
  assert.equal(applied.removed.length, originals.size);
  for (const [relative, text] of originals) {
    assert.equal(fs.existsSync(path.join(dir, relative)), false);
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    assert.equal(fs.readFileSync(path.join(dir, '.agents/cg/backups/retired-0.7.0', hash, relative), 'utf8'), text);
  }
  for (const name of names) assert.equal(fs.readFileSync(path.join(dir, `.agents/skills/${name}/personal-notes.md`), 'utf8'), 'keep user notes');
  assert.equal(fs.readFileSync(path.join(dir, 'docs/plans/old/roadmap.md'), 'utf8'), 'user plan and evidence');
  assert.equal(fs.readFileSync(path.join(dir, '.agents/skills/cg-sign-off/references/custom-review.md'), 'utf8'), 'keep repository guidance');
  assert.equal(fs.readFileSync(path.join(dir, '.agents/cg/workflow.md'), 'utf8'), workflow);
  const updated = loadContract(contractPath, { repoRoot: dir, validate: false });
  assert.equal(updated.purpose, purpose);
  assert.ok(updated.extensions.contractGraph.skills.every(item => !names.includes(item.name)));
  assert.ok(Object.keys(JSON.parse(fs.readFileSync(manifestPath, 'utf8')).files).every(file => !originals.has(file)));
  assert.equal(fs.readFileSync(path.join(dir, '.agents/cg/templates/contract.template.yaml'), 'utf8'),
    fs.readFileSync(path.join(root, 'src/cg/templates/contract.template.yaml'), 'utf8'));
  assert.equal(fs.readFileSync(path.join(dir, '.agents/skills/cg-warmup/assets/custom-contract.yaml'), 'utf8'), '# keep custom template');
  assert.deepEqual(verify(dir).failures, []);
  assert.deepEqual(init(dir).removed, []);
});

test('retired skills cannot be admitted through CLI permissions or host hook', t => {
  const dir = fixture(t);
  for (const skill of ['cg-prepare', 'cg-auto-run']) {
    assert.equal(permits(next(dir), skill).allowed, false);
    const hook = spawnSync(process.execPath, [path.join(root, 'src/install/hooks/cg-gate.mjs')], {
      input: JSON.stringify({ cwd: dir, session_id: 'retirement', tool_input: { skill } }), encoding: 'utf8',
    });
    assert.equal(hook.status, 0);
    const decision = JSON.parse(hook.stdout).hookSpecificOutput;
    assert.equal(decision.permissionDecision, 'deny');
    assert.match(decision.permissionDecisionReason, /retired in 0.7.0/);
  }
});

test('batch readiness skips input-blocked in-progress work and its dependents, then resumes after an answer', t => {
  const dir = fixture(t);
  const file = 'docs/plans/sprint/s1_detailed_preparation.md';
  const step = (n, state, depends = 'None', blocked = 'None') => `## Step ${n}: Item ${n}\nPriority: ${n}\nDepends on: ${depends}\nBlocked by: ${blocked}\nStatus: ${state}\n`;
  write(dir, file, step(1, 'In progress', 'None', 'DU-01 owner answer') + step(2, 'Ready', 'Step 1') + step(3, 'Ready'));
  assert.equal(next(dir).step.number, 3);
  write(dir, file, step(1, 'Blocked', 'None', 'DU-01 owner answer') + step(2, 'Ready', 'Step 1') + step(3, 'Complete'));
  assert.equal(next(dir).stage, 'cg-unblock');
  assert.equal(permits(next(dir), 'cg-sign-off').allowed, false);
  write(dir, file, step(1, 'Ready') + step(2, 'Ready', 'Step 1') + step(3, 'Complete'));
  assert.equal(next(dir).step.number, 1);
  write(dir, file, step(1, 'Complete') + step(2, 'Ready', 'Step 1') + step(3, 'Complete'));
  assert.equal(next(dir).step.number, 2);
});

test('init upgrades with a preview, preserves open work and requires confirmation before applying', t => {
  const dir = fixture(t);
  const oldSkill = '.agents/skills/cg-prepare/SKILL.md';
  write(dir, oldSkill, '---\nname: cg-prepare\ndescription: Legacy preparation\n---\n');
  const manifestFile = path.join(dir, '.agents/cg/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.runtime.version = '0.6.0';
  manifest.runtime.buildId = 'old';
  write(dir, '.agents/cg/manifest.json', JSON.stringify(manifest));
  const openPlan = 'docs/plans/open/s1_detailed_preparation.md';
  write(dir, openPlan, '## Step 1: pending work\nStatus: Ready\n');
  const preserved = new Map(['.agents/cg/workflow.md', '.agents/cg/phases.json', openPlan]
    .map(file => [file, fs.readFileSync(path.join(dir, file), 'utf8')]));
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'bin/cg.js'), 'init', dir, ...args], { encoding: 'utf8' });
  const before = fs.readFileSync(manifestFile, 'utf8');
  const preview = run('--check');
  assert.equal(preview.status, 1);
  assert.match(preview.stdout, /previewing installed release 0\.7\.0/);
  assert.match(preview.stdout, /completing every plan first is not required/);
  assert.ok(fs.existsSync(path.join(dir, oldSkill)));
  assert.equal(fs.readFileSync(manifestFile, 'utf8'), before);
  const unconfirmed = run();
  assert.equal(unconfirmed.status, 1);
  assert.match(unconfirmed.stderr, /without confirmation/);
  assert.equal(fs.readFileSync(manifestFile, 'utf8'), before);
  const applied = run('--yes');
  assert.equal(applied.status, 0, applied.stdout + applied.stderr);
  assert.equal(fs.existsSync(path.join(dir, oldSkill)), false);
  assert.ok(fs.existsSync(path.join(dir, '.agents/skills/api-expert/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.agents/skills/THIRD_PARTY_NOTICES.txt')));
  for (const [file, content] of preserved) assert.equal(fs.readFileSync(path.join(dir, file), 'utf8'), content);
  assert.equal(run('--check').status, 0, 'an unchanged upgrade is idempotent');
});

test('upgrade is not a separate CLI entry point and cannot write files', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-upgrade-empty-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [path.join(root, 'bin/cg.js'), 'upgrade', dir, '--yes'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown command/);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('re-init preserves unowned old contract templates', t => {
  const dir = fixture(t);
  const file = '.agents/skills/cg-warmup/assets/contract.template.yaml';
  write(dir, file, '# repository-owned template');
  init(dir); sync(dir);
  assert.equal(fs.readFileSync(path.join(dir, file), 'utf8'), '# repository-owned template');
});

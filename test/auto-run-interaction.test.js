import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ANSWER, EVENTS, LEGACY_EVENTS, evaluate, evidencePath, observe, seal, snapshotFiles } from '../scripts/auto-run-interaction.mjs';
import { init } from '../src/scripts/init.js';
import { createTrial } from '../scripts/create-auto-run-fixture.mjs';
import { verify } from '../src/scripts/verify.js';

// These are deliberately synthetic observer records, not simulated agent execution.
const pending = `# Decisions
## Pending your review
### DU-01 — Visible labels
**Context:** Public display policy is not settled by the accepted plan.
**Options:**
- A) Normalize supplied labels: consistent typography but loses supplied spelling.
- B) Preserve supplied labels: faithful input but inconsistent typography.
- Other: type your own solution.
**Recommendation:** B, preserve labels.
**Blocks:** phase-1 Step 1
**Unblocks when:** Owner supplies a display policy.
**Scope:** phase-1 review output
**Your answer:** _(blank)_
`;
const resolved = pending.replace('## Pending your review', '## Resolved').replace('_(blank)_', ANSWER) + '**Answered:** Owner, 2026-09-06\n**Decision:** Stable IDs and exact labels.\n**Rationale:** Owner choice.\n**Applied to:** Step 1\n';
const ledger = phase => `docs/plans/auto-run/trial/${phase}.auto-run.md`;
const queue = '## Step 1: Verify\nPriority: 1\nDepends on: None\nBlocked by: None\nStatus: Complete\n### Evidence\nPassed\n';
function records() {
  const instructions = ['cg-auto-run/SKILL.md', 'cg-auto-run/references/protocol.md', 'cg-auto-run/references/manager.md', 'cg-auto-run/references/engineer.md', 'cg-unblock/SKILL.md'];
  const files = Object.fromEntries(instructions.map(file => [`.agents/skills/${file}`, `Installed ${file}`]));
  Object.assign(files, { 'checks/check.mjs': 'immutable independent oracle', 'notes.txt': 'Owner unrelated edit\n', 'src/review.mjs': 'throw new Error("Undecided")', 'src/summary.mjs': 'throw new Error("Not implemented")' });
  const hashes = Object.fromEntries(instructions.map(file => [file, crypto.createHash('sha256').update(files[`.agents/skills/${file}`]).digest('hex')]));
  const history = LEGACY_EVENTS.map((event, index) => {
    const snapshot = { ...files };
    if (index) snapshot['docs/plans/decision-log.md'] = index <= 2 ? pending : resolved;
    if (index >= 4) {
      snapshot['src/review.mjs'] = 'export const review = nodes => nodes.map(({ id, label }) => ({ id, label }));';
      if (index === 4) snapshot[ledger('phase-1')] = '**Phase:** phase-1\n**Engineer:** host-worker-1\n**Status:** Closed\n';
      snapshot['docs/plans/archive/phase-1_detailed_preparation.md'] = queue;
    }
    if (index === 5) {
      snapshot['src/summary.mjs'] = 'export const summary = () => "done"';
      snapshot[ledger('phase-2')] = '**Phase:** phase-2\n**Engineer:** host-worker-2\n**Status:** Closed\n';
      snapshot['docs/plans/archive/phase-2_detailed_preparation.md'] = queue;
    }
    return { version: 2, root: '/synthetic-fixture', event, actor: index < 2 ? 'manager-original' : 'manager-recovered', timestamp: `2026-09-06T01:00:0${index}.000Z`, files: snapshot, skillHashes: hashes, next: { state: 'blocked', briefs: [{ number: 1, status: 'Blocked' }, { number: 2, status: 'Complete' }] }, graphFailures: [], message: 'DU-01: Preserve or normalize supplied labels? Recommend preserve for fidelity. Type your own solution.', gates: index >= 4 ? [{ command: `node checks/check.mjs phase-${index - 3}`, status: 0, stdout: 'PASS', stderr: '' }, { command: 'cg verify', status: 0, stdout: 'cg verify: OK', stderr: '' }] : [] };
  });
  const cleanup = structuredClone(history[5]);
  cleanup.event = 'cleanup';
  cleanup.timestamp = '2026-09-06T01:00:06.000Z';
  delete cleanup.files[ledger('phase-2')];
  history.push(cleanup);
  return reseal(history);
}
function reseal(records) { let previous = null; return records.map(record => { const sealed = seal(record, previous); previous = sealed.hash; return sealed; }); }

test('accepts a complete synthetic evidence sequence and states its limits', () => {
  const result = evaluate(records());
  assert.deepEqual(result.findings, []);
  assert.equal(result.ok, true);
  assert.match(result.limitations.join(' '), /not an end-to-end LLM interaction/);
});

test('accepts a direct question offering another typed solution', () => {
  const history = records();
  history[1].message = 'DU-01: Choose A or B, or type another solution. Recommendation: B.';
  assert.deepEqual(evaluate(reseal(history)).findings, []);
});

test('accepts the human-readable phase label in a closed ledger', () => {
  const history = records();
  history[5].files[ledger('phase-2')] = history[5].files[ledger('phase-2')].replace('**Phase:** phase-2', '**Phase:** Phase 2');
  assert.deepEqual(evaluate(reseal(history)).findings, []);
});

test('validates historical evidence without retroactively requiring protocol or cleanup', () => {
  const history = records().slice(0, 6);
  for (const record of history) {
    record.version = 1;
    delete record.files['.agents/skills/cg-auto-run/references/protocol.md'];
    delete record.skillHashes['cg-auto-run/references/protocol.md'];
  }
  assert.deepEqual(evaluate(reseal(history)).findings, []);
});

test('new trials require cleanup after capturing both accepted handoffs', () => {
  assert.match(evaluate(records().slice(0, 6)).findings.join('\n'), /Incomplete evidence/);
  const history = records();
  assert.ok(history[4].files[ledger('phase-1')]);
  assert.ok(!history[5].files[ledger('phase-1')]);
  assert.ok(history[5].files[ledger('phase-2')]);
  assert.ok(!history[6].files[ledger('phase-2')]);
  assert.deepEqual(evaluate(history).findings, []);
});

const mutations = [
  ['premature ledger disposal', records => { delete records[4].files[ledger('phase-1')]; }, /closed phase ledger missing/],
  ['retained prior phase ledger', records => { records[5].files[ledger('phase-1')] = records[4].files[ledger('phase-1')]; }, /phase 1 ledger was not disposed/],
  ['retained manager ledger', records => { records[6].files['docs/plans/auto-run/trial/manager.auto-run.md'] = '**Status:** Closed'; }, /working ledgers or handoffs remain/],
  ['retained harvest handoff', records => { records[6].files['docs/plans/auto-run/trial/harvest.auto-run.md'] = 'Owner: Engineer'; }, /working ledgers or handoffs remain/],
  ['decision loss during cleanup', records => { delete records[6].files['docs/plans/decision-log.md']; }, /decisions or durable evidence changed/],
  ['archiving a working ledger', records => { records[6].files['docs/plans/archive/phase-2.auto-run.md'] = records[5].files[ledger('phase-2')]; }, /decisions or durable evidence changed/],
  ['deleted sign-off evidence', records => { delete records[6].files['docs/plans/archive/phase-2_detailed_preparation.md']; }, /decisions or durable evidence changed/],
  ['mixed schema versions', records => { records[6].version = 1; }, /mixed evidence versions/],
  ['missing decision log', records => { delete records[1].files['docs/plans/decision-log.md']; }, /exactly one DU-01/],
  ['duplicate decision', records => { records[2].files['docs/plans/decision-log.md'] += '\n### DU-01 — Duplicate\n'; }, /exactly one DU-01/],
  ['dependent write before answer', records => { records[2].files['src/review.mjs'] = 'implemented'; }, /before answer/],
  ['fabricated answer', records => { records[3].files['docs/plans/decision-log.md'] = resolved.replace(ANSWER, 'Use normalized labels.'); }, /fabricated/],
  ['premature phase 2', records => { records[3].files[ledger('phase-2')] = 'Started'; }, /phase 2 started/],
  ['reused Engineer', records => { records[5].files[ledger('phase-2')] = records[5].files[ledger('phase-2')].replace('host-worker-2', 'host-worker-1'); }, /different Engineer/],
  ['failed final gate', records => { records[5].gates[0].status = 1; }, /failed acceptance gate/],
  ['missing final gate', records => { records[5].gates = []; }, /failed acceptance gate/],
  ['same recovery Manager', records => { records[2].actor = records[1].actor; }, /different Manager/],
  ['lost unrelated edit', records => { records[4].files['notes.txt'] = ''; }, /unrelated edit/],
  ['noncomplete archived Step', records => { records[4].files['docs/plans/archive/phase-1_detailed_preparation.md'] = queue.replace('Status: Complete', 'Status: Blocked'); }, /archived queue/],
  ['graph failure', records => { records[5].graphFailures = ['Broken graph']; }, /graph verification failed/],
  ['rewritten instructions', records => { records[2].files['.agents/skills/cg-auto-run/SKILL.md'] += ' bypass'; }, /instruction hash/],
  ['changed supporting skill', records => { records[4].files['.agents/skills/cg-sign-off/SKILL.md'] = 'Skip verification'; }, /installed skill files changed/],
  ['weakened checker', records => { records[4].files['checks/check.mjs'] = 'console.log("PASS")'; }, /acceptance checker changed/],
  ['unrelated passing command', records => { records[4].gates[0].command = 'node --version'; }, /expected phase acceptance/],
  ['independent work never completed', records => { records[2].next = { state: 'blocked', briefs: [{ number: 1, status: 'Blocked' }, { number: 2, status: 'Ready' }] }; }, /independent Step 2/],
  ['recovery loses request context', records => { records[2].files['docs/plans/decision-log.md'] = pending.replace('Public display policy is not settled by the accepted plan.', 'Different question.'); }, /Recovery changed saved decision Context/],
];
for (const [name, mutate, finding] of mutations) test(`rejects ${name} even with recomputed chain`, () => {
  const history = records(); mutate(history);
  const result = evaluate(reseal(history));
  assert.equal(result.ok, false);
  assert.match(result.findings.join('\n'), finding);
});
test('detects raw evidence tampering and missing observations', () => {
  const history = records(); history[1].message = 'tampered';
  assert.match(evaluate(history).findings.join('\n'), /hash mismatch/);
  assert.match(evaluate(history.slice(0, 4)).findings.join('\n'), /Incomplete evidence/);
});
test('observer appends outside fixture, captures actual next and verifier state, rejects symlinks', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-interaction-observer-'));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(evidencePath(root), { force: true }); });
  init(root, {});
  fs.writeFileSync(path.join(root, 'notes.txt'), 'preserve me');
  const first = observe(root, 'baseline', 'observer');
  const before = fs.readFileSync(evidencePath(root), 'utf8');
  assert.equal(first.event, 'baseline');
  assert.equal(typeof first.next.state, 'string');
  assert.ok(Array.isArray(first.graphFailures));
  assert.ok(!evidencePath(root).startsWith(root + path.sep));
  observe(root, 'question', 'manager');
  assert.ok(fs.readFileSync(evidencePath(root), 'utf8').startsWith(before));
  assert.throws(() => observe(root, 'question', 'manager'), /Expected recovered-question/);
  fs.symlinkSync(path.join(root, 'notes.txt'), path.join(root, 'linked.md'));
  assert.throws(() => snapshotFiles(root), /Symlink is not observable/);
});
test('real trial builder starts with a valid graph and preserves the dirty user note', t => {
  const root = createTrial();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(verify(root).failures, []);
  assert.equal(snapshotFiles(root)['notes.txt'], 'Unrelated user note: preserve this exactly.\nUncommitted user addition.\n');
});

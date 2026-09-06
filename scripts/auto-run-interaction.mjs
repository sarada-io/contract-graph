#!/usr/bin/env node
/** Observer for real host-driven skill trials; never launches or simulates agents.
 * JSONL is outside the fixture and hash-chained to detect accidental edits. It is not
 * authenticated: a party controlling both evidence and observer can forge a history.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { next, parseQueueDocument } from '../src/scripts/next.js';
import { verify as verifyGraph } from '../src/scripts/verify.js';

export const ANSWER = 'Use the stable node IDs in input order, and preserve each supplied label verbatim.';
export const EVENTS = ['baseline', 'question', 'recovered-question', 'answer-recorded', 'phase-1-complete', 'phase-2-complete'];
const instructions = ['cg-auto-run/SKILL.md', 'cg-auto-run/references/manager.md', 'cg-auto-run/references/engineer.md', 'cg-unblock/SKILL.md'];
const ledger = phase => `docs/plans/auto-run/trial/${phase}.auto-run.md`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const questionFields = ['Context', 'Options', 'Recommendation', 'Blocks', 'Unblocks when', 'Scope'];
const fieldContent = (text, field) => new RegExp(`\\*\\*${field}:\\*\\*([\\s\\S]*?)(?=\\n\\*\\*[A-Z][^\\n]*?:\\*\\*|$)`).exec(text)?.[1].trim();
export const evidencePath = root => `${path.resolve(root)}.evidence.jsonl`;

export function snapshotFiles(root) {
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error('Fixture root must not be a symlink');
  const files = {};
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (['.git', 'node_modules'].includes(entry.name)) continue;
      const relative = prefix + entry.name;
      const absolute = path.join(dir, entry.name);
      // Reject rather than follow links: next/verify also read the fixture afterwards.
      if (entry.isSymbolicLink()) throw new Error(`Symlink is not observable: ${relative}`);
      if (entry.isDirectory()) walk(absolute, relative + '/');
      else if (entry.isFile() && /\.(md|json|mjs|ya?ml|txt)$/.test(entry.name)) files[relative] = fs.readFileSync(absolute, 'utf8');
    }
  }
  walk(root);
  return files;
}

export function readEvidence(root) {
  const target = evidencePath(root);
  if (!fs.existsSync(target)) return [];
  if (fs.lstatSync(target).isSymbolicLink()) throw new Error('Evidence must not be a symlink');
  return fs.readFileSync(target, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

export function seal(record, previousHash = null) {
  const body = { ...record, previousHash };
  delete body.hash;
  return { ...body, hash: sha(JSON.stringify(body)) };
}

export function observe(root, event, actor, messageFile) {
  root = path.resolve(root);
  if (!EVENTS.includes(event) || !actor?.trim()) throw new Error('Expected a known event and actual host actor ID');
  const history = readEvidence(root);
  for (let i = 0; i < history.length; i++) {
    const { hash, ...body } = history[i];
    if (hash !== sha(JSON.stringify(body)) || body.previousHash !== (history[i - 1]?.hash ?? null)) throw new Error('Existing evidence chain is corrupt; do not append');
  }
  if (EVENTS[history.length] !== event) throw new Error(`Expected ${EVENTS[history.length] ?? 'no further event'}, received ${event}`);
  const files = snapshotFiles(root);
  const skillHashes = Object.fromEntries(instructions.map(file => {
    const content = files[`.agents/skills/${file}`];
    if (content === undefined) throw new Error(`Missing installed instructions: ${file}`);
    return [file, sha(content)];
  }));
  let message = messageFile ? fs.readFileSync(messageFile, 'utf8') : '';
  let gates = [];
  if (message.trimStart().startsWith('{')) {
    const envelope = JSON.parse(message);
    message = envelope.text;
    gates = envelope.gates ?? [];
  }
  const record = seal({ version: 1, root, event, actor, timestamp: new Date().toISOString(), files, skillHashes,
    next: next(root), graphFailures: verifyGraph(root).failures, message, gates }, history.at(-1)?.hash ?? null);
  fs.appendFileSync(evidencePath(root), JSON.stringify(record) + '\n', { flag: 'a', mode: 0o600 });
  return record;
}

export function evaluate(history) {
  const findings = [];
  const require = (condition, message) => { if (!condition) findings.push(message); };
  require(history.length === EVENTS.length, 'Incomplete evidence: expected baseline and all five interaction events');
  const baseline = history[0];
  for (let i = 0; i < history.length; i++) {
    const record = history[i];
    const { hash, ...body } = record;
    require(hash === sha(JSON.stringify(body)), `${record.event}: evidence hash mismatch`);
    require(record.previousHash === (history[i - 1]?.hash ?? null), `${record.event}: broken evidence chain`);
    require(record.event === EVENTS[i], `Event ${i}: invalid event order`);
    require(record.root === baseline.root, `${record.event}: fixture changed`);
    require(typeof record.actor === 'string' && record.actor.trim(), `${record.event}: actor missing`);
    require(Number.isFinite(Date.parse(record.timestamp)) && (!i || Date.parse(record.timestamp) >= Date.parse(history[i - 1].timestamp)), `${record.event}: invalid timestamp order`);
    require(JSON.stringify(record.skillHashes) === JSON.stringify(baseline.skillHashes), `${record.event}: installed instructions changed`);
    for (const instruction of instructions) require(record.skillHashes?.[instruction] === sha(record.files?.[`.agents/skills/${instruction}`] ?? ''), `${record.event}: missing or inconsistent instruction hash: ${instruction}`);
    const installed = files => Object.fromEntries(Object.entries(files ?? {}).filter(([file]) => file.startsWith('.agents/skills/')));
    require(JSON.stringify(installed(record.files)) === JSON.stringify(installed(baseline.files)), `${record.event}: installed skill files changed`);
    require(record.files?.['notes.txt'] === baseline.files?.['notes.txt'] && baseline.files?.['notes.txt'] !== undefined, `${record.event}: unrelated edit not preserved`);
    const checks = files => Object.fromEntries(Object.entries(files ?? {}).filter(([file]) => file.startsWith('checks/')));
    require(Object.keys(checks(baseline.files)).length > 0 && JSON.stringify(checks(record.files)) === JSON.stringify(checks(baseline.files)), `${record.event}: acceptance checker changed or missing`);
    require(Array.isArray(record.graphFailures) && record.graphFailures.length === 0, `${record.event}: graph verification failed`);
    require(record.next && record.next.state !== 'unreadable', `${record.event}: queue unreadable`);
    if (i === 0) continue;
    const log = record.files?.['docs/plans/decision-log.md'] ?? '';
    require((log.match(/^#{2,6}\s+DU-\d+\b/gm) ?? []).length === 1 && /^#{2,6}\s+DU-01\b/m.test(log), `${record.event}: expected exactly one DU-01 decision heading`);
    if (i <= 2) {
      require(/## Pending your review[\s\S]*### DU-01/.test(log) && !/\*\*Answered:\*\*/.test(log), `${record.event}: decision must remain pending`);
      for (const field of questionFields) require(Boolean(fieldContent(log, field)), `${record.event}: missing decision ${field}`);
      require(/(?:\*\*)?A\)/.test(fieldContent(log, 'Options') ?? '') && /(?:\*\*)?B\)/.test(fieldContent(log, 'Options') ?? ''), `${record.event}: viable options missing`);
      require(/\*\*Your answer:\*\*\s*(?:_?\(blank\)_?|Pending|Unanswered|\n|$)/i.test(log), `${record.event}: inferred user answer`);
      require(/DU-01/.test(record.message ?? '') && /recommend/i.test(record.message ?? '') && /(?:typed|type (?:your|another)|own|free.text)/i.test(record.message ?? ''), `${record.event}: question message lacks decision, recommendation or typed answer path`);
      require(record.files?.['src/review.mjs'] === baseline.files?.['src/review.mjs'], `${record.event}: dependent implementation changed before answer`);
    } else {
      require(/## Resolved[\s\S]*### DU-01/.test(log), `${record.event}: decision not resolved`);
      require(log.includes(`**Your answer:** ${ANSWER}`) && (log.match(/\*\*Your answer:\*\*/g) ?? []).length === 1, `${record.event}: fabricated or duplicate user answer`);
      for (const field of ['Answered', 'Decision', 'Rationale', 'Applied to']) require(log.includes(`**${field}:**`), `${record.event}: resolution missing ${field}`);
    }
    if (i <= 4) require(!/\breviewSummary\b/.test(record.files?.['src/summary.mjs'] ?? '') && !record.files?.[ledger('phase-2')], `${record.event}: phase 2 started before phase 1 acceptance`);
    if (i === 2) require(record.next?.briefs?.some(step => step.number === 2 && step.status === 'Complete') && record.next?.briefs?.some(step => step.number === 1 && step.status === 'Blocked'), `${record.event}: independent Step 2 must complete while Step 1 remains blocked`);
    if (i >= 4) {
      const phase = `phase-${i - 3}`;
      const phaseLedger = record.files?.[ledger(phase)] ?? '';
      require(/Closed/i.test(phaseLedger) && new RegExp(`\\*\\*Phase:\\*\\*[^\\n]*${phase.replace('-', '[- ]')}\\b`, 'i').test(phaseLedger), `${record.event}: closed phase ledger missing or wrong phase`);
      const queues = Object.entries(record.files ?? {}).filter(([file]) => file.includes('/archive/') && file.includes(phase) && file.endsWith('_detailed_preparation.md'));
      require(queues.some(([file, text]) => { const steps = parseQueueDocument(text, file); return steps.length > 0 && steps.every(step => step.status === 'Complete' && !step.problems.length); }), `${record.event}: completed archived queue missing`);
      require(Array.isArray(record.gates) && record.gates.length > 0 && record.gates.every(gate => typeof gate.command === 'string' && gate.command.trim() && gate.status === 0 && typeof gate.stdout === 'string' && typeof gate.stderr === 'string'), `${record.event}: missing or failed acceptance gate evidence`);
      require(record.gates?.some(gate => gate.command === `node checks/check.mjs ${phase}`) && record.gates?.some(gate => /(?:^|\s|\/)cg(?:\.js)?\s+verify\b/.test(gate.command)), `${record.event}: expected phase acceptance and cg verify commands`);
    }
  }
  if (history[2]) require(history[1].actor !== history[2].actor, 'Recovery must use a different Manager');
  if (history[2]) for (const field of questionFields) require(fieldContent(history[1].files?.['docs/plans/decision-log.md'] ?? '', field) === fieldContent(history[2].files?.['docs/plans/decision-log.md'] ?? '', field), `Recovery changed saved decision ${field}`);
  if (history[3]) require(history[2].actor === history[3].actor, 'Recovered Manager must record the answer');
  const worker = (record, phase) => /\*\*Engineer:\*\*\s*([^\n]+)/.exec(record?.files?.[ledger(phase)] ?? '')?.[1].trim();
  if (history[4]) require(Boolean(worker(history[4], 'phase-1')), 'Phase 1 Engineer identity missing');
  if (history[5]) require(Boolean(worker(history[5], 'phase-2')) && worker(history[4], 'phase-1') !== worker(history[5], 'phase-2'), 'Phase 2 must use a different Engineer');
  if (history[4]) for (const record of history.slice(1)) if (worker(record, 'phase-1')) require(worker(record, 'phase-1') === worker(history[4], 'phase-1'), `${record.event}: Phase 1 Engineer identity changed`);
  return { ok: findings.length === 0, findings, limitations: ['Snapshots do not prove intervening writes, worker isolation, or host actor authenticity.', 'Gate outputs and messages must be captured by a trusted external observer; hash chains are not signatures.', 'Unit tests validate the observer oracle, not an end-to-end LLM interaction.'] };
}

export function verifyEvidence(root) { return evaluate(readEvidence(root)); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, root, event, actor, messageFile] = process.argv.slice(2);
    if (!root || !['observe', 'verify'].includes(command)) throw new Error('Usage: observe <fixture-root> <event> <actor> [message-file] | verify <fixture-root>');
    const result = command === 'observe' ? observe(root, event, actor, messageFile) : verifyEvidence(root);
    console.log(JSON.stringify(command === 'observe' ? { event: result.event, hash: result.hash, evidence: evidencePath(root) } : result, null, 2));
    if (result.ok === false) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

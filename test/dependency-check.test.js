/**
 * @file Check Dart manifest correspondence with contract ownership and dependency edges.
 * @see ../src/runtime/verification/.agent/contract.md
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { init } from '../src/runtime/installation/init.js';
import { loadContract, stringifyContractYaml } from '../src/runtime/graph/contracts.js';
import { checkDependencies } from '../src/runtime/verification/dependency-check.js';
import { inspectionSnapshotChanges } from '../src/runtime/inspection/contract-inspection.js';

const CLI = fileURLToPath(new URL('../bin/cg.js', import.meta.url));
const ROOT = '.agents/cg/contract.yaml';
const ownerFile = unit => `${unit}/.agents/cg/contract.yaml`;
const write = (root, file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const pubspec = (root, unit, value) => write(root, unit === '.' ? 'pubspec.yaml' : `${unit}/pubspec.yaml`, value);
function edit(root, file, change) {
  const c = loadContract(path.join(root, file), { repoRoot: root }); change(c); write(root, file, stringifyContractYaml(c));
}
function owner(root, unit, parent = ROOT) {
  const c = loadContract(path.join(root, 'src/.agents/cg/contract.yaml'), { repoRoot: root });
  c.id = unit.replaceAll('/', '-'); c.name = c.id; c.unit = unit; c.kind = parent === ROOT ? 'module' : 'component'; c.responsibilities.owns = [`Fixture capability at ${unit}.`]; c.relations.parent = { contract: parent, uses: 'Fixture ownership' };
  write(root, ownerFile(unit), stringifyContractYaml(c));
  edit(root, parent, value => { value.relations.composition = 'composed'; value.relations.children.push({ contract: ownerFile(unit), uses: 'Fixture delegation' }); });
}
function fixture(t, workspace = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-dependencies-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  init(root, { profiles: ['agents'] });
  owner(root, 'packages/client'); owner(root, 'packages/catalog');
  if (workspace) pubspec(root, '.', { name: 'workspace_root', workspace: ['packages/client', 'packages/catalog'] });
  pubspec(root, 'packages/client', { name: 'client', ...(workspace ? { resolution: 'workspace' } : {}), dependencies: { shared: workspace ? '^1.0.0' : { path: '../catalog' } } });
  pubspec(root, 'packages/catalog', { name: 'shared', ...(workspace ? { resolution: 'workspace' } : {}), version: '1.0.0' });
  return root;
}
const check = (root, options = {}) => checkDependencies(root, { ecosystem: 'dart', ...options });
function declare(root, from = 'packages/client', to = 'packages/catalog') {
  edit(root, ownerFile(from), c => c.relations.dependencies.push({ contract: ownerFile(to), uses: 'Uses fixture API' }));
}
function tree(root) {
  const files = {};
  const walk = dir => { for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.posix.join(dir, item.name);
    if (item.isDirectory()) walk(relative); else files[relative] = fs.readFileSync(path.join(root, relative), 'utf8');
  } }; walk('.'); return files;
}

test('workspace declarations detect missing and reversed edges without mutating any input', t => {
  const root = fixture(t), before = tree(root);
  let r = check(root); assert.equal(r.state, 'mismatch');
  assert.equal(r.findings[0].code, 'undeclared-local-dependency'); assert.deepEqual(tree(root), before);
  declare(root, 'packages/catalog', 'packages/client');
  r = check(root); assert.equal(r.findings[0].code, 'reversed-local-dependency'); assert.equal(r.graphOnly.length, 1);
  edit(root, ownerFile('packages/catalog'), c => c.relations.dependencies = []);
  declare(root); r = check(root);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics)); assert.equal(r.state, 'aligned');
  assert.equal(r.edges[0].reason, 'workspace-member'); assert.equal(r.edges[0].comparison, 'declared');
  assert.deepEqual(inspectionSnapshotChanges(root, r.snapshot), []);
  write(root, 'packages/catalog/lib/new.dart', 'int value = 1;');
  assert.ok(inspectionSnapshotChanges(root, r.snapshot).includes('packages/catalog'));
});

test('legacy relative paths and development dependencies require the same direct owner direction', t => {
  const root = fixture(t, false);
  pubspec(root, 'packages/client', { name: 'client', dev_dependencies: { shared: { path: '../catalog' } }, dependencies: { remote: '^1.0.0', sdk_library: { sdk: 'flutter' }, remote_git: { git: 'https://example.invalid/repo' } } });
  let r = check(root); assert.equal(r.findings.length, 1); assert.equal(r.findings[0].section, 'dev_dependencies');
  declare(root); r = check(root); assert.equal(r.ok, true);
  assert.equal(r.edges.filter(e => e.state === 'external').length, 3); assert.equal(r.edges.find(e => e.state === 'local').reason, 'relative-path');
  pubspec(root, 'packages/client', { name: 'client', dependencies: { shared: '^1.0.0' } });
  r = check(root); assert.equal(r.edges[0].state, 'external', 'same name outside a workspace is not local resolution'); assert.equal(r.graphOnly.length, 1);
});

test('same-owner grouping permits internal edges and extra graph edges remain visible', t => {
  const root = fixture(t, false);
  for (const unit of ['packages/client', 'packages/catalog']) fs.rmSync(path.join(root, ownerFile(unit)));
  edit(root, ROOT, c => c.relations.children = c.relations.children.filter(ref => !ref.contract.startsWith('packages/')));
  owner(root, 'packages');
  let r = check(root); assert.equal(r.ok, true); assert.equal(r.edges[0].comparison, 'internal');
  assert.ok(r.mappings.every(m => m.owner === ownerFile('packages') && m.mapping === 'enclosing'));
  owner(root, 'packages/client/lib', ownerFile('packages'));
  r = check(root); assert.equal(r.ok, true); assert.equal(r.mappings[0].owner, ownerFile('packages'), 'nested implementation contract does not own the parent manifest');
});

test('composition and transitive graph reachability do not substitute for a direct dependency', t => {
  const root = fixture(t);
  owner(root, 'packages/middle');
  declare(root, 'packages/client', 'packages/middle'); declare(root, 'packages/middle', 'packages/catalog');
  assert.equal(check(root).findings[0].code, 'undeclared-local-dependency');
});

test('literal nested workspaces include their root package in local resolution', t => {
  const root = fixture(t);
  pubspec(root, '.', { name: 'workspace_root', workspace: ['packages/client'] });
  pubspec(root, 'packages/client', { name: 'client', resolution: 'workspace', workspace: ['nested'], dependencies: { nested: { hosted: 'https://example.invalid' }, workspace_root: 'any' } });
  pubspec(root, 'packages/client/nested', { name: 'nested', resolution: 'workspace' });
  pubspec(root, 'packages/catalog', { name: 'shared' });
  edit(root, ownerFile('packages/client'), c => c.relations.dependencies.push({ contract: ROOT, uses: 'Fixture root API' }));
  const r = check(root); assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(r.edges.filter(e => e.state === 'local').length, 2);
  assert.ok(r.mappings.filter(m => m.package !== 'shared').every(m => m.workspace === '.'));
});

test('overrides, override files and globs produce explicit incomplete coverage', t => {
  for (const mode of ['override', 'file', 'glob']) {
    const root = fixture(t); declare(root);
    if (mode === 'override') pubspec(root, '.', { name: 'workspace_root', workspace: ['packages/client', 'packages/catalog'], dependency_overrides: { shared: { path: '/outside' } } });
    else if (mode === 'file') write(root, 'pubspec_overrides.yaml', 'resolution:\n');
    else pubspec(root, '.', { name: 'workspace_root', workspace: ['packages/*'] });
    const r = check(root); assert.equal(r.ok, false); assert.notEqual(r.coverage.state, 'complete-for-supported-manifest-declarations');
    assert.ok(r.diagnostics.some(d => /override|unsupported-workspace/.test(d.code)));
    if (mode !== 'glob') assert.ok(r.edges.every(e => e.state === 'unresolved'));
  }
});

test('malformed manifest YAML, duplicate names and invalid member declarations cannot pass', t => {
  for (const mode of ['yaml', 'duplicate', 'member', 'resolution', 'descriptor', 'stray']) {
    const root = fixture(t); declare(root);
    if (mode === 'yaml') write(root, 'packages/catalog/pubspec.yaml', 'name: shared\nname: duplicate\n');
    if (mode === 'duplicate') pubspec(root, 'packages/catalog', { name: 'client', resolution: 'workspace' });
    if (mode === 'member') pubspec(root, '.', { name: 'workspace_root', workspace: ['packages/missing'] });
    if (mode === 'resolution') pubspec(root, 'packages/catalog', { name: 'shared' });
    if (mode === 'descriptor') pubspec(root, 'packages/catalog', { name: 'shared', resolution: 'workspace', dependencies: { x: { git: 'x', path: '../x' } } });
    if (mode === 'stray') pubspec(root, 'packages', { name: 'stray' });
    const r = check(root); assert.equal(r.state, 'invalid', mode); assert.ok(r.diagnostics.some(d => d.severity === 'error'));
  }
});

test('path targets need matching names and existing confined manifests', t => {
  for (const target of ['../missing', '../../../outside', '/absolute', '../catalog']) {
    const root = fixture(t, false); declare(root);
    pubspec(root, 'packages/client', { name: 'client', dependencies: { wrong_name: { path: target } } });
    const r = check(root); assert.equal(r.ok, false); assert.ok(r.diagnostics.some(d => /path|repository|name-mismatch/.test(d.code)));
  }
});

test('input changes, unsafe links and scan limits cannot yield a complete result', t => {
  const root = fixture(t); declare(root);
  const initial = check(root); assert.equal(initial.ok, true);
  pubspec(root, 'packages/client', { name: 'client', resolution: 'workspace', dependencies: {} });
  assert.ok(inspectionSnapshotChanges(root, initial.snapshot).includes('packages/client/pubspec.yaml'));
  const limited = check(root, { limits: { entries: 1, depth: 1, fileBytes: 10000, totalBytes: 100000 } });
  assert.equal(limited.ok, false); assert.ok(limited.diagnostics.some(d => d.code === 'scan-limit'));
  const huge = check(root, { limits: { entries: 10000, depth: 64, fileBytes: 10, totalBytes: 100 } });
  assert.equal(huge.ok, false);
});

test('symlinked targets are never read', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t, false); declare(root);
  fs.symlinkSync(path.join(root, 'packages/catalog'), path.join(root, 'packages/link'));
  pubspec(root, 'packages/client', { name: 'client', dependencies: { shared: { path: '../link' } } });
  const r = check(root); assert.equal(r.ok, false); assert.ok(r.diagnostics.some(d => d.code === 'unsafe-path-target'));
  assert.ok(!r.snapshot.inputs.some(i => i.path === 'packages/link/pubspec.yaml' && i.kind === 'file'));
});

test('invalid graph and absence of Dart manifests are explicit and command execution is unnecessary', t => {
  const root = fixture(t); declare(root);
  edit(root, ROOT, c => c.relations.children.push({ contract: 'absent/.agents/cg/contract.yaml', uses: 'Missing fixture' }));
  assert.equal(check(root).state, 'invalid');
  fs.rmSync(path.join(root, 'pubspec.yaml')); fs.rmSync(path.join(root, 'packages'), { recursive: true });
  const none = check(root); assert.ok(none.diagnostics.some(d => d.code === 'no-dart-manifests'));
});

test('CLI exposes diagnostic evidence and honest nonzero results without widening ordinary verify', t => {
  const root = fixture(t), call = args => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const args = ['contract', 'dependencies', root, '--ecosystem', 'dart'];
  let r = call([...args, '--json']); assert.equal(r.status, 1, r.stderr); assert.equal(JSON.parse(r.stdout).state, 'mismatch');
  assert.equal(call(['contract', 'verify', root]).status, 0);
  declare(root); r = call([...args, '--json']); assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).format, 'dependency-check-v1');
  assert.match(call(args).stdout, /aligned/); assert.match(call(args).stdout, /No SDK/);
  for (const invalid of [ ['contract', 'dependencies', root], [...args, '--write'], [...args, 'extra'], ['contract', 'dependencies', root, '--ecosystem', 'javascript'], ['status', root, '--ecosystem', 'dart'] ]) assert.notEqual(call(invalid).status, 0, invalid.join(' '));
});

test('saved mapping becomes stale when a contract appears inside an existing metadata directory', t => {
  const root = fixture(t, false); declare(root);
  fs.mkdirSync(path.join(root, 'packages/catalog/lib/.agents/cg'), { recursive: true });
  const initial = check(root); assert.equal(initial.ok, true);
  owner(root, 'packages/catalog/lib', ownerFile('packages/catalog'));
  assert.ok(inspectionSnapshotChanges(root, initial.snapshot).includes('packages/catalog/lib/.agents/cg/contract.yaml'));
});

test('unsupported YAML and descriptors remain explicit, and arbitrary package source is never executed', t => {
  const root = fixture(t); declare(root);
  write(root, 'packages/client/lib/malicious.dart', 'throw "must never execute";');
  assert.equal(check(root).ok, true);
  pubspec(root, 'packages/client', { name: 'client', resolution: 'workspace', dependencies: { remote: { git: { ref: 'main' } } } });
  assert.equal(check(root).state, 'invalid');
  write(root, 'packages/client/pubspec.yaml', 'name: client\nresolution: workspace\ndependencies: &deps\n  shared: any\ndev_dependencies: *deps\n');
  const r = check(root); assert.equal(r.state, 'incomplete'); assert.ok(r.diagnostics.some(d => d.code === 'unsupported-manifest-yaml'));
});

test('a composition link between two package owners still needs its explicit dependency declaration', t => {
  const root = fixture(t);
  pubspec(root, '.', { name: 'workspace_root', workspace: ['packages/client'] });
  pubspec(root, 'packages/catalog', { name: 'shared' });
  pubspec(root, 'packages/client', { name: 'client', resolution: 'workspace', workspace: ['nested'], dependencies: { nested: 'any' } });
  pubspec(root, 'packages/client/nested', { name: 'nested', resolution: 'workspace' });
  owner(root, 'packages/client/nested', ownerFile('packages/client'));
  assert.equal(check(root).findings[0].code, 'undeclared-local-dependency');
  declare(root, 'packages/client', 'packages/client/nested');
  assert.equal(check(root).ok, true);
});

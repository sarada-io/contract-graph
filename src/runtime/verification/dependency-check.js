/**
 * @file Compare supported manifest dependency facts with authored contract ownership and dependency edges.
 * @see .agent/contract.md
 */
import path from 'node:path';
import { BINDING_FILENAME, loadBindingCatalog } from './binding.js';
import { discoverContractFiles, loadContractGraph } from '../graph/contracts.js';
import { inspectionSnapshotChanges } from '../inspection/contract-inspection.js';
import { inspectDartManifests } from '../inspection/dart-manifests.js';

export function checkDependencies(repoRoot, { ecosystem, limits } = {}) {
  if (ecosystem !== 'dart') throw new Error('contract dependencies requires --ecosystem dart; no other ecosystem is supported');
  const root = path.resolve(repoRoot), inspection = inspectDartManifests(root, { limits });
  const { evidence, packages, edges } = inspection;
  const findings = [], diagnostics = evidence.diagnostics;
  let graph;
  try {
    if (diagnostics.some(item => item.code === 'scan-limit')) throw new Error('Manifest inventory limit reached; graph comparison was not attempted.');
    // Absence matters too: a new owner in an existing .agents directory invalidates mapping.
    for (const input of [...evidence.inputs.values()].filter(item => item.kind === 'directory')) evidence.presence(input.path === '.' ? '.agents/cg/contract.yaml' : `${input.path}/.agents/cg/contract.yaml`);
    evidence.read(BINDING_FILENAME);
    for (const file of discoverContractFiles(root).contracts) evidence.read(path.relative(root, file).split(path.sep).join('/'));
    const binding = loadBindingCatalog(path.join(root, BINDING_FILENAME), { repoRoot: root });
    graph = loadContractGraph(root, { hierarchy: binding.hierarchy.transitions });
    for (const message of graph.failures) diagnostics.push({ code: 'invalid-graph', path: null, severity: 'error', message });
  } catch (error) { diagnostics.push({ code: 'graph-unavailable', path: null, severity: 'unsupported', message: error.message.replaceAll(root, '.') }); }
  if (diagnostics.some(item => item.code === 'invalid-graph')) graph = null;
  const mappings = packages.map(pkg => {
    const owners = graph?.records.filter(record => record.contract.unit === '.' || record.contract.unit === pkg.directory || pkg.directory.startsWith(`${record.contract.unit}/`)).sort((a, b) => b.contract.unit.length - a.contract.unit.length) ?? [];
    const owner = owners[0];
    if (graph && !owner) diagnostics.push({ code: 'unmapped-package', path: pkg.manifest, severity: 'unsupported', message: 'Package has no enclosing contract owner.' });
    return { package: pkg.name, manifest: pkg.manifest, directory: pkg.directory, workspace: pkg.group,
      owner: owner?.relative ?? null, ownerId: owner?.contract.id ?? null,
      mapping: !owner ? 'unmapped' : owner.contract.unit === pkg.directory ? 'exact' : 'enclosing' };
  });
  const byManifest = new Map(mappings.map(item => [item.manifest, item]));
  const observed = new Set();
  for (const edge of edges) {
    edge.fromOwner = byManifest.get(edge.from)?.owner ?? null;
    edge.toOwner = edge.target ? byManifest.get(edge.target)?.owner ?? null : null;
    if (edge.state !== 'local' || !graph || !edge.fromOwner || !edge.toOwner) { edge.comparison = 'not-compared'; continue; }
    if (edge.fromOwner === edge.toOwner) { edge.comparison = 'internal'; continue; }
    observed.add(`${edge.fromOwner}\0${edge.toOwner}`);
    const source = graph.byFile.get(edge.fromOwner), target = graph.byFile.get(edge.toOwner);
    const declared = source.contract.relations.dependencies.some(ref => ref.contract === edge.toOwner);
    edge.comparison = declared ? 'declared' : 'undeclared';
    if (!declared) {
      const reverse = target.contract.relations.dependencies.some(ref => ref.contract === edge.fromOwner);
      const code = reverse ? 'reversed-local-dependency' : 'undeclared-local-dependency';
      findings.push({ code, from: edge.from, target: edge.target, section: edge.section, fromOwner: edge.fromOwner, toOwner: edge.toOwner,
        message: `${edge.package} → ${edge.name}: requires a direct dependency from ${source.contract.id} to ${target.contract.id}.`,
        next: `Inspect ${edge.from} and both owners; correct the manifest or relations.dependencies under the existing architecture authority.` });
    }
  }
  const graphOnly = [];
  if (graph) {
    const mapped = new Set(mappings.map(item => item.owner));
    for (const record of graph.records) if (mapped.has(record.relative)) for (const ref of record.contract.relations.dependencies) {
      if (mapped.has(ref.contract) && !observed.has(`${record.relative}\0${ref.contract}`)) graphOnly.push({ fromOwner: record.relative, toOwner: ref.contract, reason: 'No resolved direct package edge in this inventory; a graph relationship may describe other coupling.' });
    }
  }
  if (!packages.length) diagnostics.push({ code: 'no-dart-manifests', path: '.', severity: 'unsupported', message: 'No Dart pubspec was discovered within the reported inventory scope.' });
  const snapshot = evidence.snapshot();
  for (const file of inspectionSnapshotChanges(root, snapshot)) diagnostics.push({ code: 'unstable-input', path: file, severity: 'unsupported', message: 'Input changed during inspection; rerun before using this report.' });
  const invalid = diagnostics.some(item => item.severity === 'error');
  const incomplete = diagnostics.length > 0 || edges.some(edge => edge.state === 'unresolved');
  const state = invalid ? 'invalid' : incomplete ? 'incomplete' : findings.length ? 'mismatch' : 'aligned';
  return { format: 'dependency-check-v1', ecosystem, state, ok: state === 'aligned',
    coverage: { state: invalid ? 'invalid' : incomplete ? 'partial' : 'complete-for-supported-manifest-declarations',
      packages: packages.length, localEdges: edges.filter(edge => edge.state === 'local').length,
      limits: evidence.limits, excluded: evidence.excluded,
      supported: ['literal and nested Dart workspaces', 'repository-contained relative path dependencies', 'runtime and development dependencies', 'nearest enclosing contract ownership'],
      limitations: ['No SDK or version-constraint solving, lockfile or package_config verification.', 'Workspace globs, effective overrides, absolute/outside/symlinked paths and unsupported descriptors remain unresolved.', 'Graph-only relationships need not correspond to package dependencies.', 'No source imports, exports, transitive dependencies, application behavior or dependency-command execution is verified.'] },
    mappings, edges, graphOnly, findings, diagnostics, snapshot };
}

export function renderDependencies(report) {
  return [`cg contract dependencies (${report.ecosystem}): ${report.state}`, `Coverage: ${report.coverage.state}; ${report.coverage.packages} package(s), ${report.coverage.localEdges} local edge(s).`,
    ...report.mappings.map(item => `  ${item.manifest} → ${item.owner ?? 'unmapped'} (${item.mapping})`),
    ...report.findings.map(item => `Finding [${item.code}]: ${item.message}\n  ${item.next}`),
    ...report.diagnostics.map(item => `${item.severity} [${item.code}] ${item.path ?? ''}: ${item.message}`),
    `Edges: ${report.edges.filter(e => e.comparison === 'internal').length} internal, ${report.edges.filter(e => e.comparison === 'declared').length} declared, ${report.edges.filter(e => e.state === 'external').length} external; ${report.graphOnly.length} graph-only relationship(s).`,
    ...report.coverage.limitations.map(item => `Limit: ${item}`), 'Use --json for edge provenance, exclusions and input fingerprints.', ''].join('\n');
}

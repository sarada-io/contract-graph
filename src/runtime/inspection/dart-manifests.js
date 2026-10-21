/**
 * @file Extract confined Dart workspace and local path dependency facts without package-manager execution.
 * @see .agent/contract.md
 */
import path from 'node:path';
import { parseContractYaml } from '../graph/contracts.js';
import { manifestInventory } from './manifests.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const packageName = value => typeof value === 'string' && /^[a-z_][a-z0-9_]*$/.test(value);
const inside = value => value !== '..' && !value.startsWith('../');
const manifestAt = directory => directory === '.' ? 'pubspec.yaml' : `${directory}/pubspec.yaml`;

export function inspectDartManifests(root, options = {}) {
  const evidence = manifestInventory(root, options), packages = [];
  const issue = (pkg, code, message, severity = 'unsupported') => {
    pkg.uncertain = true;
    evidence.diagnostics.push({ code, path: pkg.manifest, message, severity });
  };
  for (const manifest of evidence.manifests) {
    const pkg = { manifest, directory: path.posix.dirname(manifest), name: null, resolution: null, members: [], dependencies: [], uncertain: false };
    packages.push(pkg);
    try {
      const value = parseContractYaml(evidence.read(manifest), { source: manifest });
      if (!object(value) || !packageName(value.name)) throw new Error('pubspec requires a Dart package name');
      pkg.name = value.name;
      pkg.resolution = value.resolution ?? null;
      if (pkg.resolution !== null && pkg.resolution !== 'workspace') issue(pkg, 'unsupported-resolution', 'Only absent or workspace resolution is supported.');
      if (Object.hasOwn(value, 'dependency_overrides')) issue(pkg, 'dependency-overrides', 'Effective dependency overrides are outside this pilot; the resolution group remains unresolved.');
      const overrides = manifest.replace(/pubspec\.yaml$/, 'pubspec_overrides.yaml');
      if (evidence.presence(overrides) !== 'missing') {
        // Fingerprint even unsupported override evidence so later edits invalidate saved reports.
        evidence.read(overrides);
        issue(pkg, 'pubspec-overrides', 'An overrides file may alter resolution, workspace membership or targets; the group remains unresolved.');
      }
      if (Object.hasOwn(value, 'workspace')) {
        if (!Array.isArray(value.workspace)) throw new Error('workspace must be a list');
        for (const member of value.workspace) {
          if (typeof member !== 'string' || !member || path.win32.isAbsolute(member) || /[\\*?\[\]{}\x00-\x1f]/.test(member) || member.split('/').some(p => !p || p === '..' || p === '.')) {
            issue(pkg, 'unsupported-workspace-member', 'Workspace members must be literal relative subdirectories; globs are not expanded.'); continue;
          }
          pkg.members.push(path.posix.join(pkg.directory, member));
        }
      }
      for (const section of ['dependencies', 'dev_dependencies']) {
        if (!Object.hasOwn(value, section)) continue;
        if (!object(value[section])) throw new Error(`${section} must be a mapping`);
        for (const [name, descriptor] of Object.entries(value[section])) {
          if (!packageName(name)) throw new Error('dependency names must be Dart package names');
          const dep = { name, section, source: 'hosted', declaration: descriptor };
          pkg.dependencies.push(dep);
          if (descriptor !== null && typeof descriptor !== 'string') {
            if (!object(descriptor)) throw new Error(`invalid descriptor for ${name}`);
            const sources = ['path', 'hosted', 'git', 'sdk'].filter(key => Object.hasOwn(descriptor, key));
            if (sources.length > 1) throw new Error(`multiple dependency sources for ${name}`);
            if (Object.keys(descriptor).some(key => !['path', 'hosted', 'git', 'sdk', 'version'].includes(key))) { dep.source = 'unsupported'; issue(pkg, 'unsupported-descriptor', `${name}: unsupported dependency descriptor fields.`); continue; }
            dep.source = sources[0] ?? 'hosted';
            if (['path', 'sdk'].includes(dep.source) && (typeof descriptor[dep.source] !== 'string' || !descriptor[dep.source])) throw new Error(`invalid ${dep.source} descriptor for ${name}`);
            if (descriptor.version !== undefined && typeof descriptor.version !== 'string') throw new Error(`invalid version constraint for ${name}`);
            if (dep.source === 'git' && object(descriptor.git)) {
              if (typeof descriptor.git.url !== 'string' || !descriptor.git.url || ['ref', 'path'].some(key => descriptor.git[key] !== undefined && typeof descriptor.git[key] !== 'string')) throw new Error(`invalid Git source for ${name}`);
              if (Object.keys(descriptor.git).some(key => !['url', 'ref', 'path'].includes(key))) issue(pkg, 'unsupported-descriptor', `${name}: unsupported Git source fields.`);
            }
            if (dep.source === 'hosted' && object(descriptor.hosted) && (typeof descriptor.hosted.url !== 'string' || !descriptor.hosted.url || descriptor.hosted.name !== undefined && descriptor.hosted.name !== name)) throw new Error(`invalid hosted source for ${name}`);

            if (['hosted', 'git'].includes(dep.source) && Object.hasOwn(descriptor, dep.source) && typeof descriptor[dep.source] !== 'string' && !object(descriptor[dep.source])) throw new Error(`invalid ${dep.source} descriptor for ${name}`);
          }
        }
      }
    } catch (error) {
      const unsupported = /aliases are not permitted|anchor `|explicit tag|merge keys are not permitted|mapping keys must be strings/.test(error.message);
      issue(pkg, unsupported ? 'unsupported-manifest-yaml' : 'invalid-manifest', error.message, unsupported ? 'unsupported' : 'error');
    }
  }
  const byDirectory = new Map(packages.map(pkg => [pkg.directory, pkg])), parents = new Map();
  for (const pkg of packages) for (const member of pkg.members) {
    const target = byDirectory.get(member);
    if (!target) {
      try {
        const kind = evidence.presence(manifestAt(member));
        issue(pkg, kind === 'missing' ? 'missing-workspace-member' : 'uninspected-workspace-member', `Workspace member ${member} has no inspected pubspec.`, kind === 'missing' ? 'error' : 'unsupported');
      } catch (error) { issue(pkg, 'unsafe-workspace-member', error.message); }
    } else if (parents.has(member)) issue(pkg, 'duplicate-workspace-member', `Workspace member ${member} is listed more than once.`, 'error');
    else {
      parents.set(member, pkg.directory);
      if (target.name && target.resolution !== 'workspace') issue(target, 'workspace-resolution-required', 'Workspace member must declare resolution: workspace.', 'error');
    }
  }
  const groupRoot = pkg => {
    let directory = pkg.directory;
    while (parents.has(directory)) directory = parents.get(directory);
    return directory;
  };
  const groups = new Map();
  for (const pkg of packages) {
    if (pkg.resolution === 'workspace' && !parents.has(pkg.directory)) issue(pkg, 'orphan-workspace-member', 'resolution: workspace has no containing declared workspace.', 'error');
    const key = groupRoot(pkg);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pkg); pkg.group = key;
  }
  for (const group of groups.values()) {
    const names = new Set();
    for (const pkg of group) {
      if (pkg.name && names.has(pkg.name)) issue(pkg, 'duplicate-package-name', `Duplicate package name ${pkg.name} in one resolution group.`, 'error');
      names.add(pkg.name);
    }
    // Stray pubspecs between a workspace root and member make Pub resolution invalid.
    for (const pkg of group) for (const other of packages) {
      if (other.directory !== pkg.directory && other.directory !== pkg.group && pkg.directory.startsWith(`${other.directory}/`) && (pkg.group === '.' || other.directory.startsWith(`${pkg.group}/`)) && !group.includes(other)) issue(pkg, 'stray-workspace-manifest', `Unlisted intermediate manifest ${other.manifest}.`, 'error');
    }
  }
  const edges = [];
  for (const pkg of packages) {
    const group = groups.get(pkg.group), uncertain = group.some(item => item.uncertain);
    for (const dep of pkg.dependencies) {
      const edge = { from: pkg.manifest, package: pkg.name, name: dep.name, section: dep.section, source: dep.source, state: 'unresolved', target: null };
      edges.push(edge);
      if (uncertain) { edge.reason = 'resolution-group-incomplete'; continue; }
      // All sources resolve locally when the named target belongs to the same workspace.
      const workspace = group.length > 1 || pkg.members.length > 0;
      const local = workspace ? group.find(item => item.name === dep.name) : null;
      if (local) { edge.state = 'local'; edge.target = local.manifest; edge.reason = 'workspace-member'; continue; }
      if (dep.source !== 'path') { edge.state = 'external'; edge.reason = 'not-a-local-workspace-or-path-dependency'; continue; }
      const declared = dep.declaration.path;
      if (path.win32.isAbsolute(declared) || /[\\\x00-\x1f]/.test(declared)) { edge.reason = 'unsupported-path'; issue(pkg, 'unsupported-path', `${dep.name}: only repository-contained relative paths are inspected.`); continue; }
      const directory = path.posix.normalize(path.posix.join(pkg.directory, declared));
      if (!inside(directory)) { edge.reason = 'outside-repository'; issue(pkg, 'outside-repository', `${dep.name}: path target is outside the repository.`); continue; }
      const target = byDirectory.get(directory);
      try {
        const kind = evidence.presence(manifestAt(directory));
        if (!target || target.uncertain) { edge.reason = 'uninspected-target'; issue(pkg, kind === 'missing' ? 'missing-path-target' : 'uninspected-path-target', `${dep.name}: target ${manifestAt(directory)} is unavailable or incomplete.`, kind === 'missing' ? 'error' : 'unsupported'); }
        else if (target.name !== dep.name) { edge.reason = 'package-name-mismatch'; issue(pkg, 'package-name-mismatch', `${dep.name}: target declares ${target.name}.`, 'error'); }
        else { edge.state = 'local'; edge.target = target.manifest; edge.reason = 'relative-path'; }
      } catch (error) { edge.reason = 'unsafe-target'; issue(pkg, 'unsafe-path-target', error.message); }
    }
  }
  return { evidence, packages, edges };
}

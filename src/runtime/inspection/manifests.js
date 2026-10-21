/**
 * @file Inventory recognised package manifests and capture bounded filesystem evidence.
 * @see .agent/contract.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const NAMES = new Set(['package.json', 'go.mod', 'pyproject.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'pubspec.yaml']);
export const isPackageManifest = name => NAMES.has(name) || /\.(?:cs|fs|vb)proj$/i.test(name);
export const MANIFEST_LIMITS = Object.freeze({ entries: 10000, depth: 64, fileBytes: 1024 * 1024, totalBytes: 32 * 1024 * 1024 });
const SKIP = new Set(['.git', '.agents', '.dart_tool', 'node_modules', 'vendor', 'dist', 'build', 'target', 'out', 'coverage', 'tmp', '.venv', 'venv']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const posix = value => value.split(path.sep).join('/');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function manifestInventory(repoRoot, { limits = MANIFEST_LIMITS } = {}) {
  const root = path.resolve(repoRoot), inputs = new Map(), diagnostics = [], excluded = [], manifests = [];
  let entries = 0, bytes = 0;
  const issue = (code, file, message, severity = 'unsupported') => diagnostics.push({ code, path: file, message, severity });
  const record = (file, value, kind = 'file') => {
    const key = `${kind}:${file}`, sha256 = hash(value);
    if (inputs.has(key) && inputs.get(key).sha256 !== sha256) issue('unstable-input', file, 'Input changed during inspection.');
    else inputs.set(key, { path: file, kind, sha256 });
  };
  const confined = relative => {
    if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.win32.isAbsolute(relative) || relative.split('/').includes('..')) throw new Error('expected a confined repository-relative path');
    const absolute = path.resolve(root, relative);
    let current = root;
    for (const part of posix(path.relative(root, absolute)).split('/').filter(Boolean)) {
      current = path.join(current, part);
      try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('symlinks are not followed'); }
      catch (error) { if (error.code === 'ENOENT') break; throw error; }
    }
    return absolute;
  };
  const presence = relative => {
    let kind;
    try { const stat = fs.lstatSync(confined(relative)); kind = stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : 'other'; }
    catch (error) { if (error.code !== 'ENOENT') throw error; kind = 'missing'; }
    record(relative, kind, 'presence');
    return kind;
  };
  const read = relative => {
    const file = confined(relative), stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('not a regular file');
    if (stat.size > limits.fileBytes || bytes + stat.size > limits.totalBytes) throw new Error('manifest analysis byte limit reached');
    const content = fs.readFileSync(file); bytes += content.length; record(relative, content);
    return content.toString('utf8');
  };
  const walk = (relative, depth) => {
    if (depth > limits.depth) { issue('scan-limit', relative, 'Directory depth limit reached.'); return; }
    let children;
    try {
      children = fs.readdirSync(confined(relative), { withFileTypes: true }).sort((a, b) => compare(a.name, b.name));
      record(relative, JSON.stringify(children.map(e => [e.name, e.isSymbolicLink() ? 'link' : e.isDirectory() ? 'directory' : 'file'])), 'directory');
    } catch (error) { issue('unreadable-directory', relative, error.message); return; }
    for (const child of children) {
      if (++entries > limits.entries) { issue('scan-limit', relative, 'Directory entry limit reached.'); return; }
      const target = relative === '.' ? child.name : `${relative}/${child.name}`;
      if (child.isSymbolicLink()) { excluded.push({ path: target, reason: 'symlink' }); issue('symlink', target, 'Symlink may hide manifests; target was not read.'); }
      else if (child.isDirectory()) {
        if (SKIP.has(child.name) || child.name.startsWith('.')) excluded.push({ path: target, reason: 'inventory-policy' });
        else walk(target, depth + 1);
      } else if (child.isFile() && child.name === 'pubspec.yaml') manifests.push(target);
    }
  };
  walk('.', 0);
  return { root, manifests, inputs, diagnostics, excluded, limits, read, presence,
    snapshot: () => ({ inputs: [...inputs.values()].sort((a, b) => compare(`${a.path}:${a.kind}`, `${b.path}:${b.kind}`)) }) };
}

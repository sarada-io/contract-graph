#!/usr/bin/env node
/**
 * @file Publication for the website target.
 * @see ../.agent/contract.md
 */
/** Assemble only declared website inputs. Shared inputs use the root build-only Markdown dependency; no network or external checkout is required. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderPage } from './shell/render.mjs';
import { guides, renderDocumentation, sharedSchemas, sharedBrandAssets } from './documentation.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privateNames = new Set(['AGENTS.md', 'CLAUDE.md', 'SKILL.md']);

export function validateAssetPath(relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.posix.isAbsolute(relative)) throw new Error(`Invalid asset path: ${relative}`);
  const parts = relative.split('/');
  if (parts.some(part => !part || part.startsWith('.') || privateNames.has(part))) throw new Error(`Private or unsafe asset path: ${relative}`);
  return relative;
}

function readInput(sourceRoot, relative) {
  validateAssetPath(relative);
  const full = path.join(sourceRoot, relative);
  const actual = fs.realpathSync(full);
  const within = path.relative(sourceRoot, actual);
  if (within.startsWith('..') || path.isAbsolute(within) || actual !== full || !fs.statSync(full).isFile()) throw new Error(`Source must be a regular file without symlinks: ${relative}`);
  return fs.readFileSync(full);
}

/** Return a deterministic output map without writing. This is also the preview freshness source. */
export function assembleSite(root = repositoryRoot) {
  const sourceRoot = fs.realpathSync(path.join(root, 'site'));
  const manifest = JSON.parse(readInput(sourceRoot, 'manifest.json'));
  if (!Array.isArray(manifest.pages) || !Array.isArray(manifest.copies) || !Array.isArray(manifest.bundles ?? []) || Object.keys(manifest).some(key => !['pages', 'copies', 'bundles'].includes(key))) throw new Error('Invalid site manifest');
  const templates = {};
  for (const [key, file] of Object.entries({ document: 'document.html', head: 'head.html', header: 'header.html', footer: 'footer.html', theme: 'theme-bootstrap.html' })) {
    templates[key] = readInput(sourceRoot, 'shell/' + file).toString();
  }
  const output = new Map();
  const add = (relative, bytes) => {
    validateAssetPath(relative);
    if (output.has(relative)) throw new Error(`Duplicate output path: ${relative}`);
    output.set(relative, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
  };
  for (const directory of manifest.pages) {
    validateAssetPath(directory);
    const metadata = JSON.parse(readInput(sourceRoot, directory + '/metadata.json'));
    if (!metadata.output?.endsWith('/index.html') && metadata.output !== 'index.html') throw new Error('Full pages must output a directory index');
    let body = readInput(sourceRoot, directory + '/body.html').toString();
    if (Object.keys(guides).some(slug => directory === `pages/docs/${slug}`)) {
      if (body.split('{{documentation}}').length !== 2) throw new Error(`Guide shell requires one documentation slot: ${directory}`);
      body = body.replace('{{documentation}}', () => renderDocumentation(root, directory, relative => readInput(sourceRoot, relative)));
    }
    const structured = metadata.structuredData ? readInput(sourceRoot, directory + '/structured-data.html').toString() : '';
    add(metadata.output, renderPage(metadata, body, templates, structured));
  }
  for (const copy of manifest.copies) {
    if (!copy || Object.keys(copy).some(key => !['source', 'output'].includes(key))) throw new Error('Invalid copy entry');
    add(copy.output, readInput(sourceRoot, copy.source));
  }
  for (const [file, bytes] of sharedSchemas(root)) add(file, bytes);
  for (const [file, bytes] of sharedBrandAssets(root)) add(file, bytes);
  for (const entry of manifest.bundles ?? []) {
    const bundle = JSON.parse(readInput(sourceRoot, entry));
    if (!Array.isArray(bundle.sources) || !bundle.sources.length ||
        !['none', 'iife'].includes(bundle.wrapper) ||
        Object.keys(bundle).some(key => !['output', 'sources', 'wrapper'].includes(key)) ||
        new Set(bundle.sources).size !== bundle.sources.length) throw new Error(`Invalid bundle: ${entry}`);
    const body = Buffer.concat(bundle.sources.map(source => readInput(sourceRoot, source)));
    add(bundle.output, bundle.wrapper === 'iife'
      ? Buffer.concat([Buffer.from('(() => {\n'), body, Buffer.from('})();\n')]) : body);
  }
  if (!output.has('index.html')) throw new Error('Site manifest must produce index.html');
  // A file cannot also be another file's parent directory (case-insensitive for macOS/Windows).
  const paths = new Set();
  for (const name of output.keys()) {
    const lower = name.toLowerCase();
    if (paths.has(lower)) throw new Error(`Output path case collision: ${name}`);
    paths.add(lower);
  }
  for (const name of paths) {
    const parts = name.split('/');
    while (parts.length > 1) {
      parts.pop();
      if (paths.has(parts.join('/'))) throw new Error(`Output file/directory collision: ${name}`);
    }
  }
  return new Map([...output].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function inventory(directory, prefix = '') {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Output contains a symlink: ${relative}`);
    if (entry.isDirectory()) files.push(...inventory(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Output contains a non-file: ${relative}`);
  }
  return files;
}

/** Check compares every output byte and path; it never rewrites an outdated directory. */
export function checkOutput(directory, output) {
  const actual = inventory(directory);
  const differences = actual.filter(file => !output.has(file)).map(file => `unexpected: ${file}`);
  for (const [file, bytes] of output) {
    if (!actual.includes(file)) differences.push(`missing: ${file}`);
    else if (!fs.readFileSync(path.join(directory, file)).equals(bytes)) differences.push(`changed: ${file}`);
  }
  return differences;
}

/** root identifies a checkout; the only writable output is its public/ sibling of site/. */
export function buildSite({ root = repositoryRoot, check = false } = {}) {
  root = fs.realpathSync(root);
  const outputRoot = path.join(root, 'public');
  const sourceRoot = path.join(root, 'site');
  if (fs.lstatSync(sourceRoot).isSymbolicLink()) throw new Error('site/ must not be a symlink');
  if (fs.existsSync(outputRoot) && (fs.lstatSync(outputRoot).isSymbolicLink() || !fs.statSync(outputRoot).isDirectory())) throw new Error('public/ must be a regular directory');
  const output = assembleSite(root);
  if (check) {
    const differences = checkOutput(outputRoot, output);
    if (differences.length) throw new Error(`Generated public/ is stale:\n${differences.join('\n')}`);
    return { files: output.size, changed: false };
  }
  const lock = path.join(root, '.site-build.lock');
  let fd;
  try { fd = fs.openSync(lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Another site build owns .site-build.lock'); throw error; }
  let stage;
  let previous;
  try {
    if (checkOutput(outputRoot, output).length === 0) return { files: output.size, changed: false };
    stage = fs.mkdtempSync(path.join(root, '.site-build-'));
    for (const [file, bytes] of output) {
      const target = path.join(stage, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
    }
    if (fs.existsSync(outputRoot)) {
      previous = stage + '-previous';
      fs.renameSync(outputRoot, previous);
    }
    try { fs.renameSync(stage, outputRoot); stage = null; }
    catch (error) { if (previous) { fs.renameSync(previous, outputRoot); previous = null; } throw error; }
    if (previous) { fs.rmSync(previous, { recursive: true }); previous = null; }
    return { files: output.size, changed: true };
  } finally {
    if (stage) fs.rmSync(stage, { recursive: true, force: true });
    // A retained previous directory is recovery evidence if the filesystem failed during swap.
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--check')) throw new Error('Usage: node site/publication.mjs [--check]');
    const result = buildSite({ check: args.includes('--check') });
    process.stdout.write(`Site ${args.includes('--check') ? 'checked' : 'built'}: ${result.files} files.\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

/**
 * @file Publication.test for the website target.
 * @see ../.agent/contract.md
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assembleSite, buildSite, checkOutput } from '../site/publication.mjs';
import { renderTemplate } from '../site/shell/render.mjs';
import { fixture } from './helpers/fixture.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function editManifest(root, change) {
  const file = path.join(root, 'site/manifest.json');
  const value = JSON.parse(fs.readFileSync(file));
  change(value);
  fs.writeFileSync(file, JSON.stringify(value));
}

test('a clean checkout assembles the declared site deterministically', t => {
  const root = fixture(t);
  assert.equal(fs.existsSync(path.join(root, 'public')), false);
  const expected = assembleSite(root);
  assert.ok(expected.has('docs/architecture/index.html'));
  assert.ok(expected.has('schema/contract-v1.schema.json'));
  assert.ok(expected.has('whats-included/index.html'));
  assert.equal(buildSite({ root }).files, expected.size);
  assert.equal(buildSite({ root }).changed, false);
  assert.deepEqual(checkOutput(path.join(root, 'public'), expected), []);
});

test('check reports missing, changed and unexpected output without writing it', t => {
  const root = fixture(t);
  buildSite({ root });
  fs.writeFileSync(path.join(root, 'public/index.html'), 'manual edit');
  fs.unlinkSync(path.join(root, 'public/styles.css'));
  fs.writeFileSync(path.join(root, 'public/extra.txt'), 'unexpected');
  assert.throws(() => buildSite({ root, check: true }), /Generated public\/ is stale/);
  assert.equal(fs.readFileSync(path.join(root, 'public/index.html'), 'utf8'), 'manual edit');
  assert.equal(fs.existsSync(path.join(root, 'public/styles.css')), false);
  buildSite({ root });
  assert.equal(fs.existsSync(path.join(root, 'public/extra.txt')), false);
  assert.doesNotThrow(() => buildSite({ root, check: true }));
});

test('missing inputs and malformed metadata preserve the last successful output', t => {
  const root = fixture(t);
  buildSite({ root });
  const before = fs.readFileSync(path.join(root, 'public/index.html'));
  fs.unlinkSync(path.join(root, 'site/pages/home/body.html'));
  assert.throws(() => buildSite({ root }), /ENOENT/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/index.html')), before);
  fs.writeFileSync(path.join(root, 'site/pages/home/body.html'), '<main>New</main>');
  const metadata = path.join(root, 'site/pages/home/metadata.json');
  const data = JSON.parse(fs.readFileSync(metadata));
  data.canonical = 'http://localhost/';
  fs.writeFileSync(metadata, JSON.stringify(data));
  assert.throws(() => buildSite({ root }), /Canonical URL/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/index.html')), before);
});

test('private source files are excluded and cannot be smuggled through the manifest', t => {
  const root = fixture(t);
  const hidden = path.join(root, 'site/static/nested/.agents/cg');
  fs.mkdirSync(hidden, { recursive: true });
  fs.writeFileSync(path.join(hidden, 'contract.yaml'), 'internal');
  fs.writeFileSync(path.join(root, 'site/static/AGENTS.md'), 'internal');
  assert.ok([...assembleSite(root).keys()].every(name => !name.includes('.agents') && !name.includes('AGENTS.md')));
  editManifest(root, m => m.copies.push({ source: 'static/nested/.agents/cg/contract.yaml', output: 'leak.txt' }));
  assert.throws(() => buildSite({ root }), /Private or unsafe/);
});

test('path traversal, private output and duplicate output fail before publication', t => {
  const root = fixture(t);
  const original = fs.readFileSync(path.join(root, 'site/manifest.json'));
  for (const output of ['../README.md', '/absolute.html', 'nested/.agents/contract.yaml', 'nested/AGENTS.md', 'index.html', 'INDEX.html', 'docs']) {
    fs.writeFileSync(path.join(root, 'site/manifest.json'), original);
    editManifest(root, m => m.copies.push({ source: 'presentation/theme/tokens.css', output }));
    assert.throws(() => buildSite({ root }), /path|collision/i, output);
    assert.equal(fs.existsSync(path.join(root, 'public')), false);
  }
});

test('source and output symlinks cannot escape the owned trees', t => {
  const root = fixture(t);
  const outside = path.join(root, 'outside.txt');
  fs.writeFileSync(outside, 'keep');
  fs.symlinkSync(outside, path.join(root, 'site/static/link.txt'));
  editManifest(root, m => m.copies.push({ source: 'static/link.txt', output: 'link.txt' }));
  assert.throws(() => buildSite({ root }), /symlink/);
  fs.symlinkSync(path.join(root, 'site'), path.join(root, 'public'), 'dir');
  assert.throws(() => buildSite({ root }), /regular directory/);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'keep');
});

test('template slots are explicit and inserted content is not evaluated', () => {
  assert.throws(() => renderTemplate('{{typo}}', { body: 'content' }), /Unknown template slot/);
  assert.throws(() => renderTemplate('no slot', { body: 'content' }), /missing required slot/);
  assert.equal(renderTemplate('{{body}}', { body: '{{a literal example}}' }), '{{a literal example}}');
});

test('one shell reaches every full page with page-specific active state and escaped metadata', t => {
  const root = fixture(t);
  const header = path.join(root, 'site/shell/header.html');
  fs.appendFileSync(header, '<!-- shell change -->');
  const home = path.join(root, 'site/pages/home/metadata.json');
  const metadata = JSON.parse(fs.readFileSync(home));
  metadata.title = 'A < B & "C"';
  fs.writeFileSync(home, JSON.stringify(metadata));
  const files = assembleSite(root);
  assert.match(files.get('index.html').toString(), /<title>A &lt; B &amp; &quot;C&quot;<\/title>/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site/manifest.json')));
  for (const folder of manifest.pages) {
    const page = JSON.parse(fs.readFileSync(path.join(root, 'site', folder, 'metadata.json')));
    const html = files.get(page.output).toString();
    assert.match(html, /<!-- shell change -->/);
    const header = html.match(/<header[\s\S]*?<\/header>/)[0];
    assert.equal((header.match(/aria-current="page"/g) || []).length, page.current ? 1 : 0, page.output);
  }
  assert.doesNotMatch(files.get('whats-included/index.html').toString(), /shell change|site-header/);
});

test('declared passthrough assets retain their exact bytes', () => {
  const files = assembleSite(repository);
  const manifest = JSON.parse(fs.readFileSync(path.join(repository, 'site/manifest.json')));
  for (const copy of manifest.copies) assert.deepEqual(files.get(copy.output), fs.readFileSync(path.join(repository, 'site', copy.source)), copy.output);
});

test('ordered bundles preserve declared bytes and the browser closure', () => {
  const output = assembleSite();
  for (const entry of ['presentation/entry.json', 'interactions/entry.json']) {
    const bundle = JSON.parse(fs.readFileSync(path.join(repository, 'site', entry)));
    const bytes = Buffer.concat(bundle.sources.map(source => fs.readFileSync(path.join(repository, 'site', source))));
    const expected = bundle.wrapper === 'iife' ? Buffer.concat([Buffer.from('(() => {\n'), bytes, Buffer.from('})();\n')]) : bytes;
    assert.deepEqual(output.get(bundle.output), expected);
  }
});

test('bundle declarations cannot bypass source confinement or overwrite outputs', t => {
  const root = fixture(t);
  const file = path.join(root, 'site/presentation/entry.json');
  const original = JSON.parse(fs.readFileSync(file));
  for (const mutation of [
    b => b.sources.push('../README.md'),
    b => b.sources.push('shell/AGENTS.md'),
    b => b.sources.push(b.sources[0]),
    b => b.wrapper = 'eval',
    b => b.output = 'index.html',
    b => b.sources.push('missing.css'),
  ]) {
    const bundle = structuredClone(original); mutation(bundle);
    fs.writeFileSync(file, JSON.stringify(bundle));
    assert.throws(() => buildSite({ root }));
    assert.equal(fs.existsSync(path.join(root, 'public')), false);
  }
});

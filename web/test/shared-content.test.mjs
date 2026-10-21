/**
 * @file Verify canonical content propagation, shared-input confinement and published links.
 * @see ../site/.agent/contract.md
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { assembleSite, buildSite } from '../site/publication.mjs';
import { readSharedInput, documentationLink } from '../site/documentation.mjs';
import { fixture } from './helpers/fixture.mjs';

test('one canonical edit updates the technical article and both schema URL families', t => {
  const root = fixture(t);
  const guide = path.join(root, '../docs/contracts.md');
  fs.appendFileSync(guide, '\n## Shared source example\n\nA uniquely authored promise.\n');
  const schema = path.join(root, '../src/cg/schema/contract.schema.json');
  const value = JSON.parse(fs.readFileSync(schema)); value.description = 'Shared schema example';
  fs.writeFileSync(schema, JSON.stringify(value));
  const output = assembleSite(root);
  const html = output.get('docs/contracts/index.html').toString();
  assert.match(html, /A uniquely authored promise/);
  assert.match(html, /href="#shared-source-example"/);
  assert.match(html, /id="enforced"/);
  assert.match(html, /--suggest/);
  assert.match(html, /--ecosystem dart/);
  assert.doesNotMatch(html, /schemaVersion: 1/);
  for (const prefix of ['schema', 'contract-graph/schema']) assert.deepEqual(output.get(`${prefix}/contract-v1.schema.json`), fs.readFileSync(schema));
  assert.equal(fs.existsSync(path.join(root, 'site/static/schema/contract-v1.schema.json')), false);
});

test('undeclared paths, symlinked shared inputs and duplicate schema outputs fail closed', t => {
  const root = fixture(t);
  buildSite({ root });
  const before = fs.readFileSync(path.join(root, 'public/index.html'));
  assert.throws(() => readSharedInput(root, '.env'), /Undeclared shared input/);
  assert.throws(() => readSharedInput(root, '../docs/contracts.md'), /Undeclared shared input/);
  const source = path.join(root, '../docs/contracts.md');
  fs.renameSync(source, source + '.original'); fs.symlinkSync(source + '.original', source);
  assert.throws(() => buildSite({ root }), /without symlinks/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/index.html')), before);
  fs.unlinkSync(source); fs.renameSync(source + '.original', source);
  const manifest = path.join(root, 'site/manifest.json'); const value = JSON.parse(fs.readFileSync(manifest));
  value.copies.push({ source: 'static/robots.txt', output: 'schema/contract-v1.schema.json' }); fs.writeFileSync(manifest, JSON.stringify(value));
  assert.throws(() => buildSite({ root }), /Duplicate output path/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/index.html')), before);
});

test('stale derived diagrams and missing canonical guides cannot silently publish', t => {
  const root = fixture(t);
  const guide = path.join(root, '../docs/architecture-considerations.md');
  const before = fs.readFileSync(guide, 'utf8');
  fs.writeFileSync(guide, before.replace('Required graph protocol', 'Changed graph protocol'));
  assert.throws(() => assembleSite(root), /figure 1 is stale/);
  fs.writeFileSync(guide, before);
  fs.unlinkSync(path.join(root, '../docs/workflow.md'));
  assert.throws(() => assembleSite(root), /ENOENT/);
});

test('repository Markdown links become site routes or public source references', () => {
  assert.equal(documentationLink('architecture-considerations.md#checks', 'docs/contracts.md'), '/docs/architecture/#checks');
  assert.equal(documentationLink('../README.md#windows-powershell', 'docs/analyse.md'), 'https://github.com/sarada-io/contract-graph/blob/main/README.md#windows-powershell');
  assert.equal(documentationLink('#local', 'docs/contracts.md'), '#local');
  assert.throws(() => documentationLink('../../outside.md', 'docs/contracts.md'), /escapes/);
});

test('every local article link resolves and all generated HTML IDs are unique', () => {
  const files = assembleSite();
  for (const [file, bytes] of files) {
    if (!file.endsWith('.html')) continue;
    const html = bytes.toString();
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `Duplicate IDs in ${file}`);
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const href = match[1].replaceAll('&amp;', '&');
      if (!href.startsWith('/') && !href.startsWith('#') || href.startsWith('//')) continue;
      const [url, hash] = href.split('#');
      const pathname = url.split('?')[0];
      const target = pathname ? pathname.slice(1) + (pathname.endsWith('/') ? 'index.html' : '') : file;
      assert.ok(files.has(target), `${file}: missing ${href}`);
      if (!hash || hash === 'watch' && target === 'index.html') continue;
      const body = files.get(target).toString();
      assert.ok(body.includes(`id="${decodeURIComponent(hash)}"`), `${file}: missing anchor ${href}`);
    }
  }
});

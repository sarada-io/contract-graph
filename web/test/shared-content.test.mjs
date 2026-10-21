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

test('one indexed Markdown file automatically gains a page, navigation, links and sitemap entry', t => {
  const root = fixture(t);
  const docs = path.join(root, '../docs');
  const index = path.join(docs, 'README.md');
  fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('\n\n<!-- public-guides:end -->', '\n| [New & useful](new-guide.md) | A shared description with <characters> |\n<!-- public-guides:end -->'));
  fs.writeFileSync(path.join(docs, 'new-guide.md'), '# A new canonical guide\n\n## First section\n\nGo to [contracts](contracts.md) or [another guide](vision.md).\n');
  fs.appendFileSync(path.join(docs, 'contracts.md'), '\nSee [the new guide](new-guide.md#first-section).\n');
  fs.writeFileSync(path.join(docs, 'unlisted.md'), '# Never published\n');
  fs.mkdirSync(path.join(docs, 'plan'));
  fs.writeFileSync(path.join(docs, 'plan/working.md'), '# Private working plan\n');
  const files = assembleSite(root);
  const guide = files.get('docs/new-guide/index.html').toString();
  assert.match(guide, /<h1>A new canonical guide<\/h1>/);
  assert.match(guide, /href="#first-section"/);
  assert.match(guide, /href="\/docs\/contracts\/"/);
  assert.match(guide, /A shared description with &lt;characters&gt;/);
  assert.match(files.get('docs/index.html').toString(), /New &amp; useful/);
  assert.match(files.get('docs/index.html').toString(), /href="\/docs\/new-guide\/"/);
  assert.match(files.get('docs/contracts/index.html').toString(), /href="\/docs\/new-guide\/#first-section"/);
  assert.match(files.get('sitemap.xml').toString(), /https:\/\/contractgraph.dev\/docs\/new-guide\//);
  assert.equal([...files.keys()].some(name => /unlisted|working|plan/.test(name)), false);
  assert.throws(() => readSharedInput(root, 'docs/unlisted.md'), /Undeclared shared input/);
});

test('public index rejects traversal, hidden inputs, duplicate routes and malformed declarations', t => {
  const root = fixture(t);
  const index = path.join(root, '../docs/README.md');
  const original = fs.readFileSync(index, 'utf8');
  for (const row of [
    '| [Private](plan/working.md) | Private |',
    '| [Private](../AGENTS.md) | Private |',
    '| [Private](.private.md) | Private |',
    '| [Private](agents.md) | Private |',
    '| [Duplicate](contracts.md) | Duplicate |',
    '| [Conflicting route](architecture.md) | Duplicate |',
    '| no linked file | Missing |',
  ]) {
    // A legacy route must not collide with a newly indexed filename.
    fs.writeFileSync(path.join(root, '../docs/architecture.md'), '# Architecture\n');
    fs.writeFileSync(index, original.replace('\n\n<!-- public-guides:end -->', '\n' + row + '\n<!-- public-guides:end -->'));
    assert.throws(() => assembleSite(root), /Public guide|Duplicate public guide/);
  }
  fs.writeFileSync(index, original.replace('\n\n<!-- public-guides:end -->', ''));
  assert.throws(() => assembleSite(root), /public-guides table/);
});

test('guide title validation and a symlinked public index preserve the last successful build', t => {
  const root = fixture(t);
  buildSite({ root });
  const homepage = fs.readFileSync(path.join(root, 'public/index.html'));
  const guide = path.join(root, '../docs/analyse.md');
  const before = fs.readFileSync(guide, 'utf8');
  fs.writeFileSync(guide, before + '\n# A competing title\n');
  assert.throws(() => buildSite({ root }), /one opening title/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/index.html')), homepage);
  fs.writeFileSync(guide, before);
  const index = path.join(root, '../docs/README.md');
  fs.renameSync(index, index + '.original');
  fs.symlinkSync(index + '.original', index);
  assert.throws(() => buildSite({ root }), /without symlinks/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/index.html')), homepage);
});

/**
 * @file Site promises.test for the website target.
 * @see ../.agent/contract.md
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { assembleSite } from '../site/publication.mjs';

const destinations = ['/', '/problem/', '/ways-to-work/', '/start/', '/docs/', 'https://github.com/sarada-io/contract-graph', 'https://www.npmjs.com/package/contract-graph'];
function verifyNavigation(html) {
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0];
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0];
  assert.ok(header && footer, 'Full pages require header and footer');
  assert.deepEqual([...header.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => match[1]), destinations);
  for (const destination of destinations.slice(1)) assert.ok(footer.includes(`href="${destination}"`), destination);
  for (const section of [header, footer]) {
    for (const destination of destinations.slice(-2)) {
      const anchor = [...section.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m => m[0]).find(a => a.includes(`href="${destination}"`));
      assert.match(anchor, /target="_blank"/);
      assert.match(anchor, /rel="noopener"/);
      assert.match(anchor, /opens in a new tab/);
    }
  }
  assert.match(header, /id="site-nav"/);
  assert.match(header, /aria-controls="site-nav"/);
  assert.match(footer, /mailto:hello@contractgraph.dev/);
  assert.match(footer, /https:\/\/sarada.io\//);
}
function verifySchema(files, name) {
  const canonical = files.get(`schema/${name}-v1.schema.json`);
  assert.equal(JSON.parse(canonical).$id, `https://contractgraph.dev/schema/${name}-v1.schema.json`);
  assert.deepEqual(files.get(`contract-graph/schema/${name}-v1.schema.json`), canonical);
}

test('P01-02/P01-03: every full page retains required navigation and production metadata', () => {
  const files = assembleSite();
  for (const [file, bytes] of files) {
    const html = file.endsWith('.html') ? bytes.toString() : '';
    if (!html.includes('<header class="site-header">')) continue;
    verifyNavigation(html);
    const route = file === 'index.html' ? '/' : '/' + file.replace(/index\.html$/, '');
    assert.ok(html.includes(`<link rel="canonical" href="https://contractgraph.dev${route}">`), file);
    assert.ok(html.includes(`<meta property="og:url" content="https://contractgraph.dev${route}">`), file);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file);
  }
});

test('navigation detector rejects removing a required destination', () => {
  const home = assembleSite().get('index.html').toString();
  assert.throws(() => verifyNavigation(home.replace('href="/docs/"', 'href="/missing/"')));
});

test('P02-01: canonical and legacy schema payloads retain identities and identical bytes', () => {
  const files = assembleSite();
  for (const name of ['contract', 'principles', 'enforcement']) verifySchema(files, name);
  const broken = new Map(files);
  broken.set('contract-graph/schema/contract-v1.schema.json', Buffer.from('{}'));
  assert.throws(() => verifySchema(broken, 'contract'));
});

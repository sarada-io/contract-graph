/**
 * @file Sitemap.test for the website target.
 * @see ../site/static/.agent/contract.md
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://contractgraph.dev';

function walkIndexPages(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkIndexPages(full, found);
    else if (entry.name === 'index.html') found.push(full);
  }
  return found;
}

function pageUrl(file) {
  const relative = path.relative(path.join(root, 'public'), path.dirname(file)).split(path.sep).join('/');
  return relative === '' ? `${origin}/` : `${origin}/${relative}/`;
}

function parseSitemap(xml) {
  const urls = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block[1].match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod = block[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    urls.push({ loc, lastmod });
  }
  return urls;
}

test('sitemap lists every indexable HTML page without invented lastmod dates', () => {
  const xml = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
  const urls = parseSitemap(xml);
  const listed = new Set(urls.map(url => url.loc));
  const pages = walkIndexPages(path.join(root, 'public'));
  const indexable = [];
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    if (/<meta name="robots" content="noindex"/.test(html)) continue;
    indexable.push(pageUrl(file));
  }
  assert.deepEqual([...listed].sort(), [...indexable].sort());
  for (const url of urls) {
    assert.equal(url.lastmod, undefined, url.loc);
  }
});

test('robots.txt points crawlers at the canonical sitemap', () => {
  const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, new RegExp(`Sitemap: ${origin}/sitemap.xml`));
});

test('alias redirects cover former community URLs', () => {
  const redirects = fs.readFileSync(path.join(root, 'public/_redirects'), 'utf8');
  assert.match(redirects, /\/community\/contract-graph\/architecture\/ \/docs\/architecture\/ 301/);
  assert.match(redirects, /\/community\/contract-graph\/product\/ \/ways-to-work\/ 301/);
  assert.match(redirects, /\/community\/contract-graph\/developers\/ \/whats-included\/ 301/);
  assert.match(redirects, /\/for-developers\/ \/whats-included\/ 301/);
});

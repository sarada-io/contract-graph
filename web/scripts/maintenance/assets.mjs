/**
 * @file Assets for the website target.
 * @see ../.agent/contract.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { repositoryRoot } from '../paths.mjs';

export function getRequiredPaths() {
  return [
    'public/index.html',
    'public/styles.css',
    'public/site.js',
    'public/sitemap.xml',
    'public/robots.txt',
    'public/start/index.html',
    'public/problem/index.html',
    'public/ways-to-work/index.html',
    'public/whats-included/index.html',
    'public/docs/index.html',
    'public/docs/architecture/index.html',
    'public/docs/intent/index.html',
    'public/docs/experts/index.html',
    'public/schema/index.html',
    'public/schema/contract-v1.schema.json',
    'public/schema/principles-v1.schema.json',
    'public/schema/enforcement-v1.schema.json',
    'wrangler.jsonc',
  ];
}

export function checkSiteFiles(root = repositoryRoot, log = line => process.stdout.write(`${line}\n`)) {
  const missing = [];
  for (const relative of getRequiredPaths()) {
    const full = path.join(root, relative);
    if (fs.existsSync(full)) log(`ok   ${relative}`);
    else {
      log(`MISS ${relative}`);
      missing.push(relative);
    }
  }
  if (missing.length) return 1;
  log('\nAll required generated files are present. Editable sources live in site/.');
  return 0;
}

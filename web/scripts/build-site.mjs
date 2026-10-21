#!/usr/bin/env node
/**
 * @file Build site for the website target.
 * @see .agent/contract.md
 */
/** Cloudflare build gate: generate, validate and test before its deploy command runs. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildSite } from '../site/publication.mjs';
import { repositoryRoot } from './paths.mjs';
import { checkSiteFiles } from './maintenance/assets.mjs';

try {
  const result = buildSite();
  process.stdout.write(`Generated ${result.files} website files.\n`);
  if (checkSiteFiles() !== 0) throw new Error('Generated website is incomplete');
  const tests = fs.readdirSync(path.join(repositoryRoot, 'test')).filter(file => file.endsWith('.test.mjs')).sort().map(file => path.join('test', file));
  const checked = spawnSync(process.execPath, ['--test', ...tests], {
    cwd: repositoryRoot, stdio: 'inherit',
    env: { ...process.env, TMPDIR: fs.realpathSync(os.tmpdir()) },
  });
  if (checked.error) throw checked.error;
  if (checked.status !== 0) throw new Error(`Site tests failed (${checked.status ?? checked.signal})`);
  buildSite({ check: true });
  process.stdout.write('Build gate passed; public/ is ready for the deployment step.\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

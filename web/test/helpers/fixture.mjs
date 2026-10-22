/**
 * @file Build disposable website fixtures with explicitly shared canonical inputs.
 * @see ../../site/.agent/contract.md
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGuides, schemaNames, brandNames } from '../../site/documentation.mjs';

const web = fileURLToPath(new URL('../../', import.meta.url));
export function fixture(t) {
  const container = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'site-assembly-'));
  const root = path.join(container, 'web');
  t.after(() => fs.rmSync(container, { recursive: true, force: true }));
  fs.cpSync(path.join(web, 'site'), path.join(root, 'site'), { recursive: true });
  for (const source of ['docs/README.md', ...loadGuides(web).map(guide => guide.source), ...schemaNames.map(name => `src/cg/schema/${name}.schema.json`), ...brandNames.map(name => `docs/assets/${name}`)]) {
    const target = path.join(container, source);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(web, '..', source), target);
  }
  return root;
}

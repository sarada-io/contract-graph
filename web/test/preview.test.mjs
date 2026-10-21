/**
 * @file Preview.test for the website target.
 * @see ../scripts/.agent/contract.md
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkSiteFiles } from '../scripts/maintenance/assets.mjs';
import { createStaticServer, resolvePublicFile } from '../scripts/preview/server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

function unusedPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => (error ? reject(error) : resolve(port)));
    });
    server.on('error', reject);
  });
}

test('urun checkSiteFiles reports the live public files', () => {
  assert.equal(checkSiteFiles(root, () => {}), 0);
});

test('urun resolvePublicFile serves directory indexes and rejects traversal', () => {
  const publicRoot = path.join(root, 'public');
  assert.equal(
    fs.realpathSync(resolvePublicFile('/', publicRoot)),
    fs.realpathSync(path.join(publicRoot, 'index.html')),
  );
  assert.equal(
    fs.realpathSync(resolvePublicFile('/docs/architecture/', publicRoot)),
    fs.realpathSync(path.join(publicRoot, 'docs/architecture/index.html')),
  );
  assert.equal(resolvePublicFile('/../urun', publicRoot), null);
  assert.equal(resolvePublicFile('/missing-page/', publicRoot), null);
});

test('urun static server serves the homepage', async () => {
  const server = createStaticServer(path.join(root, 'public'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Contract Graph/);
    const missing = await fetch(`http://127.0.0.1:${port}/../urun`);
    assert.equal(missing.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('preview regenerates page routes and reports build failures without serving stale HTML', async () => {
  let preparations = 0;
  let fail = false;
  const server = createStaticServer(path.join(root, 'public'), { prepare() {
    preparations += 1;
    if (fail) throw new Error('invalid source fixture');
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/', '/problem', '/problem/', '/start/index.html?preview=1']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200);
      await response.text();
    }
    assert.equal(preparations, 4);
    const asset = await fetch(origin + '/site.js');
    assert.equal(asset.status, 200);
    await asset.text();
    assert.equal(preparations, 4);
    fail = true;
    const failed = await fetch(origin + '/');
    assert.equal(failed.status, 500);
    assert.match(await failed.text(), /Preview build failed: invalid source fixture/);
    fail = false;
    const recovered = await fetch(origin + '/');
    assert.equal(recovered.status, 200);
    await recovered.text();
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('urun serve serves public HTML without needing a TTY', async () => {
  const port = await unusedPort();
  const child = process.platform === 'win32'
    ? spawn(process.execPath, [path.join(root, '../scripts/urun.mjs'), 'web', 'serve', '--port', String(port)], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    })
    : spawn('sh', [path.join(root, '../urun'), 'web', 'serve', '--port', String(port)], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    });
  try {
    const output = await new Promise((resolve, reject) => {
      let stdout = '';
      const timer = setTimeout(() => reject(new Error(`server did not start: ${stdout}`)), 10000);
      child.stdout.on('data', chunk => {
        stdout += chunk;
        if (stdout.includes(`http://localhost:${port}/`)) {
          clearTimeout(timer);
          resolve(stdout);
        }
      });
      child.on('error', reject);
      child.once('exit', code => {
        clearTimeout(timer);
        reject(new Error(`server exited ${code}: ${stdout}`));
      });
    });
    assert.match(output, /Serving public/);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Contract Graph/);
    const nested = await fetch(`http://127.0.0.1:${port}/docs/architecture/`);
    assert.equal(nested.status, 200);
  } finally {
    child.kill('SIGINT');
    await new Promise(resolve => child.once('close', resolve));
  }
});

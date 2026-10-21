/**
 * @file Urun.test for the website target.
 * @see ../.agent/contract.md
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkSiteFiles,
  createStaticServer,
  getMenuItems,
  getMoreItems,
  invokeMenuItem,
  invokeRepoCommand,
  listMenuLines,
  nextSelection,
  parseArgs,
  repositoryRoot,
  resolvePublicFile,
  runMoreMenu,
} from '../scripts/urun.mjs';

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

test('urun arrow navigation wraps and supports Home/End', () => {
  assert.deepEqual([
    nextSelection(0, 4, 'up'),
    nextSelection(3, 4, 'down'),
    nextSelection(2, 4, 'home'),
    nextSelection(2, 4, 'end'),
    nextSelection(1, 4, 'left'),
  ], [3, 0, 0, 3, 1]);
});

test('urun menu lists local website activities', () => {
  const items = getMenuItems();
  const more = getMoreItems();
  assert.equal(items[0].kind, 'clean-build');
  assert.equal(items[1].kind, 'serve');
  assert.ok(items.find(item => item.kind === 'more'));
  assert.equal(items.at(-1).kind, 'exit');
  assert.ok(items.find(item => item.kind === 'serve').detail.includes('4173'));
  for (const kind of ['check', 'schemas', 'live', 'doctor', 'deploy', 'clean']) {
    assert.ok(more.find(item => item.kind === kind), kind);
  }
  assert.equal(more.at(-1).kind, 'back');
  const listed = listMenuLines().join('\n');
  assert.match(listed, /Clean & Build/);
  assert.match(listed, /Run Local Server/);
  assert.match(listed, /Check Site Files/);
});

test('urun parseArgs reads serve, --serve, and --port', () => {
  assert.deepEqual(parseArgs(['--help']), { help: true, serve: false, port: 4173 });
  assert.deepEqual(parseArgs(['serve']), { help: false, serve: true, port: 4173 });
  assert.deepEqual(parseArgs(['serve', '--port', '8000']), { help: false, serve: true, port: 8000 });
  assert.deepEqual(parseArgs(['--serve', '9001']), { help: false, serve: true, port: 9001 });
  assert.deepEqual(parseArgs(['build']), { command: 'build' });
  assert.deepEqual(parseArgs(['check']), { command: 'check' });
  assert.throws(() => parseArgs(['unknown']), /Unknown argument: unknown/);
});

test('urun cancel never deletes files', async () => {
  const hooks = {
    readMenuChoice: async () => -1,
    invokeRepoCommand() { throw new Error('An action ran after cancellation'); },
    startLocalServer() { throw new Error('An action ran after cancellation'); },
  };
  assert.equal(await invokeMenuItem({ kind: 'clean' }, hooks), null);
});

test('urun Clean & Build deletes .wrangler then builds and checks files', async () => {
  const removed = [];
  const checks = [];
  const status = await invokeMenuItem({ kind: 'clean-build' }, {
    exists: () => true,
    remove: target => removed.push(target),
    buildSite: () => checks.push('build'),
    checkSiteFiles: () => {
      checks.push('checked');
      return 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(removed, [path.join(repositoryRoot, '.wrangler')]);
  assert.deepEqual(checks, ['build', 'checked']);
});

test('urun doctor stops at first failure', async () => {
  const calls = [];
  const status = await invokeMenuItem({ kind: 'doctor' }, {
    invokeRepoCommand(command, args) {
      calls.push({ command, args });
      return 17;
    },
  });
  assert.equal(status, 17);
  assert.deepEqual(calls, [{ command: 'node', args: ['--version'] }]);
});

test('urun More runs the selected extra activity', async () => {
  const calls = [];
  const extras = getMoreItems();
  let moreVisits = 0;
  const status = await invokeMenuItem({ kind: 'more' }, {
    readMenuChoice: async title => {
      if (title !== 'More') throw new Error(`unexpected menu ${title}`);
      moreVisits += 1;
      return moreVisits === 1
        ? extras.findIndex(item => item.kind === 'doctor')
        : extras.findIndex(item => item.kind === 'back');
    },
    pauseAfterCommand: async () => 'menu',
    invokeRepoCommand(command, args) {
      calls.push({ command, args });
      return 17;
    },
  });
  assert.equal(status, 17);
  assert.equal(moreVisits, 2);
  assert.deepEqual(calls, [{ command: 'node', args: ['--version'] }]);
});

test('urun More exits after Esc on the post-command prompt', async () => {
  const extras = getMoreItems();
  const outcome = await runMoreMenu({
    readMenuChoice: async () => extras.findIndex(item => item.kind === 'deploy'),
    pauseAfterCommand: async () => 'exit',
  });
  assert.deepEqual(outcome, { status: 0, exit: true });
});

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

test('urun runs at repository root, restores caller directory, and returns native failure', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'urun-caller-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    const status = invokeRepoCommand('node', [
      '-e',
      'if (!require("node:fs").existsSync("wrangler.jsonc")) process.exit(99); process.exit(17)',
    ]);
    assert.equal(status, 17);
    assert.equal(process.cwd(), cwd);
  } finally {
    process.chdir(previous);
  }
});

test('urun noninteractive invocation lists choices and never runs an action', () => {
  const spawned = spawnSync(process.execPath, [path.join(root, 'scripts/urun.mjs')], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(spawned.status, 1);
  assert.match(spawned.stdout, /Clean & Build/);
  assert.match(spawned.stdout, /Run Local Server/);
  assert.match(spawned.stdout, /\n {2}More\n/);
  assert.match(spawned.stdout, /Check Site Files/);
  assert.match(spawned.stdout, /\.\/urun serve \[--port N\]/);
  assert.match(spawned.stderr, /Nothing was executed/);
  assert.match(spawned.stderr, /\.\/urun serve/);
});

test('urun --help lists commands and menu items', () => {
  const spawned = spawnSync(process.execPath, [path.join(root, 'scripts/urun.mjs'), '--help'], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(spawned.status, 0);
  assert.match(spawned.stdout, /Rebuild Public Schemas/);
  assert.match(spawned.stdout, /\.\/urun serve \[--port N\]/);
  assert.equal(spawned.stderr, '');
});

test('urun serve serves public HTML without needing a TTY', async () => {
  const port = await unusedPort();
  const child = process.platform === 'win32'
    ? spawn(process.execPath, [path.join(root, 'scripts/urun.mjs'), 'serve', '--port', String(port)], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    })
    : spawn('sh', [path.join(root, 'urun'), 'serve', '--port', String(port)], {
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

test('urun launchers invoke Node from OS-specific shells', () => {
  const sh = fs.readFileSync(path.join(root, 'urun'), 'utf8');
  const cmd = fs.readFileSync(path.join(root, 'urun.cmd'), 'utf8');
  const preview = fs.readFileSync(path.join(root, 'run-dev.sh'), 'utf8');
  assert.match(sh, /scripts\/urun\.mjs/);
  assert.match(sh, /\bnode\b/);
  assert.doesNotMatch(sh, /pwsh|powershell/i);
  assert.match(cmd, /scripts\\urun\.mjs/);
  assert.match(cmd, /\bnode\b/);
  assert.doesNotMatch(cmd, /pwsh|powershell/i);
  assert.match(preview, /urun" serve --port/);
  assert.doesNotMatch(preview, /python/i);
});

test('posix urun launcher starts the Node menu', { skip: process.platform === 'win32' }, () => {
  const spawned = spawnSync('sh', [path.join(root, 'urun')], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(spawned.status, 1);
  assert.match(spawned.stdout, /Run Local Server/);
  assert.match(spawned.stderr, /Nothing was executed/);
  assert.match(spawned.stderr, /\.\/urun serve/);
});

test('urun repositoryRoot is this checkout', () => {
  assert.equal(fs.realpathSync(repositoryRoot), fs.realpathSync(root));
  assert.ok(fs.existsSync(path.join(repositoryRoot, 'wrangler.jsonc')));
});

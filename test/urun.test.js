import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getMenuItems,
  getMoreItems,
  getPackageVersion,
  invokeMenuItem,
  invokeRepoCommand,
  nextSelection,
  repositoryRoot,
  runMoreMenu,
  testPackageVersion,
} from '../scripts/urun.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('urun arrow navigation wraps and supports Home/End', () => {
  assert.deepEqual([
    nextSelection(0, 9, 'up'),
    nextSelection(8, 9, 'down'),
    nextSelection(4, 9, 'home'),
    nextSelection(4, 9, 'end'),
    nextSelection(3, 9, 'left'),
  ], [8, 0, 0, 8, 3]);
});

test('urun menu uses existing npm activities and current package version', () => {
  const items = getMenuItems();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const tarball = `contract-graph-${pkg.version}.tgz`;
  for (const item of [...items, ...getMoreItems()].filter(item => item.script)) {
    assert.ok(pkg.scripts[item.script]);
  }
  assert.equal(items[0].kind, 'clean-build');
  assert.equal(items[1].kind, 'clean-build-test');
  assert.ok(items.find(item => item.kind === 'more'));
  assert.ok(!items.find(item => item.kind === 'editor' || item.kind === 'help' || item.kind === 'doctor' || item.kind === 'clean'));
  const more = getMoreItems();
  assert.ok(more.find(item => item.script === 'test'));
  assert.ok(more.find(item => item.script === 'build:check'));
  assert.ok(more.find(item => item.kind === 'editor'));
  assert.ok(more.find(item => item.kind === 'help'));
  assert.ok(more.find(item => item.kind === 'doctor'));
  assert.ok(more.find(item => item.kind === 'clean'));
  assert.equal(more.at(-1).kind, 'back');
  assert.ok(items.find(item => item.kind === 'pack').label.includes(pkg.version));
  assert.match(items.find(item => item.kind === 'pack').detail, /update package\.json/);
  assert.ok(items.find(item => item.kind === 'install-tarball').detail.includes(tarball));
  assert.ok(items.find(item => item.kind === 'publish').detail.includes(tarball));
  assert.equal(items.at(-1).kind, 'exit');
});

test('urun cancel never invokes clean, editor, pack, install, publish, or more', async () => {
  const hooks = {
    readMenuChoice: async () => -1,
    readTextInput: async () => null,
    invokeRepoCommand() { throw new Error('An action ran after cancellation'); },
    ensureReleaseTarball() { throw new Error('An action ran after cancellation'); },
  };
  assert.equal(await invokeMenuItem({ kind: 'clean' }, hooks), null);
  assert.equal(await invokeMenuItem({ kind: 'editor' }, hooks), null);
  assert.equal(await invokeMenuItem({ kind: 'pack' }, hooks), null);
  assert.equal(await invokeMenuItem({ kind: 'install-tarball' }, hooks), null);
  assert.equal(await invokeMenuItem({ kind: 'publish' }, hooks), null);
  assert.equal(await invokeMenuItem({ kind: 'more' }, hooks), null);
});

test('urun dispatches menu entries and stops environment checks at first failure', async () => {
  const calls = [];
  const hooks = {
    invokeRepoCommand(command, args) {
      calls.push({ command, args });
      return 17;
    },
  };
  assert.equal(await invokeMenuItem({ script: 'build' }, hooks), 17);
  assert.equal(await invokeMenuItem({ kind: 'doctor' }, hooks), 17);
  assert.deepEqual(calls, [
    { command: 'npm', args: ['run', 'build'] },
    { command: 'node', args: ['--version'] },
  ]);
});

test('urun Clean & Build deletes dist/build then compiles', async () => {
  const removed = [];
  const calls = [];
  const status = await invokeMenuItem({ kind: 'clean-build' }, {
    exists: () => true,
    remove: target => removed.push(target),
    invokeRepoCommand(command, args) {
      calls.push(`${command} ${args.join(' ')}`);
      return 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(removed, [path.join(repositoryRoot, 'dist', 'build')]);
  assert.deepEqual(calls, ['npm run build']);
});

test('urun Clean, Build & Test All stops before tests if the build fails', async () => {
  const calls = [];
  const status = await invokeMenuItem({ kind: 'clean-build-test' }, {
    exists: () => false,
    invokeRepoCommand(command, args) {
      calls.push(`${command} ${args.join(' ')}`);
      return 17;
    },
  });
  assert.equal(status, 17);
  assert.deepEqual(calls, ['npm run build']);
});

test('urun Clean, Build & Test All runs tests after a successful build', async () => {
  const calls = [];
  const status = await invokeMenuItem({ kind: 'clean-build-test' }, {
    exists: () => false,
    invokeRepoCommand(command, args) {
      calls.push(`${command} ${args.join(' ')}`);
      return 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(calls, ['npm run build', 'npm run test']);
});

test('urun More runs the selected extra activity', async () => {
  const calls = [];
  const pauses = [];
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
    pauseAfterCommand: async (code, destination) => {
      pauses.push({ code, destination });
      return 'menu';
    },
    invokeRepoCommand(command, args) {
      calls.push({ command, args });
      return 17;
    },
  });
  assert.equal(status, 17);
  assert.equal(moreVisits, 2);
  assert.deepEqual(calls, [{ command: 'node', args: ['--version'] }]);
  assert.deepEqual(pauses, [{ code: 17, destination: 'More' }]);
});

test('urun More returns to More after a cancelled extra activity', async () => {
  const extras = getMoreItems();
  const titles = [];
  const pauses = [];
  let moreVisits = 0;
  const status = await invokeMenuItem({ kind: 'more' }, {
    readMenuChoice: async title => {
      titles.push(title);
      if (title === 'More') {
        moreVisits += 1;
        return moreVisits === 1
          ? extras.findIndex(item => item.kind === 'clean')
          : extras.findIndex(item => item.kind === 'back');
      }
      return -1;
    },
    pauseAfterCommand: async (code, destination) => {
      pauses.push({ code, destination });
      return 'menu';
    },
    invokeRepoCommand() { throw new Error('An action ran after cancellation'); },
  });
  assert.equal(status, null);
  assert.equal(moreVisits, 2);
  assert.deepEqual(pauses, []);
  assert.deepEqual(titles, ['More', 'Delete Generated Files?', 'More']);
});

test('urun More exits after Esc on the post-command prompt', async () => {
  const extras = getMoreItems();
  const outcome = await runMoreMenu({
    readMenuChoice: async () => extras.findIndex(item => item.kind === 'help'),
    pauseAfterCommand: async () => 'exit',
    invokeRepoCommand() { return 0; },
  });
  assert.deepEqual(outcome, { status: 0, exit: true });
});

test('urun pack keeps the current version, cleans dist/build, and replaces an existing tarball', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urun-pack-'));
  const tarball = path.join(dir, 'contract-graph-0.6.0.tgz');
  const buildDir = path.join(repositoryRoot, 'dist', 'build');
  fs.writeFileSync(tarball, 'stale');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const calls = [];
  const removed = [];
  const status = await invokeMenuItem({ kind: 'pack' }, {
    readTextInput: async () => getPackageVersion(),
    getReleaseTarball: () => tarball,
    exists: target => target === tarball || target === buildDir,
    remove: target => {
      removed.push(target);
      if (target === tarball) fs.rmSync(tarball);
    },
    invokeRepoCommand(command, args) {
      calls.push(`${command} ${args.join(' ')}`);
      return 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(calls, ['npm run pack']);
  assert.deepEqual(removed, [buildDir, tarball]);
  assert.equal(fs.existsSync(tarball), false);
});

test('urun pack updates package.json then builds the tarball', async () => {
  const calls = [];
  const status = await invokeMenuItem({ kind: 'pack' }, {
    getPackageVersion: () => '0.6.0',
    readTextInput: async () => '0.7.0',
    getReleaseTarball: () => path.join(os.tmpdir(), 'urun-missing.tgz'),
    exists: () => false,
    invokeRepoCommand(command, args) {
      calls.push(`${command} ${args.join(' ')}`);
      return 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(calls, [
    'npm version 0.7.0 --no-git-tag-version',
    'npm run pack',
  ]);
});

test('urun pack rejects an invalid version before changing package.json', async () => {
  await assert.rejects(
    invokeMenuItem({ kind: 'pack' }, {
      readTextInput: async () => 'nope',
      invokeRepoCommand() { throw new Error('npm ran after an invalid version'); },
    }),
    /Invalid version 'nope'/,
  );
});

test('urun accepts semver package versions', () => {
  assert.equal(testPackageVersion('0.7.0'), true);
  assert.equal(testPackageVersion('1.0.0-beta.1'), true);
  assert.equal(testPackageVersion('nope'), false);
  assert.equal(testPackageVersion('v0.7.0'), false);
});

test('urun install replaces the global package with the current tarball', async () => {
  const tarball = `dist/tar/contract-graph-${getPackageVersion()}.tgz`;
  const calls = [];
  const status = await invokeMenuItem({ kind: 'install-tarball' }, {
    readMenuChoice: async () => 1,
    ensureReleaseTarball: () => tarball,
    invokeRepoCommand(command, args) {
      calls.push(`${command} ${args.join(' ')}`);
      return 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(calls, [`npm install -g ${path.resolve(repositoryRoot, tarball)}`]);
});

test('urun tarball install replaces a development link with a copy that survives rebuilds', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urun-install-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const build = path.join(dir, 'local build');
  const prefix = path.join(dir, 'global prefix');
  fs.mkdirSync(build);
  fs.writeFileSync(path.join(build, 'package.json'), JSON.stringify({
    name: 'contract-graph', version: '0.0.0', bin: { cg: 'cli.js' },
  }));
  const cli = '#!/usr/bin/env node\nconsole.log("packaged copy");\n';
  fs.writeFileSync(path.join(build, 'cli.js'), cli, { mode: 0o755 });
  const npm = (args, cwd = dir) => {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
      cwd, encoding: 'utf8', timeout: 60000,
      env: { ...process.env, npm_config_prefix: prefix, npm_config_cache: path.join(dir, 'cache'),
        npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' },
    });
    assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
    return result;
  };
  npm(['link', '--ignore-scripts'], build);
  const installed = path.join(prefix, ...(process.platform === 'win32' ? [] : ['lib']), 'node_modules', 'contract-graph');
  assert.equal(fs.realpathSync(installed), fs.realpathSync(build));
  npm(['pack', '--ignore-scripts', '--pack-destination', dir], build);
  const status = await invokeMenuItem({ kind: 'install-tarball' }, {
    readMenuChoice: async () => 1,
    ensureReleaseTarball: () => path.join(dir, 'contract-graph-0.0.0.tgz'),
    invokeRepoCommand(command, args) {
      assert.equal(command, 'npm');
      return npm(args).status;
    },
  });
  assert.equal(status, 0);
  assert.equal(fs.lstatSync(installed).isSymbolicLink(), false);
  fs.writeFileSync(path.join(build, 'cli.js'), 'throw new Error("changed local build");\n');
  assert.equal(fs.readFileSync(path.join(installed, 'cli.js'), 'utf8'), cli);
  fs.rmSync(build, { recursive: true });
  const executable = path.join(prefix, process.platform === 'win32' ? 'cg.cmd' : 'bin/cg');
  const result = spawnSync(executable, [], { encoding: 'utf8', shell: process.platform === 'win32' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'packaged copy');
});

test('urun publish logs in when npm whoami fails, then publishes the tarball', async () => {
  const tarball = `dist/tar/contract-graph-${getPackageVersion()}.tgz`;
  const calls = [];
  const status = await invokeMenuItem({ kind: 'publish' }, {
    readMenuChoice: async () => 1,
    ensureReleaseTarball: () => tarball,
    invokeRepoCommand(command, args) {
      const line = `${command} ${args.join(' ')}`;
      calls.push(line);
      return line === 'npm whoami' ? 1 : 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(calls, [
    'npm whoami',
    'npm login',
    `npm publish ${tarball} --access public`,
  ]);
});

test('urun publish skips login when npm whoami succeeds', async () => {
  const tarball = `dist/tar/contract-graph-${getPackageVersion()}.tgz`;
  const calls = [];
  const status = await invokeMenuItem({ kind: 'publish' }, {
    readMenuChoice: async () => 1,
    ensureReleaseTarball: () => tarball,
    invokeRepoCommand(command, args) {
      calls.push(`${command} ${args.join(' ')}`);
      return 0;
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(calls, [
    'npm whoami',
    `npm publish ${tarball} --access public`,
  ]);
});

test('urun publish stops after a failed npm login', async () => {
  const tarball = `dist/tar/contract-graph-${getPackageVersion()}.tgz`;
  const calls = [];
  const status = await invokeMenuItem({ kind: 'publish' }, {
    readMenuChoice: async () => 1,
    ensureReleaseTarball: () => tarball,
    invokeRepoCommand(command, args) {
      const line = `${command} ${args.join(' ')}`;
      calls.push(line);
      if (line === 'npm whoami') return 1;
      if (line === 'npm login') return 9;
      return 0;
    },
  });
  assert.equal(status, 9);
  assert.deepEqual(calls, ['npm whoami', 'npm login']);
});

test('urun runs at repository root, restores caller directory, and returns native failure', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'urun-caller-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    const status = invokeRepoCommand('node', [
      '-e',
      'if (!require("node:fs").existsSync("bin/cg.js")) process.exit(99); process.exit(17)',
    ]);
    assert.equal(status, 17);
    assert.equal(process.cwd(), cwd);
  } finally {
    process.chdir(previous);
  }
});

test('urun command status is a single exit code when the process writes output', () => {
  const status = invokeRepoCommand('node', ['-e', 'console.log("hello"); console.error("err"); process.exit(5)']);
  assert.equal(status, 5);
});

test('urun noninteractive invocation lists choices and never runs an action', () => {
  const spawned = spawnSync(process.execPath, [path.join(root, 'scripts/urun.mjs')], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(spawned.status, 1);
  assert.match(spawned.stdout, /Clean & Build/);
  assert.match(spawned.stdout, /Clean, Build & Test All/);
  assert.match(spawned.stdout, /\n {2}More\n/);
  assert.match(spawned.stdout, /Run All Tests/);
  assert.match(spawned.stdout, /Check the Existing Build/);
  assert.match(spawned.stdout, /Try Editor Integration/);
  assert.match(spawned.stdout, /Show CLI Commands/);
  assert.match(spawned.stdout, /Check Development Environment/);
  assert.match(spawned.stdout, /Clean Generated Files/);
  assert.match(spawned.stderr, /Nothing was executed/);
});

test('urun --help lists choices and exits successfully', () => {
  const spawned = spawnSync(process.execPath, [path.join(root, 'scripts/urun.mjs'), '--help'], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(spawned.status, 0);
  assert.match(spawned.stdout, /Clean, Build Release Tarball/);
  assert.match(spawned.stdout, /Install Release Tarball to Machine/);
  assert.match(spawned.stdout, /Publish Release Tarball to NPM/);
  assert.equal(spawned.stderr, '');
});

test('urun launchers invoke Node rather than PowerShell', () => {
  const sh = fs.readFileSync(path.join(root, 'urun'), 'utf8');
  const cmd = fs.readFileSync(path.join(root, 'urun.cmd'), 'utf8');
  assert.match(sh, /scripts\/urun\.mjs/);
  assert.match(sh, /\bnode\b/);
  assert.doesNotMatch(sh, /pwsh|powershell/i);
  assert.match(cmd, /scripts\\urun\.mjs/);
  assert.match(cmd, /\bnode\b/);
  assert.doesNotMatch(cmd, /pwsh|powershell/i);
});

test('posix urun launcher starts the Node menu', { skip: process.platform === 'win32' }, () => {
  const spawned = spawnSync('sh', [path.join(root, 'urun')], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(spawned.status, 1);
  assert.match(spawned.stdout, /Run All Tests/);
  assert.match(spawned.stderr, /Nothing was executed/);
});

test('urun repositoryRoot is this checkout', () => {
  assert.equal(fs.realpathSync(repositoryRoot), fs.realpathSync(root));
  assert.ok(fs.existsSync(path.join(repositoryRoot, 'package.json')));
});

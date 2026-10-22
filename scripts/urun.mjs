#!/usr/bin/env node
/**
 * @file Offer the repository maintenance menu for local validation and requested release actions.
 * @see ../src/runtime/distribution/.agent/contract.md
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEV_PORT, LIVE_URL } from '../web/scripts/paths.mjs';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const EDITORS = ['codex', 'claude', 'cursor', 'copilot', 'antigravity', 'all'];
const ESC = '\x1b';

export function getPackageVersion(root = repositoryRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
}

export function getReleaseTarballRelative(root = repositoryRoot) {
  return `dist/tar/contract-graph-${getPackageVersion(root)}.tgz`;
}

export function getReleaseTarball(root = repositoryRoot) {
  return path.join(root, getReleaseTarballRelative(root));
}

export function testPackageVersion(version) {
  return VERSION_PATTERN.test(version);
}

export function getMoreItems() {
  return [
    { label: 'Run All Tests', detail: 'Run the repository test suite with isolated scratch files.', script: 'test' },
    { label: 'Check the Existing Build', detail: 'Check dist/build against source without rebuilding it.', script: 'build:check' },
    { label: 'Try Editor Integration', detail: 'Choose an editor and create its disposable repository under tmp/.', kind: 'editor' },
    { label: 'Show CLI Commands', detail: 'Show the existing cg command-line help.', kind: 'help' },
    { label: 'Check Development Environment', detail: 'Show Node/npm versions and check installed dependencies.', kind: 'doctor' },
    { label: 'Clean Generated Files', detail: 'Delete build/, dist/, tmp/, and compiled/. You will be asked before deletion.', kind: 'clean' },
    { label: 'Back', detail: 'Return to the main menu.', kind: 'back' },
  ];
}

export function getWebsiteItems() {
  return [
    { label: 'Build & Test Website', detail: 'Generate web/public and run the website deployment checks.', kind: 'web-build' },
    { label: 'Run Local Website Server', detail: `Build and preview at http://localhost:${DEV_PORT}. Ctrl+C stops the server.`, kind: 'web-serve' },
    { label: 'Check Website Build', detail: 'Reject stale, missing or extra generated files.', kind: 'web-check' },
    { label: 'Open the Live Website', detail: 'Open contractgraph.dev without publishing.', kind: 'web-live' },
    { label: 'How the Website Deploys', detail: 'Show the merge-to-main publication path.', kind: 'web-deploy' },
    { label: 'Clean Local Cloudflare State', detail: 'Ask before deleting web/.wrangler; preserves source and credentials elsewhere.', kind: 'web-clean' },
    { label: 'Back', detail: 'Return to the main menu.', kind: 'back' },
  ];
}

export function getMenuItems(root = repositoryRoot) {
  const version = getPackageVersion(root);
  const tarball = getReleaseTarballRelative(root);
  return [
    { label: 'Clean & Build', detail: 'Delete dist/build, then compile the distributable package. Leaves dist/tar and tmp in place.', kind: 'clean-build' },
    { label: 'Clean, Build & Test All', detail: 'Delete dist/build, compile the package, then run the full test suite. Stops if the build fails.', kind: 'clean-build-test' },
    { label: `Clean, Build Release Tarball (${version})`, detail: 'Ask for a version, update package.json when it changes, delete dist/build, then replace dist/tar/contract-graph-<version>.tgz.', kind: 'pack' },
    { label: 'Install Release Tarball to Machine', detail: `Install an independent copy of ${tarball} on this machine's PATH, replacing any development link. Builds the tarball first if it is missing.`, kind: 'install-tarball' },
    { label: 'Publish Release Tarball to NPM', detail: `Log in to npm if needed, then publish ${tarball} as a public package. Builds the tarball first if it is missing.`, kind: 'publish' },
    { label: 'Website', detail: 'Build, test, preview and check contractgraph.dev.', kind: 'website' },
    { label: 'More', detail: 'Build check, editor fixtures, CLI help, environment checks, and cleaning generated files.', kind: 'more' },
    { label: 'Exit', detail: 'Return to your terminal.', kind: 'exit' },
  ];
}

export function listMenuLines(root = repositoryRoot) {
  const lines = [];
  for (const item of getMenuItems(root)) {
    lines.push(item.label);
    if (item.kind === 'more' || item.kind === 'website') {
      for (const child of item.kind === 'website' ? getWebsiteItems() : getMoreItems()) {
        if (child.kind === 'back') continue;
        lines.push(`  ${child.label}`);
      }
    }
  }
  return lines;
}

export function nextSelection(index, count, key) {
  switch (key) {
    case 'up': return (index + count - 1) % count;
    case 'down': return (index + 1) % count;
    case 'home': return 0;
    case 'end': return count - 1;
    default: return index;
  }
}

export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function resolveCommand(command) {
  return command === 'npm' && process.platform === 'win32' ? 'npm.cmd' : command;
}

export function invokeRepoCommand(command, args, root = repositoryRoot) {
  const executable = resolveCommand(command);
  process.stdout.write(`\n\x1b[36m> ${command} ${args.join(' ')}\x1b[0m\n\n`);
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error(`Missing ${executable}. Install this repository's Node.js prerequisites and run npm ci.`);
    }
    throw result.error;
  }
  return result.status ?? 1;
}

export function ensureReleaseTarball(run = invokeRepoCommand, root = repositoryRoot) {
  const relative = getReleaseTarballRelative(root);
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    const status = run('npm', ['run', 'pack']);
    if (status !== 0) throw new Error(`Could not build ${relative} (exit ${status}).`);
    if (!fs.existsSync(full)) throw new Error(`npm run pack did not create ${relative}.`);
  }
  return relative;
}

function parseKey(buffer) {
  if (!buffer.length) return 'other';
  if (buffer[0] === 3) return 'ctrl-c';
  if (buffer[0] === 13 || buffer[0] === 10) return 'enter';
  if (buffer[0] === 127 || buffer[0] === 8) return 'backspace';
  if (buffer[0] !== 27) return buffer.length === 1 ? buffer.toString() : 'other';
  if (buffer.length === 1) return 'escape';
  const seq = buffer.toString();
  if (seq === '\x1b[A' || seq === '\x1bOA') return 'up';
  if (seq === '\x1b[B' || seq === '\x1bOB') return 'down';
  if (seq === '\x1b[H' || seq === '\x1b[1~' || seq === '\x1bOH') return 'home';
  if (seq === '\x1b[F' || seq === '\x1b[4~' || seq === '\x1bOF') return 'end';
  return 'escape';
}

function readKey() {
  return new Promise(resolve => {
    const onData = chunk => {
      process.stdin.removeListener('data', onData);
      resolve(parseKey(Buffer.from(chunk)));
    };
    process.stdin.once('data', onData);
  });
}

async function withRawInput(fn) {
  if (!isInteractive()) {
    throw new Error('The arrow-key menu needs an interactive terminal. Run ./urun (macOS) or urun.cmd (Windows) in your terminal.');
  }
  const previousRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  try {
    return await fn();
  } finally {
    process.stdin.setRawMode(Boolean(previousRaw));
    process.stdin.pause();
  }
}

export async function readMenuChoice(title, items) {
  return withRawInput(async () => {
    process.stdout.write(`${ESC}[?1049h${ESC}[?25l`);
    let selected = 0;
    try {
      while (true) {
        const width = Math.max(20, (process.stdout.columns || 80) - 4);
        process.stdout.write(`${ESC}[H${ESC}[2J\n  ${ESC}[1;36m${title}${ESC}[0m\n\n`);
        for (let i = 0; i < items.length; i++) {
          let label = String(items[i].label);
          if (label.length > width) label = `${label.slice(0, width - 3)}...`;
          process.stdout.write(i === selected ? `  ${ESC}[7m > ${label} ${ESC}[0m\n` : `     ${label}\n`);
        }
        process.stdout.write(`\n  ${items[selected].detail}\n\n  Up/Down: choose    Enter: run    Esc: back/exit\n`);
        const key = await readKey();
        if (key === 'escape' || key === 'ctrl-c') return -1;
        if (key === 'enter') return selected;
        selected = nextSelection(selected, items.length, key);
      }
    } finally {
      process.stdout.write(`${ESC}[0m${ESC}[?25h${ESC}[?1049l`);
    }
  });
}

export async function readTextInput(prompt, fallback) {
  return withRawInput(async () => {
    process.stdout.write(`${prompt} [${fallback}]: `);
    let buffer = '';
    while (true) {
      const key = await readKey();
      if (key === 'escape' || key === 'ctrl-c') {
        process.stdout.write('\n');
        return null;
      }
      if (key === 'enter') {
        process.stdout.write('\n');
        const text = buffer.trim();
        return text.length ? text : fallback;
      }
      if (key === 'backspace') {
        if (buffer.length) {
          buffer = buffer.slice(0, -1);
          process.stdout.write('\b \b');
        }
        continue;
      }
      if (key.length === 1 && key >= ' ') {
        buffer += key;
        process.stdout.write(key);
      }
    }
  });
}

export async function invokeMenuItem(item, hooks = {}) {
  const run = hooks.invokeRepoCommand ?? invokeRepoCommand;
  const choose = hooks.readMenuChoice ?? readMenuChoice;
  const ask = hooks.readTextInput ?? readTextInput;
  const versionOf = hooks.getPackageVersion ?? getPackageVersion;
  const tarballPathOf = hooks.getReleaseTarball ?? getReleaseTarball;
  const tarballRelativeOf = hooks.getReleaseTarballRelative ?? getReleaseTarballRelative;
  const ensure = hooks.ensureReleaseTarball ?? (() => ensureReleaseTarball(run));
  const exists = hooks.exists ?? (target => fs.existsSync(target));
  const remove = hooks.remove ?? (target => fs.rmSync(target, { recursive: true, force: true }));
  const wipePackageBuild = () => {
    const buildDir = path.join(repositoryRoot, 'dist', 'build');
    if (exists(buildDir)) remove(buildDir);
  };

  if (item.script) return run('npm', ['run', item.script]);
  switch (item.kind) {
    case 'website': {
      const outcome = await runWebsiteMenu(hooks);
      return outcome.status;
    }
    case 'web-build':
      return run(process.execPath, ['web/scripts/build-site.mjs']);
    case 'web-check':
      return run(process.execPath, ['web/site/publication.mjs', '--check']);
    case 'web-serve': {
      const start = hooks.startLocalServer ?? (await import('../web/scripts/preview/server.mjs')).startLocalServer;
      return start({ open: isInteractive() });
    }
    case 'web-live': {
      const open = hooks.openUrl ?? (await import('../web/scripts/preview/server.mjs')).openUrl;
      open(LIVE_URL);
      return 0;
    }
    case 'web-deploy':
      process.stdout.write('Successful current main pushes publish through GitHub Actions after Linux, Windows and security checks. Pull requests only validate. See web/DEPLOY.md. npm publication remains separate.\n');
      return 0;
    case 'web-clean': {
      const choice = await choose('Delete Local Cloudflare State?', [
        { label: 'Keep Files and Go Back', detail: 'Nothing will be deleted.' },
        { label: 'Delete web/.wrangler', detail: 'Deletes this website target’s local Cloudflare state only.' },
      ]);
      if (choice !== 1) return null;
      const target = path.join(repositoryRoot, 'web', '.wrangler');
      if (exists(target)) remove(target);
      return 0;
    }
    case 'clean-build': {
      wipePackageBuild();
      return run('npm', ['run', 'build']);
    }
    case 'clean-build-test': {
      const status = await invokeMenuItem({ kind: 'clean-build' }, hooks);
      if (status !== 0) return status;
      return run('npm', ['run', 'test']);
    }
    case 'help':
      return run('node', ['bin/cg.js', '--help']);
    case 'doctor':
      for (const command of [
        { name: 'node', args: ['--version'] },
        { name: 'npm', args: ['--version'] },
        { name: 'npm', args: ['ls', '--depth=0'] },
      ]) {
        const status = run(command.name, command.args);
        if (status !== 0) return status;
      }
      return 0;
    case 'editor': {
      const choices = EDITORS.map(name => ({
        label: name === 'all' ? 'All' : name.charAt(0).toUpperCase() + name.slice(1),
        detail: `Recreates tmp/${name} with this editor's integration. Existing contents there will be replaced.`,
      })).concat({ label: 'Back', detail: 'Return without creating a fixture.' });
      const choice = await choose('Try Editor Integration', choices);
      if (choice < 0 || choice === EDITORS.length) return null;
      const editor = EDITORS[choice];
      const target = path.join(repositoryRoot, 'tmp', editor);
      if (exists(target)) {
        const confirm = await choose(`Replace tmp/${editor}?`, [
          { label: 'Keep Existing Files', detail: 'Return to the menu.' },
          { label: 'Replace This Disposable Fixture', detail: `Deletes and recreates tmp/${editor} only.` },
        ]);
        if (confirm !== 1) return null;
      }
      return run('npm', ['run', 'try', '--', editor]);
    }
    case 'clean': {
      const choice = await choose('Delete Generated Files?', [
        { label: 'Keep Files and Go Back', detail: 'Nothing will be deleted.' },
        { label: 'Delete Build, Dist, Tmp, and Compiled', detail: 'Includes disposable editor fixtures and local scratch files.' },
      ]);
      if (choice !== 1) return null;
      return run('npm', ['run', 'clean']);
    }
    case 'pack': {
      const current = versionOf();
      process.stdout.write(`Current package.json version: ${current}\n`);
      const version = await ask('Release Version', current);
      if (version == null) return null;
      if (!testPackageVersion(version)) {
        throw new Error(`Invalid version '${version}'. Use a semver value such as 0.7.0.`);
      }
      if (version !== current) {
        const status = run('npm', ['version', version, '--no-git-tag-version']);
        if (status !== 0) return status;
      }
      wipePackageBuild();
      const tarball = tarballPathOf();
      if (exists(tarball)) remove(tarball);
      return run('npm', ['run', 'pack']);
    }
    case 'install-tarball': {
      const tarball = tarballRelativeOf();
      const choice = await choose('Install Release Tarball to Machine?', [
        { label: 'Keep the Installed Command', detail: 'Return to the menu.' },
        { label: `Install cg from ${tarball}`, detail: 'Installs a packaged copy; later local builds cannot change it. Builds the tarball first if it is missing.' },
      ]);
      if (choice !== 1) return null;
      // Install the archive itself, never dist/build (npm can link directories).
      return run('npm', ['install', '-g', path.resolve(repositoryRoot, ensure())]);
    }
    case 'publish': {
      const shown = tarballRelativeOf();
      const choice = await choose(`Publish Release Tarball to NPM?`, [
        { label: 'Cancel', detail: 'Do not log in or publish.' },
        { label: `Log In If Needed, Then Publish ${shown}`, detail: 'Public npm publish of the current tarball. Builds it first if it is missing.' },
      ]);
      if (choice !== 1) return null;
      const tarball = ensure();
      const whoami = run('npm', ['whoami']);
      if (whoami !== 0) {
        process.stdout.write('\x1b[33mNot logged in to npm. Starting login...\x1b[0m\n');
        const login = run('npm', ['login']);
        if (login !== 0) return login;
      }
      return run('npm', ['publish', tarball, '--access', 'public']);
    }
    case 'more': {
      const outcome = await runMoreMenu(hooks);
      if (outcome.exit) return outcome.status ?? 0;
      return outcome.status;
    }
    default:
      throw new Error('Unknown menu activity.');
  }
}

export async function pauseAfterCommand(status, destination = 'the menu') {
  process.stdout.write(status === 0 ? '\n\x1b[32mDone.\x1b[0m\n' : `\n\x1b[31mCommand failed (exit ${status}).\x1b[0m\n`);
  process.stdout.write(`Press Enter to return to ${destination}, or Esc to exit.\n`);
  return withRawInput(async () => {
    while (true) {
      const key = await readKey();
      if (key === 'escape' || key === 'ctrl-c') return 'exit';
      if (key === 'enter') return 'menu';
    }
  });
}

async function runSubmenu(title, items, hooks = {}) {
  const choose = hooks.readMenuChoice ?? readMenuChoice;
  const pause = hooks.pauseAfterCommand ?? pauseAfterCommand;
  let lastStatus = null;
  while (true) {
    const extras = items;
    const choice = await choose(title, extras);
    if (choice < 0 || extras[choice].kind === 'back') return { status: lastStatus, exit: false };
    try {
      const result = await invokeMenuItem(extras[choice], hooks);
      if (result == null) continue;
      lastStatus = result;
    } catch (error) {
      process.stdout.write(`\x1b[31m${error.message}\x1b[0m\n`);
      lastStatus = 1;
    }
    const resume = await pause(lastStatus, title);
    if (resume === 'exit') return { status: lastStatus, exit: true };
  }
}

export function runMoreMenu(hooks = {}) {
  return runSubmenu('More', getMoreItems(), hooks);
}

export function runWebsiteMenu(hooks = {}) {
  return runSubmenu('Website', getWebsiteItems(), hooks);
}

export function parseArgs(argv) {
  if (argv.length === 0) return { command: 'menu' };
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { command: 'help' };
  if (argv[0] !== 'web') throw new Error('Usage: ./urun [web build|check|serve [--port N]] [--help]');
  if (argv.length === 1) return { command: 'website' };
  if (argv.length === 2 && ['build', 'check'].includes(argv[1])) return { command: argv[1] };
  if (argv[1] === 'serve' && (argv.length === 2 || argv.length === 4 && argv[2] === '--port')) {
    const portText = argv[3] ?? process.env.PORT ?? String(DEV_PORT);
    const port = Number(portText);
    if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('port must be a number between 1 and 65535.');
    return { command: 'serve', port };
  }
  throw new Error('Usage: ./urun web build|check|serve [--port N]');
}

export async function startRepositoryMenu(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.command === 'build' || options.command === 'check') return invokeMenuItem({ kind: `web-${options.command}` });
  if (options.command === 'serve') {
    const { startLocalServer } = await import('../web/scripts/preview/server.mjs');
    return startLocalServer({ port: options.port, open: isInteractive() });
  }
  const help = options.command === 'help';
  if (options.command === 'website' && isInteractive()) return (await runWebsiteMenu()).status ?? 0;
  if (help || !isInteractive()) {
    process.stdout.write('Contract Graph Dev Kit - repository menu\n\nUsage: ./urun [web build|check|serve [--port N]] [--help]\n');
    for (const line of listMenuLines()) process.stdout.write(`  ${line}\n`);
    if (help) return 0;
    process.stderr.write('Open an interactive terminal and run ./urun or urun.cmd to select with arrow keys. Nothing was executed.\n');
    return 1;
  }
  let lastStatus = 0;
  while (true) {
    const menu = getMenuItems();
    const choice = await readMenuChoice('Contract Graph Dev Kit', menu);
    if (choice < 0 || menu[choice].kind === 'exit') return lastStatus;
    if (menu[choice].kind === 'more' || menu[choice].kind === 'website') {
      const outcome = await (menu[choice].kind === 'website' ? runWebsiteMenu() : runMoreMenu());
      if (outcome.exit) return outcome.status ?? lastStatus;
      if (outcome.status != null) lastStatus = outcome.status;
      continue;
    }
    try {
      const result = await invokeMenuItem(menu[choice]);
      if (result == null) continue;
      lastStatus = result;
    } catch (error) {
      process.stdout.write(`\x1b[31m${error.message}\x1b[0m\n`);
      lastStatus = 1;
    }
    const resume = await pauseAfterCommand(lastStatus);
    if (resume === 'exit') return lastStatus;
  }
}

function isMain() {
  const entry = process.argv[1];
  return Boolean(entry) && pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (isMain()) {
  startRepositoryMenu().then(code => process.exit(code), error => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
